const ComplaintModel = require("../Model/ComplaintModel");
const athleteModel = require("../Model/athleteModel");
const { sendPushNotification } = require("../PushNotification");
const { setReminder } = require("../SetReminder");
const { ROLE } = require("../Utils/roles");
const {
  sanitizeFilters,
  complaintQueryScope,
  canAccessComplex,
} = require("../Utils/scope");

// Level = the role that must handle the complaint next.
const START_LEVEL = {
  [ROLE.ATHLETE]: 0,
  [ROLE.SUPERVISOR]: 1,
  [ROLE.COACH]: 1,
  [ROLE.MANAGER]: 2,
  [ROLE.AUTHORITY]: 3,
  [ROLE.ADMIN]: 3,
};
const NEXT_LEVEL = {
  [ROLE.SUPERVISOR]: 1,
  [ROLE.MANAGER]: 2,
  [ROLE.AUTHORITY]: 3,
};

function buildComplaint(user, body) {
  const staffComplex = [ROLE.SUPERVISOR, ROLE.COACH, ROLE.MANAGER].includes(
    user.Role
  );
  return {
    type: body.type,
    Description: body.Description,
    photo: body.photo,
    userId: user._id,
    sportsComplex: staffComplex ? user.SportComplexId : body.sportsComplex,
    level: START_LEVEL[user.Role],
    status: 0,
    satisfied: 0,
  };
}

function complainantId(complaint) {
  if (!complaint || !complaint.userId) return null;
  return complaint.userId._id || complaint.userId;
}

module.exports.addComplaint = async function (req, res) {
  try {
    const body = { ...req.body };
    if (req.file) body.photo = req.file.originalname;
    const complaint = new ComplaintModel(buildComplaint(req.user, body));
    const data = await complaint.save();
    res.json({ data: data, msg: "Complaint Generated", rcode: 200 });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not add complaint", rcode: -9 });
  }
};

module.exports.addComplaintApp = async function (req, res) {
  try {
    const complaint = new ComplaintModel(buildComplaint(req.user, req.body));
    const data = await complaint.save();

    if (data.level === 0) {
      const supervisor = await athleteModel
        .findOne({ userId: data.userId })
        .populate("createdBy");
      if (supervisor && supervisor.createdBy) {
        setReminder(Date.now(), "Click to View..", "Athlete Raised Complaint", [
          supervisor.createdBy,
        ]);
      }
    }

    res.json({ data: data, msg: "Complaint Generated", rcode: 200 });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not add complaint", rcode: -9 });
  }
};

module.exports.getAllComplaints = async function (req, res) {
  try {
    const filters = sanitizeFilters(req.query, [
      "_id",
      "status",
      "level",
      "sportsComplex",
      "userId",
      "type",
      "satisfied",
    ]);
    const scope = await complaintQueryScope(req.user);
    // Scope is applied last so query parameters cannot widen it.
    const query = { ...filters, ...scope };

    const data = await ComplaintModel.find(query)
      .populate("userId")
      .populate("type")
      .populate({
        path: "remarks",
        populate: { path: "userId" },
      });
    res.json({ data: data, msg: "Complaint Retrived", rcode: 200 });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not retrieve complaints", rcode: -9 });
  }
};

module.exports.getAllComplaintsAdmin = async function (req, res) {
  try {
    const query = sanitizeFilters(req.query, [
      "_id",
      "status",
      "level",
      "sportsComplex",
      "userId",
      "type",
      "satisfied",
    ]);
    const data = await ComplaintModel.find(query)
      .populate("userId")
      .populate("type")
      .populate({
        path: "sportsComplex",
        populate: { path: "district" },
      })
      .populate({
        path: "remarks",
        populate: { path: "userId" },
      });
    res.json({ data: data, msg: "Complaint Retrived", rcode: 200 });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not retrieve complaints", rcode: -9 });
  }
};

module.exports.updateComplaint = async function (req, res) {
  const user = req.user;
  const allowedRoles = [
    ROLE.SUPERVISOR,
    ROLE.MANAGER,
    ROLE.AUTHORITY,
    ROLE.ADMIN,
  ];
  if (!allowedRoles.includes(user.Role)) {
    return res
      .status(403)
      .json({ data: "", msg: "You cannot update complaints", rcode: -10 });
  }

  try {
    const complaint = await ComplaintModel.findOne({ _id: req.params.id }).populate(
      "userId"
    );
    if (!complaint) {
      return res
        .status(404)
        .json({ data: "", msg: "Complaint not found", rcode: 404 });
    }
    if (!(await canAccessComplex(user, complaint.sportsComplex))) {
      return res.status(403).json({
        data: "",
        msg: "Complaint is outside your facility scope",
        rcode: -10,
      });
    }

    const currentLevel = complaint.level;
    const ownerId = complainantId(complaint);
    const remark = typeof req.body.remark === "string" ? req.body.remark : "";

    if (req.body.status !== undefined) {
      const status = Number(req.body.status);
      if (status !== 0 && status !== 1) {
        return res
          .status(400)
          .json({ data: "", msg: "Invalid status", rcode: -9 });
      }
      complaint.status = status;
      if (status === 1 && ownerId) {
        setReminder(
          Date.now(),
          "Let us know about are you satisfied or not!",
          "Your Complaint Solved",
          [ownerId]
        );
      }
    }

    if (req.body.level !== undefined) {
      const level = Number(req.body.level);
      // Each role may only forward one step up the established chain.
      if (NEXT_LEVEL[user.Role] !== level) {
        return res.status(403).json({
          data: "",
          msg: "You cannot move this complaint to that level",
          rcode: -10,
        });
      }
      complaint.level = level;
      if (level > 0 && complaint.status === 0 && ownerId) {
        setReminder(Date.now(), "Click here...", "Your Complaint Forwarded", [
          ownerId,
        ]);
      }
    }

    // The remark author always comes from the verified session, never the body.
    complaint.remarks.push({
      date: new Date(),
      level: currentLevel,
      userId: user._id,
      remark,
    });
    const response = await complaint.save();
    res.json({
      data: response,
      msg: "Complaint updated successfully",
      rcode: 200,
    });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not update complaint", rcode: -9 });
  }
};

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

module.exports.getComplaintsAdmin = async function (req, res) {
  try {
    const query = { level: 3 };
    const status = Number(req.query.status);
    if (req.query.status !== undefined && (status === 0 || status === 1)) {
      query.status = status;
    }
    if (req.query.from && req.query.to) {
      const from = new Date(req.query.from);
      const to = new Date(req.query.to);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        query.createdAt = { $gte: from, $lt: new Date(to.getTime() + 86400000) };
      }
    }

    const data = await ComplaintModel.find(query)
      .populate("userId")
      .populate("type")
      .populate({
        path: "remarks",
        populate: { path: "userId" },
      })
      .populate({
        path: "sportsComplex",
        populate: { path: "district" },
      });

    res.json({
      result: data.length,
      data: data,
      msg: "Complaint Retrived",
      rcode: 200,
    });
  } catch (error) {
    res.status(500).json({ data: "", msg: "Could not retrieve complaints", rcode: -9 });
  }
};
