const crypto = require("crypto");
const mongoose = require("mongoose");
const InstitutionBooking = require("../Model/InstitutionEventBookingModel");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const SportsComplex = require("../Model/SportsComplexModel");
const Guest = require("../Model/GuestModel");
const { createOrder, fetchPayment, verifyPaymentSignature, checkoutKeyId } = require("../Services/razorpayService");

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function dateOnly(date) { return date.toISOString().slice(0, 10); }
function indiaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function bookingWindow() {
  const start = indiaDate();
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 2);
  return { start, end: dateOnly(end) };
}
function slotRunsOn(slot, date) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${date}T00:00:00Z`).getUTCDay()];
  return !slot.days?.length || slot.days.includes(day);
}
function isExclusive(config, slot) { return slot?.purpose !== "coaching" && config.bookingPolicy?.inventoryMode === "exclusive-unit"; }
function estimatedPrice(config, slot, participantCount, requestedUnits) {
  const base = Number(config.price?.amount) || 0;
  const perMember = Number(config.price?.perMemberAmount) || 0;
  const billableUnits = isExclusive(config, slot) ? requestedUnits : 1;
  if (config.price?.calculation === "per-member") return (perMember || base) * participantCount;
  if (config.price?.calculation === "base-plus-member") return (base * billableUnits) + (perMember * participantCount);
  return base * billableUnits;
}

const populate = (query) => query
  .populate("institution", "Name Email ContactNum institution")
  .populate("facility", "name location")
  .populate("selections.sport", "SportName")
  .populate("selections.facilitySportConfig", "bookingMode unitLabel unitCount capacityPerUnit bookingPolicy slots price sport")
  .populate("reviewedBy", "Name");

function publicEvent(row) {
  const item = row.toObject ? row.toObject() : row;
  return {
    ...item,
    id: String(item._id),
    facilityName: item.facility?.name || "Facility",
    institutionName: item.institution?.institution?.name || item.institution?.Name || "Educational institution",
    contactPerson: item.institution?.Name || "",
    contactEmail: item.institution?.Email || "",
    contactPhone: item.institution?.ContactNum || "",
    participantCount: (item.selections || []).reduce((sum, selection) => sum + (Number(selection.participantCount) || 0), 0),
    selections: (item.selections || []).map((selection) => {
      const config = selection.facilitySportConfig;
      const slot = config?.slots?.find?.((value) => String(value._id) === String(selection.slotId));
      return {
        ...selection,
        id: String(selection._id),
        configId: String(config?._id || selection.facilitySportConfig),
        sportName: selection.sport?.SportName || "Sport",
        unitLabel: isExclusive(config, slot) ? `${config?.unitLabel || "units"} · ${selection.participantCount} participants` : "participant places",
        baseUnitLabel: isExclusive(config, slot) ? config?.unitLabel || "units" : "participant places",
        inventoryMode: isExclusive(config, slot) ? "exclusive-unit" : "shared-capacity",
        slot: slot ? { id: slot._id, label: slot.label, startTime: slot.startTime, endTime: slot.endTime, capacity: slot.capacity } : null,
      };
    }),
  };
}

async function configsForSelections(input) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw Object.assign(new Error("Select between 1 and 100 sport slots"), { status: 400 });
  const ids = [...new Set(input.map((item) => String(item.configId || item.facilitySportConfig || "")))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) throw Object.assign(new Error("A selected sport is invalid"), { status: 400 });
  const configs = await FacilitySportConfig.find({ _id: { $in: ids }, status: "Active" }).populate("sport", "SportName");
  if (configs.length !== ids.length) throw Object.assign(new Error("A selected sport is no longer active"), { status: 409 });
  return new Map(configs.map((config) => [String(config._id), config]));
}

async function normalizeSelections(input, expectedFacility) {
  const configs = await configsForSelections(input);
  const window = bookingWindow();
  const seen = new Set();
  const normalized = [];
  for (const item of input) {
    const config = configs.get(String(item.configId || item.facilitySportConfig));
    if (expectedFacility && String(config.facility) !== String(expectedFacility)) throw Object.assign(new Error("All selections must belong to the chosen facility"), { status: 400 });
    const slot = config.slots.id(item.slotId);
    const date = String(item.date || "");
    if (!slot || !slot.bookable) throw Object.assign(new Error("A selected slot is no longer bookable"), { status: 409 });
    if (!datePattern.test(date) || date < window.start || date > window.end || !slotRunsOn(slot, date)) throw Object.assign(new Error(`The selected slot is not available on ${date || "that date"}`), { status: 400 });
    const key = `${config._id}:${slot._id}:${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const participantCount = Math.floor(Number(item.participantCount));
    if (!Number.isFinite(participantCount) || participantCount < 1) throw Object.assign(new Error(`Enter participants for ${config.sport?.SportName} on ${date}`), { status: 400 });
    const requestedUnits = isExclusive(config, slot) ? Math.floor(Number(item.requestedUnits) || 1) : participantCount;
    if (!isExclusive(config, slot) && participantCount > Number(slot.capacity)) throw Object.assign(new Error(`Participant count exceeds ${config.sport?.SportName} slot capacity on ${date}`), { status: 400 });
    if (requestedUnits < 1 || (isExclusive(config, slot) && requestedUnits > Number(config.unitCount))) throw Object.assign(new Error(`Invalid ${config.unitLabel || "unit"} count for ${config.sport?.SportName}`), { status: 400 });
    normalized.push({
      facilitySportConfig: config._id, sport: config.sport._id, slotId: slot._id, date, participantCount,
      requestedUnits, reservedUnits: requestedUnits,
      estimatedAmount: estimatedPrice(config, slot, participantCount, requestedUnits),
      _config: config, _slot: slot,
    });
  }
  return normalized;
}

async function inventoryError(selection, excludeEvent = null) {
  const { _config: config, _slot: slot, date, reservedUnits } = selection;
  const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000);
  const [citizens, events] = await Promise.all([
    Guest.find({ facilitySportConfig: config._id, slotId: slot._id, Startdate: date, $or: [{ bookingStatus: "Confirmed" }, { bookingStatus: "Pending Payment", createdAt: { $gte: pendingCutoff } }] }).select("memberCount reservedUnits").lean(),
    InstitutionBooking.find({ _id: { $ne: excludeEvent || null }, status: "Confirmed", selections: { $elemMatch: { facilitySportConfig: config._id, slotId: slot._id, date } } }).select("selections").lean(),
  ]);
  const matching = events.flatMap((event) => event.selections || []).filter((item) => String(item.facilitySportConfig) === String(config._id) && String(item.slotId) === String(slot._id) && item.date === date);
  const used = isExclusive(config, slot)
    ? citizens.reduce((sum, item) => sum + (Number(item.reservedUnits) || 1), 0) + matching.reduce((sum, item) => sum + (Number(item.reservedUnits) || 1), 0)
    : citizens.reduce((sum, item) => sum + (Number(item.memberCount) || 1), 0) + matching.reduce((sum, item) => sum + (Number(item.reservedUnits) || 1), 0);
  const capacity = isExclusive(config, slot) ? Number(config.unitCount) : Number(slot.capacity);
  return used + Number(reservedUnits) > capacity ? `Not enough ${isExclusive(config, slot) ? config.unitLabel || "units" : "participant capacity"} for ${config.sport?.SportName} on ${date}` : "";
}

async function validateInventory(selections, excludeEvent) {
  for (const selection of selections) {
    const error = await inventoryError(selection, excludeEvent);
    if (error) return error;
  }
  return "";
}
function storedSelections(normalized) { return normalized.map(({ _config, _slot, ...selection }) => selection); }

async function create(req, res) {
  try {
    const body = req.body || {};
    if (!mongoose.isValidObjectId(body.facilityId)) return fail(res, 400, "Select a valid facility");
    const facility = await SportsComplex.findOne({ _id: body.facilityId, status: { $ne: "Inactive" } }).select("_id");
    if (!facility) return fail(res, 409, "This facility is not accepting booking requests");
    const eventName = String(body.eventName || "").trim();
    const purpose = String(body.purpose || "").trim();
    if (!eventName || !purpose) return fail(res, 400, "Event name and purpose are required");
    const normalized = await normalizeSelections(body.selections, facility._id);
    const unavailable = await validateInventory(normalized);
    if (unavailable) return fail(res, 409, unavailable);
    const dates = normalized.map((item) => item.date).sort();
    const estimatedAmount = normalized.reduce((sum, item) => sum + item.estimatedAmount, 0);
    const reference = `INST-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const created = await InstitutionBooking.create({
      bookingReference: reference, institution: req.user._id, facility: facility._id,
      eventName, eventType: body.eventType, purpose, requirements: String(body.requirements || "").trim(),
      selections: storedSelections(normalized), startDate: dates[0], endDate: dates.at(-1), estimatedAmount,
    });
    return res.status(201).json({ data: publicEvent(await populate(InstitutionBooking.findById(created._id))), msg: "Event request submitted", rcode: 200 });
  } catch (error) {
    console.error("Institution request failed:", error.message);
    return fail(res, error.status || 500, error.status ? error.message : "Could not submit the event request");
  }
}

async function own(req, res) { const rows = await populate(InstitutionBooking.find({ institution: req.user._id }).sort({ createdAt: -1 })); return res.json({ data: rows.map(publicEvent), rcode: 200 }); }
async function managerList(req, res) { const rows = await populate(InstitutionBooking.find({ facility: req.user.SportComplexId }).sort({ createdAt: -1 })); return res.json({ data: rows.map(publicEvent), rcode: 200 }); }
async function adminList(req, res) { const rows = await populate(InstitutionBooking.find({}).sort({ createdAt: -1 })); return res.json({ data: rows.map(publicEvent), rcode: 200 }); }

async function normalizedForEvent(event) {
  return normalizeSelections(event.selections.map((item) => ({ configId: item.facilitySportConfig, slotId: item.slotId, date: item.date, participantCount: item.participantCount, requestedUnits: item.requestedUnits })), event.facility);
}

async function review(req, res) {
  try {
    const event = await InstitutionBooking.findById(req.params.id);
    if (!event) return fail(res, 404, "Event request not found");
    if (String(event.facility) !== String(req.user.SportComplexId)) return fail(res, 403, "This request belongs to another facility");
    if (event.status !== "Submitted") return fail(res, 409, "This request has already been reviewed");
    const decision = String(req.body.decision || "");
    const note = String(req.body.note || "").trim();
    if (decision === "Rejected") {
      if (!note) return fail(res, 400, "Add a reason for rejecting the request");
      event.status = "Rejected"; event.managerNote = note; event.reviewedBy = req.user._id; event.reviewedAt = new Date(); await event.save();
      return res.json({ data: publicEvent(await populate(InstitutionBooking.findById(event._id))), msg: "Request rejected", rcode: 200 });
    }
    if (decision !== "Approved") return fail(res, 400, "Choose Approve or Reject");
    const amount = Number(req.body.quotedAmount);
    if (!Number.isFinite(amount) || amount < 1) return fail(res, 400, "Enter a payable quotation amount");
    const normalized = await normalizedForEvent(event);
    const unavailable = await validateInventory(normalized, event._id);
    if (unavailable) return fail(res, 409, unavailable);
    event.selections.forEach((item, index) => { item.reservedUnits = normalized[index].reservedUnits; });
    event.status = "Approved"; event.quotedAmount = amount; event.paymentStatus = "Pending"; event.managerNote = note; event.reviewedBy = req.user._id; event.reviewedAt = new Date(); await event.save();
    return res.json({ data: publicEvent(await populate(InstitutionBooking.findById(event._id))), msg: "Request approved and sent for payment", rcode: 200 });
  } catch (error) { console.error("Institution review failed:", error.message); return fail(res, error.status || 500, error.status ? error.message : "Could not review the event request"); }
}

async function paymentOrder(req, res) {
  try {
    const event = await InstitutionBooking.findOne({ _id: req.params.id, institution: req.user._id });
    if (!event) return fail(res, 404, "Event request not found");
    if (event.status !== "Approved" || event.paymentStatus === "Paid") return fail(res, 409, "This request is not awaiting payment");
    const order = await createOrder({ amount: event.quotedAmount, receipt: event.bookingReference, notes: { booking_reference: event.bookingReference, booking_type: "institution_event", facility_id: String(event.facility) } });
    event.razorpayOrderId = order.id; await event.save();
    return res.json({ data: { keyId: checkoutKeyId(), orderId: order.id, amount: order.amount, currency: order.currency, description: `${event.eventName} - institutional event booking`, prefill: { name: req.user.Name, email: req.user.Email, contact: req.user.ContactNum } }, rcode: 200 });
  } catch (error) { console.error("Institution payment order failed:", error.message); return fail(res, 500, "Could not start payment"); }
}

async function verifyPayment(req, res) {
  try {
    const event = await InstitutionBooking.findOne({ _id: req.params.id, institution: req.user._id });
    if (!event) return fail(res, 404, "Event request not found");
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!orderId || orderId !== event.razorpayOrderId || !paymentId || !verifyPaymentSignature({ orderId, paymentId, signature })) { event.paymentStatus = "Failed"; await event.save(); return fail(res, 400, "Payment verification failed"); }
    if (event.status !== "Approved") return fail(res, 409, "This request is no longer awaiting payment");
    const normalized = await normalizedForEvent(event);
    const unavailable = await validateInventory(normalized, event._id);
    if (unavailable) return fail(res, 409, `${unavailable}. Contact the facility before retrying payment.`);
    const payment = await fetchPayment(paymentId);
    if (!["captured", "authorized"].includes(payment.status) || Number(payment.amount) !== Math.round(Number(event.quotedAmount) * 100)) { event.paymentStatus = "Failed"; await event.save(); return fail(res, 400, "Payment amount or gateway status could not be verified"); }
    event.razorpayPaymentId = paymentId; event.paymentStatus = "Paid"; event.status = "Confirmed"; event.paidAt = new Date(); event.confirmedAt = new Date(); await event.save();
    return res.json({ data: publicEvent(await populate(InstitutionBooking.findById(event._id))), msg: "Event booking confirmed", rcode: 200 });
  } catch (error) { console.error("Institution payment verification failed:", error.message); return fail(res, error.status || 500, error.status ? error.message : "Could not verify payment"); }
}

module.exports = { create, own, managerList, adminList, review, paymentOrder, verifyPayment };
