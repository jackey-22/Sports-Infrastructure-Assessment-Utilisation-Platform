const Guest = require("../Model/GuestModel");
const { buildBookingPass, verifyBookingPassToken } = require("../Utils/bookingPass");
const { ROLE } = require("../Utils/roles");
async function latest(req, res) {
  try {
    const booking = await Guest.findOne({ bookingStatus: "Confirmed", paymentStatus: "Paid", $or: [{ citizenUser: req.user._id }, ...(req.user.Email ? [{ citizenUser: null, Email: req.user.Email }] : [])] })
      .sort({ createdAt: -1, paidAt: -1, _id: -1 }).populate("SportComplexId", "name").populate("sport", "SportName").lean();
    return res.json({ rcode: 200, data: buildBookingPass(booking) });
  } catch (error) { return res.status(500).json({ rcode: -9, msg: "Could not load your latest booking pass" }); }
}
async function resolvePass(req) {
  const payload = verifyBookingPassToken(req.body?.token);
  const booking = await Guest.findById(payload.bookingId).populate("SportComplexId", "name").populate("sport", "SportName").lean();
  const pass = buildBookingPass(booking);
  if (!pass || pass.status === "Expired" || pass.facilityId !== payload.facilityId) throw Object.assign(new Error("This booking pass is no longer valid"), { status: 400 });
  if (req.user.Role !== ROLE.ADMIN && String(req.user.SportComplexId) !== pass.facilityId) throw Object.assign(new Error("This pass belongs to another facility"), { status: 403 });
  return { pass, booking };
}
async function verify(req, res) {
  try { const { pass } = await resolvePass(req); return res.json({ rcode: 200, data: pass }); }
  catch (error) { return res.status(error.status || 400).json({ rcode: -9, msg: error.status ? error.message : "Invalid or expired booking pass" }); }
}
async function ownPass(req, res) {
  try {
    const booking = await Guest.findOne({ _id: req.params.id, bookingStatus: "Confirmed", paymentStatus: "Paid", $or: [{ citizenUser: req.user._id }, ...(req.user.Email ? [{ citizenUser: null, Email: req.user.Email }] : [])] }).populate("SportComplexId", "name").populate("sport", "SportName").lean();
    if (!booking) return res.status(404).json({ rcode: -9, msg: "Booking pass not found" });
    return res.json({ rcode: 200, data: buildBookingPass(booking) });
  } catch { return res.status(400).json({ rcode: -9, msg: "Could not load booking pass" }); }
}
module.exports = { latest, verify, ownPass, resolvePass };
