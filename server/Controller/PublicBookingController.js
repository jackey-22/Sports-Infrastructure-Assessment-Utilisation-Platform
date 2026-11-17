const crypto = require("crypto");
const { exploreFacilities } = require("../Utils/facilityExplore");
const mongoose = require("mongoose");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const SportsComplex = require("../Model/SportsComplexModel");
const Guest = require("../Model/GuestModel");
const BookingPayment = require("../Model/BookingPaymentModel");
const {
  checkoutKeyId,
  createOrder,
  fetchPayment,
  verifyPaymentSignature,
} = require("../Services/razorpayService");

const fail = (res, status, message) =>
  res.status(status).json({ data: "", msg: message, rcode: -9 });

function effectivePolicy(config, slot) {
  if (slot && slot.purpose === "coaching") {
    return {
      reservationType: "individual",
      inventoryMode: "shared-capacity",
      minMembers: 1,
      maxMembers: 1,
    };
  }
  return config.bookingPolicy || {
    reservationType: "individual",
    inventoryMode: "shared-capacity",
    minMembers: 1,
    maxMembers: 1,
  };
}

function publicConfig(config) {
  const value = config.toObject ? config.toObject() : config;
  return {
    id: String(value._id),
    facility: value.facility,
    sport: value.sport,
    bookingMode: value.bookingMode,
    unitLabel: value.unitLabel,
    unitCount: value.unitCount,
    capacityPerUnit: value.capacityPerUnit,
    price: value.price,
    bookingPolicy: value.bookingPolicy,
    slots: (value.slots || [])
      .filter((slot) => slot.bookable)
      .map((slot) => ({
        ...(slot.toObject ? slot.toObject() : slot),
        bookingPolicy: effectivePolicy(value, slot),
      })),
    notes: value.notes,
  };
}

async function listConfigs(req, res) {
  try {
    const facilityName = String(req.query.facilityName || "").trim();
    const facilityId = String(req.query.facilityId || "").trim();
    const facility = mongoose.Types.ObjectId.isValid(facilityId)
      ? await SportsComplex.findById(facilityId)
      : await SportsComplex.findOne({ name: facilityName });
    if (!facility) return fail(res, 404, "Facility booking configuration not found");

    const configs = await FacilitySportConfig.find({
      facility: facility._id,
      status: "Active",
    })
      .populate("sport", "SportName Category baseUrl")
      .populate({
        path: "slots.coach",
        select: "userId qualification",
        populate: { path: "userId", select: "Name" },
      })
      .sort({ createdAt: 1 });

    return res.json({
      data: {
        facility: { id: facility._id, name: facility.name },
        configs: configs.map(publicConfig),
      },
      rcode: 200,
    });
  } catch (error) {
    return fail(res, 500, "Could not load booking configuration");
  }
}

async function listFacilities(req, res) {
  try {
    const facilities = await SportsComplex.find({ status: { $ne: "Inactive" } })
      .populate("district", "District")
      .populate("manager", "Name Email ContactNum")
      .populate("sports.sport", "SportName Category baseUrl description defaultBookingMode unitLabel status")
      .sort({ name: 1 })
      .lean();
    const facilityIds = facilities.map((facility) => facility._id);
    const configs = await FacilitySportConfig.find({
      facility: { $in: facilityIds },
      status: "Active",
    })
      .populate("sport", "SportName Category baseUrl description status")
      .lean();
    const configsByFacility = new Map();
    configs.forEach((config) => {
      const key = String(config.facility);
      if (!configsByFacility.has(key)) configsByFacility.set(key, []);
      configsByFacility.get(key).push(config);
    });

    const data = facilities.map((facility) => {
      const configured = configsByFacility.get(String(facility._id)) || [];
      const sports = configured.length
        ? configured.filter(config => config.sport && config.sport.status !== "Inactive").map((config) => ({
            id: config.sport?._id,
            bookable: config.slots?.some(slot => slot.bookable) || false,
            name: config.sport?.SportName || "Sport",
            category: config.sport?.Category || "Sport",
            image: config.sport?.baseUrl || "",
            description: config.sport?.description || "",
            type: config.bookingMode,
            unitLabel: config.unitLabel,
            units: config.unitCount,
            capacity: config.unitCount * config.capacityPerUnit,
            availability: config.status,
            feePerHour: `₹${config.price?.amount || 0}/${config.price?.unit || "slot"}`,
            price: config.price,
            surface: config.notes || "Details available at facility",
          }))
        : (facility.sports || [])
            .filter((entry) => entry.sport && entry.sport.status !== "Inactive")
            .map((entry) => ({
              id: entry.sport._id,
              name: entry.sport.SportName,
              category: entry.sport.Category,
              image: entry.sport.baseUrl || entry.images?.[0] || "",
              description: entry.sport.description || "",
              type: entry.sport.defaultBookingMode,
              unitLabel: entry.sport.unitLabel,
              units: Number(entry.capacity) || 0,
              capacity: Number(entry.capacity) || 0,
              availability: "Active",
              feePerHour: entry.fees ? `₹${entry.fees}` : "Contact facility",
              surface: "Details available at facility",
              rating: entry.rating,
            }));
      return {
        id: facility._id,
        name: facility.name,
        district: facility.district?.District || "Not specified",
        taluka: facility.taluka || "",
        location: facility.location,
        latitude: facility.latitude == null || facility.latitude === "" ? null : Number(facility.latitude),
        longitude: facility.longitude == null || facility.longitude === "" ? null : Number(facility.longitude),
        category: facility.category,
        ownership: facility.ownership,
        operationalSince: facility.operationalSince,
        contactPerson: facility.manager?.Name || "Facility administration",
        contactPhone: facility.contactPhone || facility.manager?.ContactNum || "Not specified",
        contactEmail: facility.contactEmail || facility.manager?.Email || "Not specified",
        picture: facility.picture,
        gallery: facility.images || [],
        timings: facility.timings,
        amenities: facility.amenities,
        status: facility.status || "Active",
        condition: {
          grade: facility.conditionGrade,
          score: facility.conditionScore,
          lastInspectionDate: facility.lastInspectionDate,
          inspector: facility.inspector,
          maintenanceUrgency: facility.maintenanceUrgency,
          notes: facility.inspectionNotes,
        },
        utilisation: {
          capacityDaily: facility.capacityDaily,
          currentDailyFootfall: facility.currentDailyFootfall,
          utilizationRate: facility.utilisationRate,
        },
        details: {
          status: facility.status,
          area: facility.area,
          taluka: facility.taluka,
        },
        sports,
      };
    });
    let result;
    try { result = exploreFacilities(data, req.query); }
    catch (error) { return fail(res, 400, error.message); }
    return res.json({ ...result, rcode: 200 });
  } catch (error) {
    return fail(res, 500, "Could not load facilities");
  }
}

function totalFor(config, memberCount) {
  const calculation = config.price.calculation || "flat";
  const base = Number(config.price.amount) || 0;
  const perMember = Number(config.price.perMemberAmount) || 0;
  if (calculation === "per-member") {
    const rate = perMember || base;
    return { total: rate * memberCount, base: 0, perMember: rate };
  }
  if (calculation === "base-plus-member") {
    return { total: base + perMember * memberCount, base, perMember };
  }
  return { total: base, base, perMember: 0 };
}

async function createBooking(req, res) {
  try {
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(body.configId)) {
      return fail(res, 400, "Select a valid sport");
    }
    if (!mongoose.Types.ObjectId.isValid(body.slotId)) {
      return fail(res, 400, "Select a valid time slot");
    }
    const config = await FacilitySportConfig.findOne({
      _id: body.configId,
      status: "Active",
    }).populate("sport", "SportName");
    if (!config) return fail(res, 404, "Sport configuration not found");
    const facility = await SportsComplex.findById(config.facility).select("status");
    if (!facility || (facility.status && facility.status !== "Active")) return fail(res, 409, "This facility is not accepting bookings");
    const slot = config.slots.id(body.slotId);
    if (!slot || !slot.bookable) return fail(res, 400, "Selected slot is not bookable");

    const memberCount = Math.floor(Number(body.memberCount) || 1);
    const policy = effectivePolicy(config, slot);
    const minMembers = Number(policy.minMembers) || 1;
    const maxMembers = Number(policy.maxMembers) || 1;
    if (memberCount < minMembers || memberCount > maxMembers) {
      return fail(res, 400, `Member count must be between ${minMembers} and ${maxMembers}`);
    }
    const date = String(body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, "Select a valid date");
    const parsedDate = new Date(`${date}T12:00:00+05:30`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date < today) return fail(res, 400, "Choose a valid date today or later");
    const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(parsedDate).toLowerCase();
    if (slot.days?.length && !slot.days.some(value => value.toLowerCase().slice(0, 3) === day)) return fail(res, 400, "This slot does not run on the selected day");
    if (!String(body.name || "").trim() || !String(body.phone || "").trim()) {
      return fail(res, 400, "Booker name and mobile number are required");
    }

    const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const activeBookings = await Guest.find({
      facilitySportConfig: config._id,
      slotId: slot._id,
      Startdate: date,
      $or: [
        { bookingStatus: "Confirmed" },
        { bookingStatus: "Pending Payment", createdAt: { $gte: pendingCutoff } },
      ],
    }).select("memberCount reservedUnits");
    if (policy.inventoryMode === "exclusive-unit") {
      const reserved = activeBookings.reduce(
        (sum, booking) => sum + (Number(booking.reservedUnits) || 1),
        0
      );
      if (reserved >= config.unitCount) return fail(res, 409, "All units are booked for this slot");
    } else {
      const occupied = activeBookings.reduce(
        (sum, booking) => sum + (Number(booking.memberCount) || 1),
        0
      );
      if (occupied + memberCount > slot.capacity) {
        return fail(res, 409, "The selected slot does not have enough remaining capacity");
      }
    }

    const price = totalFor(config, memberCount);
    if (price.total < 1) return fail(res, 400, "This booking does not have a payable price");
    const reference = `BK-${new Date().getFullYear()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;
    const order = await createOrder({
      amount: price.total,
      receipt: reference,
      notes: {
        booking_reference: reference,
        facility_id: String(config.facility),
        sport: config.sport.SportName,
      },
    });
    const booking = await Guest.create({
      Name: String(body.name).trim(),
      Email: String(body.email || "").trim(),
      ContactNum: String(body.phone).trim(),
      Role: 0,
      IsActive: 1,
      timeslot: { from: slot.startTime, to: slot.endTime },
      duration: 1,
      sport: config.sport._id,
      SportComplexId: config.facility,
      Startdate: date,
      Enddate: date,
      facilitySportConfig: config._id,
      slotId: slot._id,
      coach: slot.coach || null,
      memberCount,
      reservedUnits: 1,
      totalAmount: price.total,
      bookingReference: reference,
      bookingStatus: "Pending Payment",
      paymentStatus: "Pending",
      razorpayOrderId: order.id,
      priceBreakdown: {
        calculation: config.price.calculation || "flat",
        baseAmount: price.base,
        perMemberAmount: price.perMember,
        memberCount,
      },
    });
    await BookingPayment.create({
      booking: booking._id,
      bookingReference: reference,
      facility: config.facility,
      sport: config.sport._id,
      coach: slot.coach || null,
      amount: price.total,
      currency: "INR",
      status: "Created",
      razorpayOrderId: order.id,
      payer: {
        name: String(body.name).trim(),
        email: String(body.email || "").trim(),
        phone: String(body.phone).trim(),
      },
    });

    return res.status(201).json({
      data: {
        id: booking._id,
        reference,
        sport: config.sport.SportName,
        slot: { label: slot.label, startTime: slot.startTime, endTime: slot.endTime },
        memberCount,
        totalAmount: price.total,
        reservationType: policy.reservationType,
        inventoryMode: policy.inventoryMode,
        status: booking.bookingStatus,
        payment: {
          keyId: checkoutKeyId(),
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          description: `${config.sport.SportName} booking at the selected facility`,
          prefill: {
            name: booking.Name,
            email: booking.Email,
            contact: booking.ContactNum,
          },
        },
      },
      rcode: 200,
    });
  } catch (error) {
    console.error("Public booking failed:", error.message);
    return fail(res, 500, "Could not create booking");
  }
}

async function verifyBookingPayment(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return fail(res, 400, "Invalid booking");
    }
    const body = req.body || {};
    const paymentRecord = await BookingPayment.findOne({
      booking: req.params.id,
      razorpayOrderId: body.razorpay_order_id,
    });
    if (!paymentRecord) return fail(res, 404, "Payment order not found");
    if (!verifyPaymentSignature({
      orderId: paymentRecord.razorpayOrderId,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    })) {
      return fail(res, 400, "Payment signature verification failed");
    }

    if (paymentRecord.status !== "Paid") {
      const gatewayPayment = await fetchPayment(body.razorpay_payment_id);
      if (
        gatewayPayment.order_id !== paymentRecord.razorpayOrderId ||
        Number(gatewayPayment.amount) !== Math.round(paymentRecord.amount * 100) ||
        gatewayPayment.currency !== "INR" ||
        gatewayPayment.status !== "captured"
      ) {
        return fail(res, 409, "Payment is not captured yet");
      }
      const paidAt = new Date();
      await Promise.all([
        BookingPayment.updateOne(
          { _id: paymentRecord._id },
          {
            $set: {
              status: "Paid",
              razorpayPaymentId: gatewayPayment.id,
              paidAt,
              gatewayDetails: {
                method: gatewayPayment.method,
                captured: gatewayPayment.captured,
                fee: gatewayPayment.fee,
                tax: gatewayPayment.tax,
              },
            },
          }
        ),
        Guest.updateOne(
          { _id: req.params.id },
          {
            $set: {
              bookingStatus: "Confirmed",
              paymentStatus: "Paid",
              razorpayPaymentId: gatewayPayment.id,
              paidAt,
            },
          }
        ),
      ]);
    }

    const booking = await Guest.findById(req.params.id).select(
      "bookingReference bookingStatus paymentStatus totalAmount paidAt"
    );
    return res.json({ data: booking, rcode: 200 });
  } catch (error) {
    console.error("Payment verification failed:", error.message);
    return fail(res, 500, "Could not verify payment");
  }
}

module.exports = { listFacilities, listConfigs, createBooking, verifyBookingPayment };
