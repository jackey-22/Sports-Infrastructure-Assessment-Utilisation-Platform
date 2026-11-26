const mongoose = require("mongoose");
const Complaint = require("../Model/ComplaintModel");
const Facility = require("../Model/SportsComplexModel");
const User = require("../Model/UsersModel");
const {
  ROLE
} = require("../Utils/roles");
const {
  scopedComplexIds,
  canAccessComplex
} = require("../Utils/scope");
const {
  HANDLERS,
  LABELS,
  startLevel,
  nextLevel,
  permissions,
  nextDeadline
} = require("../Utils/grievancePolicy");
const {
  setReminder
} = require("../SetReminder");
const fail = (res, code, msg) => res.status(code).json({
  data: "",
  msg,
  rcode: -9
});
const validId = id => mongoose.isValidObjectId(id);
async function notify(item, title, message, handler = false) {
  try {
    const ids = [item.userId?._id || item.userId];
    if (handler) {
      const query = {
        Role: HANDLERS[item.level],
        IsActive: {
          $ne: 0
        },
        _id: {
          $ne: ids[0]
        }
      };
      if (item.level < 2) query.SportComplexId = item.sportsComplex;
      if (item.level === 2) {
        const facility = await Facility.findById(item.sportsComplex).select("district").lean();
        query.DistrictId = facility?.district || null;
      }
      const users = await User.find(query).select("_id").lean();
      ids.push(...users.map(user => user._id));
    }
    await setReminder(new Date(), message, title, [...new Set(ids.filter(Boolean).map(String))]);
  } catch (error) {
    console.error("Grievance notification failed", error.message);
  }
}
async function normalizeLegacy() {
  if (mongoose.connection.readyState !== 1 && !Object.hasOwn(Complaint, "updateMany")) return;
  try {
    // A version marker makes normalization idempotent across scheduler instances.
    await Complaint.updateMany({
      workflowVersion: {
        $ne: 1
      }
    }, [{
      $set: {
        workflowVersion: 1,
        revision: {
          $ifNull: ["$revision", 0]
        },
        level: {
          $cond: [{
            $in: ["$level", [0, 1, 2, 3]]
          }, "$level", 0]
        },
        status: {
          $cond: [{
            $or: [{
              $eq: ["$status", 1]
            }, {
              $eq: ["$workflowStatus", "Resolved"]
            }]
          }, 1, 0]
        },
        workflowStatus: {
          $cond: [{
            $or: [{
              $eq: ["$status", 1]
            }, {
              $eq: ["$workflowStatus", "Resolved"]
            }]
          }, "Resolved", {
            $ifNull: ["$workflowStatus", "Open"]
          }]
        },
        dueAt: {
          $ifNull: ["$dueAt", nextDeadline()]
        }
      }
    }]);
  } catch (err) {
    // Database operation bypassed when unavailable
  }
}
async function escalateOverdueComplaints() {
  if (mongoose.connection.readyState !== 1 && !Object.hasOwn(Complaint, "find")) return;
  await normalizeLegacy();
  const rows = await Complaint.find({
    status: 0,
    workflowStatus: {
      $ne: "Resolved"
    },
    level: {
      $lt: 3
    },
    dueAt: {
      $lte: new Date()
    }
  }).lean();
  let count = 0;
  for (const item of rows) {
    const now = new Date();
    const targetLevel = nextLevel(item.level);
    const updated = await Complaint.findOneAndUpdate({
      _id: item._id,
      revision: item.revision,
      level: item.level,
      status: 0,
      dueAt: {
        $lte: now
      }
    }, {
      $set: {
        level: targetLevel,
        workflowStatus: "Escalated",
        escalatedAt: now,
        dueAt: nextDeadline(),
        escalationNotified: false
      },
      $inc: {
        revision: 1
      },
      $push: {
        history: {
          action: "escalated",
          fromLevel: item.level,
          toLevel: targetLevel,
          reason: "No response or resolution within 3 days",
          date: now
        }
      }
    }, {
      new: true
    });
    if (updated) {
      count++;
      await notify(updated, "Grievance escalated", `Assigned to ${LABELS[updated.level]}`, true);
    }
  }
  return count;
}
async function facilities(req, res) {
  try {
    const ids = Number(req.user.Role) === ROLE.ATHLETE ? null : await scopedComplexIds(req.user);
    const data = await Facility.find({
      ...(ids === null ? {} : {
        _id: {
          $in: ids
        }
      }),
      status: {
        $ne: "Inactive"
      }
    }).select("name location").lean();
    return res.json({
      data,
      rcode: 200
    });
  } catch {
    return fail(res, 500, "Could not load facilities");
  }
}
async function grievanceList(req, res) {
  try {
    await normalizeLegacy();
    if (mongoose.connection.readyState === 1) {
      await escalateOverdueComplaints().catch(() => {});
    }
    const own = {
      userId: req.user._id
    };
    const ids = await scopedComplexIds(req.user);
    const level = HANDLERS.indexOf(Number(req.user.Role));
    const assigned = level < 0 ? {
      _id: null
    } : {
      level,
      userId: {
        $ne: req.user._id
      },
      ...(ids === null ? {} : {
        sportsComplex: {
          $in: ids
        }
      })
    };
    const scope = req.query.view === "mine" ? own : req.query.view === "assigned" ? assigned : {
      $or: [own, assigned]
    };
    const filters = {};
    for (const key of ["_id", "sportsComplex", "userId", "type"]) {
      if (req.query[key] !== undefined) {
        if (typeof req.query[key] !== "string" || !validId(req.query[key])) return fail(res, 400, "Invalid grievance filter");
        filters[key] = req.query[key];
      }
    }
    for (const key of ["status", "level", "satisfied"]) {
      if (req.query[key] !== undefined) {
        const value = Number(req.query[key]);
        if (!["string", "number"].includes(typeof req.query[key]) || !Number.isInteger(value) || value < 0 || value > (key === "level" ? 3 : 1)) return fail(res, 400, "Invalid grievance filter");
        filters[key] = value;
      }
    }
    const query = Object.keys(filters).length ? {
      $and: [scope, filters]
    } : scope;
    const rows = await Complaint.find(query).populate("userId", "Name Role").populate("sportsComplex", "name").populate("remarks.userId", "Name Role").populate("history.userId", "Name Role").sort({
      createdAt: -1
    }).lean();
    return res.json({
      data: rows.map(item => ({
        ...item,
        handlingRole: LABELS[item.level],
        overdue: item.status !== 1 && item.dueAt && new Date(item.dueAt) <= new Date(),
        permissions: permissions(item, req.user, ids === null || ids.some(id => String(id) === String(item.sportsComplex?._id || item.sportsComplex)))
      })),
      rcode: 200
    });
  } catch {
    return fail(res, 500, "Could not load grievances");
  }
}
async function createGrievance(req, res) {
  try {
    const role = Number(req.user.Role),
      ids = await scopedComplexIds(req.user);
    const facility = req.body.sportsComplex || (ids && ids.length === 1 ? ids[0] : null);
    const subject = String(req.body.subject || "Facility grievance").trim();
    const description = String(req.body.description || req.body.Description || "").trim();
    if (!validId(facility) || !description || !subject || description.length > 5000 || subject.length > 240) return fail(res, 400, "Provide a facility, title (up to 240 characters) and description (up to 5000 characters)");
    if (role !== ROLE.ATHLETE && !(await canAccessComplex(req.user, facility))) return fail(res, 403, "Facility is outside your scope");
    if (!(await Facility.exists({
      _id: facility,
      status: {
        $ne: "Inactive"
      }
    }))) return fail(res, 404, "Facility not found");
    const proof = String(req.body.proofUrl || "");
    if (proof) {
      try {
        if (new URL(proof).protocol !== "https:") throw Error();
      } catch {
        return fail(res, 400, "Upload the attachment first");
      }
    }
    const level = startLevel(role);
    if (level === undefined) return fail(res, 403, "Unsupported role");
    const data = await Complaint.create({
      subject,
      Description: description,
      sportsComplex: facility,
      userId: req.user._id,
      type: validId(req.body.type) ? req.body.type : undefined,
      photo: proof || req.grievanceLegacyPhoto || "",
      proofName: String(req.body.proofName || "").slice(0, 240),
      proofKey: String(req.body.proofKey || "").slice(0, 500),
      level,
      status: 0,
      workflowStatus: "Open",
      workflowVersion: 1,
      revision: 0,
      dueAt: nextDeadline(),
      history: [{
        action: "created",
        userId: req.user._id,
        role,
        toLevel: level,
        date: new Date()
      }]
    });
    await notify(data, "New grievance", subject, true);
    return res.status(201).json({
      data,
      msg: "Grievance raised",
      rcode: 200
    });
  } catch {
    return fail(res, 500, "Could not raise grievance");
  }
}
async function transition(req, res, action) {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid grievance ID");
    await normalizeLegacy();
    const item = await Complaint.findById(req.params.id).lean();
    if (!item) return fail(res, 404, "Grievance not found");
    if (req.body.revision !== undefined && req.body.revision !== item.revision) return fail(res, 409, "Grievance changed. Refresh before trying again.");
    const targetLevel = nextLevel(item.level);
    if (action === "escalate" && req.body.level !== undefined && Number(req.body.level) !== targetLevel) return fail(res, 400, "Escalation must move to the next authority level");
    const allowed = permissions(item, req.user, await canAccessComplex(req.user, item.sportsComplex));
    if (!(action === "escalate" ? allowed.canEscalate : allowed.canRespond)) return fail(res, 403, "This action is not available for your role or this grievance");
    const reason = String(action === "escalate" ? req.body.reason || req.body.remark || "" : req.body.response || req.body.remark || "").trim();
    if (!reason || reason.length > 5000) return fail(res, 400, "A response or escalation reason is required (up to 5000 characters)");
    if (action !== "escalate" && req.body.resolve !== undefined && typeof req.body.resolve !== "boolean") return fail(res, 400, "Resolve must be a boolean");
    const now = new Date(),
      resolve = req.body.resolve === true && action !== "escalate";
    const set = action === "escalate" ? {
      level: targetLevel,
      workflowStatus: "Escalated",
      escalatedAt: now,
      dueAt: nextDeadline(),
      escalationNotified: false
    } : {
      workflowStatus: resolve ? "Resolved" : "Responded",
      status: resolve ? 1 : 0,
      ...(resolve ? {
        resolvedAt: now
      } : {}),
      ...(Number(req.user.Role) === ROLE.MANAGER ? {
        managerRespondedAt: now
      } : {})
    };
    const data = await Complaint.findOneAndUpdate({
      _id: item._id,
      revision: item.revision,
      level: item.level,
      status: 0
    }, {
      $set: set,
      $inc: {
        revision: 1
      },
      $push: {
        remarks: {
          level: item.level,
          userId: req.user._id,
          remark: reason,
          date: now
        },
        history: {
          action: action === "escalate" ? "escalated" : resolve ? "resolved" : "responded",
          userId: req.user._id,
          role: req.user.Role,
          fromLevel: item.level,
          toLevel: set.level ?? item.level,
          reason,
          date: now
        }
      }
    }, {
      new: true
    });
    if (!data) return fail(res, 409, "Grievance changed. Refresh before trying again.");
    await notify(data, action === "escalate" ? "Grievance escalated" : resolve ? "Grievance resolved" : "Grievance response", reason, action === "escalate");
    return res.json({
      data,
      msg: "Grievance updated",
      rcode: 200
    });
  } catch {
    return fail(res, 500, "Could not update grievance");
  }
}
module.exports = {
  facilities,
  grievanceList,
  createGrievance,
  escalateOverdueComplaints,
  normalizeLegacy,
  respondGrievance: (req, res) => transition(req, res, "respond"),
  escalateGrievance: (req, res) => transition(req, res, "escalate")
};
