const User = require("../Model/UsersModel");
const SportsComplex = require("../Model/SportsComplexModel");
const { hashPassword } = require("../Utils/password");
const { ROLE } = require("../Utils/roles");
const validator = require("validator");
const fields = "Name Email ContactNum IsActive SportComplexId createdAt";
async function ownFacility(user) {
  if (user.SportComplexId) return user.SportComplexId;
  const facility = await SportsComplex.findOne({ manager: user._id }).select("_id").lean();
  return facility?._id;
}
async function list(req, res) {
  try {
    const facility = await ownFacility(req.user);
    if (!facility) return res.status(403).json({ rcode: -10, msg: "No facility is assigned to your account" });
    const data = await User.find({ Role: ROLE.GATE_OPERATOR, SportComplexId: facility }).select(fields).sort({ createdAt: -1 }).lean();
    return res.json({ rcode: 200, data });
  } catch { return res.status(500).json({ rcode: -9, msg: "Could not load gate operators" }); }
}
async function create(req, res) {
  try {
    const facility = await ownFacility(req.user);
    if (!facility) return res.status(403).json({ rcode: -10, msg: "No facility is assigned to your account" });
    const { Name, Email, ContactNum, Password } = req.body || {};
    if (typeof Name !== "string" || !Name.trim() || typeof Email !== "string" || !validator.isEmail(Email.trim()) || typeof Password !== "string" || Password.length < 8 || (ContactNum && (typeof ContactNum !== "string" || !/^[+0-9 ()-]{10,18}$/.test(ContactNum)))) return res.status(400).json({ rcode: -9, msg: "Enter a name, valid email, optional mobile and password of at least 8 characters" });
    const email = Email.trim().toLowerCase();
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (await User.exists({ Email: { $regex: `^${escaped}$`, $options: "i" } })) return res.status(409).json({ rcode: -9, msg: "This email is already registered" });
    const user = await User.create({ Name: Name.trim(), Email: email, ContactNum: ContactNum || "", Password: hashPassword(Password), Role: ROLE.GATE_OPERATOR, IsActive: 1, SportComplexId: facility, createdBy: req.user._id });
    return res.status(201).json({ rcode: 200, data: { _id: user._id, Name: user.Name, Email: user.Email, Role: user.Role, IsActive: user.IsActive }, msg: "Gate operator created" });
  } catch { return res.status(500).json({ rcode: -9, msg: "Could not create gate operator" }); }
}
async function setActive(req, res) {
  try {
    if (![0,1].includes(req.body?.IsActive)) return res.status(400).json({ rcode: -9, msg: "Choose active or inactive" });
    const facility = await ownFacility(req.user);
    if (!facility) return res.status(403).json({ rcode: -10, msg: "No facility is assigned to your account" });
    const user = await User.findOneAndUpdate({ _id: req.params.id, Role: ROLE.GATE_OPERATOR, SportComplexId: facility }, { $set: { IsActive: req.body.IsActive } }, { new: true }).select(fields);
    if (!user) return res.status(404).json({ rcode: -9, msg: "Gate operator not found in your facility" });
    return res.json({ rcode: 200, data: user });
  } catch { return res.status(400).json({ rcode: -9, msg: "Could not update gate operator" }); }
}
module.exports = { list, create, setActive };
