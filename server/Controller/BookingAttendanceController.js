const Attendance = require("../Model/BookingAttendanceModel");
const { resolvePass } = require("./BookingPassController");
const { ROLE } = require("../Utils/roles");
const indiaDate = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0,10);
function row(value) {
  const b = value.booking || {};
  return { id: String(value._id), bookingId: String(b._id || b), reference: b.bookingReference,
    name: b.Name, sport: b.sport?.SportName, facilityName: value.facility?.name || "Facility", facilityId: value.facility?._id || value.facility,
    date: value.date, entry: value.entryAt, exit: value.exitAt, members: value.members,
    status: value.exitAt ? "Completed" : "Checked In",
    durationMinutes: value.exitAt ? Math.round((new Date(value.exitAt) - new Date(value.entryAt)) / 60000) : null };
}
async function record(req, res) {
  try {
    if (!["entry", "exit"].includes(req.body?.action)) return res.status(400).json({ rcode: -9, msg: "Choose entry or exit" });
    const { pass, booking } = await resolvePass(req);
    if (pass.date !== indiaDate()) return res.status(400).json({ rcode: -9, msg: "Attendance can only be recorded on the booked date" });
    let attendance;
    if (req.body.action === "entry") {
      const values = { booking: booking._id, facility: pass.facilityId, citizenUser: booking.citizenUser || null, date: pass.date, entryAt: new Date(), entryBy: req.user._id, members: booking.memberCount || 1 };
      try { attendance = await Attendance.findOneAndUpdate({ booking: booking._id }, { $setOnInsert: values }, { upsert: true, new: true }); }
      catch (error) { if (error.code !== 11000) throw error; attendance = await Attendance.findOne({ booking: booking._id }); }
      if (attendance.exitAt) return res.status(409).json({ rcode: -9, msg: "This booking has already completed its visit" });
    } else {
      attendance = await Attendance.findOneAndUpdate({ booking: booking._id, exitAt: null }, { $set: { exitAt: new Date(), exitBy: req.user._id } }, { new: true });
      if (!attendance) attendance = await Attendance.findOne({ booking: booking._id });
      if (!attendance) return res.status(409).json({ rcode: -9, msg: "Record entry before recording exit" });
    }
    return res.json({ rcode: 200, data: { id: attendance._id, reference: pass.passId, name: pass.userName, facilityName: pass.facilityName, sport: pass.sport, entry: attendance.entryAt, exit: attendance.exitAt, status: attendance.exitAt ? "Completed" : "Checked In" }, msg: req.body.action === "entry" ? "Entry recorded" : "Exit recorded" });
  } catch (error) { return res.status(error.status || 400).json({ rcode: -9, msg: error.status ? error.message : "Could not record attendance. Scan a valid booking pass." }); }
}
async function list(req, res) {
  try {
    const filter = req.user.Role === ROLE.ATHLETE ? { citizenUser: req.user._id } : req.user.Role === ROLE.ADMIN ? {} : { facility: req.user.SportComplexId || null };
    if (req.user.Role !== ROLE.ATHLETE) filter.date = typeof req.query.date === "string" ? req.query.date : indiaDate();
    const data = await Attendance.find(filter).populate({ path: "booking", select: "Name bookingReference sport", populate: { path: "sport", select: "SportName" } }).populate("facility", "name").sort({ entryAt: -1 }).limit(200).lean();
    return res.json({ rcode: 200, data: data.map(row) });
  } catch { return res.status(500).json({ rcode: -9, msg: "Could not load attendance" }); }
}
module.exports = { record, list };
