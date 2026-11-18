const ComplaintModel = require("../Model/ComplaintModel");
const { ROLE } = require("../Utils/roles");

module.exports.updateComplaintAthleteResponse = async function (req, res) {
  try {
    const complaint = await ComplaintModel.findOne({ _id: req.params.id });
    if (!complaint) {
      return res
        .status(404)
        .json({ data: "", msg: "Complaint not found", rcode: 404 });
    }
    if (
      req.user.Role !== ROLE.ADMIN &&
      String(complaint.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        data: "",
        msg: "You can only respond to your own complaint",
        rcode: -10,
      });
    }

    const satisfied = Number(req.body.satisfied);
    if (satisfied !== 0 && satisfied !== 1) {
      return res
        .status(400)
        .json({ data: "", msg: "Invalid response", rcode: -9 });
    }
    complaint.satisfied = satisfied;
    const response = await complaint.save();
    res.json({
      data: response,
      msg: "Athelte Response of Complaint added successfully",
      rcode: 200,
    });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not save response", rcode: -9 });
  }
};


// Legacy clients use the same workflow and permissions as app/web grievances.
const grievances = require("./GrievanceController");
module.exports.addComplaint = (req,res) => { req.grievanceLegacyPhoto = req.file ? `/complaints/${req.file.filename || req.file.originalname}` : ""; return grievances.createGrievance(req,res); };
module.exports.addComplaintApp = grievances.createGrievance;
module.exports.getAllComplaints = grievances.grievanceList;
module.exports.getAllComplaintsAdmin = grievances.grievanceList;
module.exports.getComplaintsAdmin = grievances.grievanceList;
module.exports.updateComplaint = (req,res) => {
  if (req.body.level !== undefined) { req.body.reason = req.body.reason || req.body.remark; return grievances.escalateGrievance(req,res); }
  if (req.body.status !== undefined) { if (![0,1,"0","1"].includes(req.body.status)) return res.status(400).json({ rcode:-9, msg:"Invalid status" }); req.body.resolve = Number(req.body.status) === 1; }
  return grievances.respondGrievance(req,res);
};
