const jwt = require("jsonwebtoken");
function secret() {
  if (!process.env.ACCESS_TOKEN_SECRET) throw new Error("ACCESS_TOKEN_SECRET is not configured");
  return process.env.ACCESS_TOKEN_SECRET;
}
function sessionEnd(booking) {
  const date = booking.Enddate || booking.Startdate;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(booking.timeslot?.to || "").trim());
  let hour = 23, minute = 59;
  if (match) {
    hour = Number(match[1]); minute = Number(match[2]);
    if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
    if (hour > 23 || minute > 59) return NaN;
  }
  return Date.parse(`${date}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:59+05:30`);
}
function buildBookingPass(booking, now = Date.now()) {
  if (!booking || booking.bookingStatus !== "Confirmed" || booking.paymentStatus !== "Paid") return null;
  const end = sessionEnd(booking);
  if (!Number.isFinite(end)) return null;
  const facility = booking.SportComplexId;
  const facilityId = String(facility?._id || facility);
  const today = new Date(now + 330 * 60 * 1000).toISOString().slice(0,10);
  const status = now > end ? "Expired" : booking.Startdate > today ? "Upcoming" : "Active";
  const pass = {
    bookingId: String(booking._id), passId: booking.bookingReference,
    userName: booking.Name, facilityId, facilityName: facility?.name || "Sports facility",
    sport: booking.sport?.SportName || "Sport", date: booking.Startdate,
    session: `${booking.timeslot?.from || ""} - ${booking.timeslot?.to || ""}`,
    validTill: `${booking.Enddate || booking.Startdate} ${booking.timeslot?.to || "23:59"} IST`,
    status,
  };
  if (status === "Expired") return { ...pass, qrPayload: null };
  const token = jwt.sign({ kind: "booking-pass", bookingId: pass.bookingId, facilityId, exp: Math.floor(end / 1000) }, secret(), { algorithm: "HS256", audience: "khelgujarat-booking-pass", noTimestamp: true });
  return { ...pass, qrPayload: JSON.stringify({ type: "KHELGUJARAT_BOOKING_PASS", passId: pass.passId, bookingId: pass.bookingId, token }) };
}
function verifyBookingPassToken(token) {
  const payload = jwt.verify(token, secret(), { algorithms: ["HS256"], audience: "khelgujarat-booking-pass" });
  if (payload.kind !== "booking-pass") throw new Error("Invalid booking pass");
  return payload;
}
async function loadBookingPass(id) {
  const Guest = require("../Model/GuestModel");
  const booking = await Guest.findById(id).populate("SportComplexId", "name").populate("sport", "SportName").lean();
  return buildBookingPass(booking);
}
module.exports = { buildBookingPass, verifyBookingPassToken, loadBookingPass, sessionEnd };
