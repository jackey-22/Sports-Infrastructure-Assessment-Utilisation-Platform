const mongoose = require("mongoose");
const SportsComplex = require("../Model/SportsComplexModel");
const Sport = require("../Model/SportModel");
const User = require("../Model/UsersModel");
const Instructor = require("../Model/instructorModel");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const { hashPassword } = require("../Utils/password");
const { ROLE } = require("../Utils/roles");

const objectId = (value) => mongoose.Types.ObjectId.isValid(value);
const text = (value, max = 500) => String(value || "").trim().slice(0, max);
const fail = (res, status, msg) =>
  res.status(status).json({ data: "", msg, rcode: status === 403 ? -10 : -9 });

function publicUser(user) {
  if (!user) return null;
  const value = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete value.Password;
  return value;
}

function facilityPayload(body) {
  return {
    name: text(body.name, 160),
    location: text(body.location || body.address, 500),
    latitude: text(body.latitude, 32),
    longitude: text(body.longitude, 32),
    district: body.district,
    taluka: text(body.taluka || body.city, 120),
    area: text(body.area, 80),
    operationalSince: text(body.operationalSince, 20),
    category: text(body.category, 120) || "SAG District Sports Complex",
    ownership: text(body.ownership, 160) || "Sports Authority of Gujarat (SAG)",
    contactPhone: text(body.contactPhone, 30),
    contactEmail: text(body.contactEmail, 180),
    status: body.status || "Active",
    picture: text(body.picture, 1500),
    images: Array.isArray(body.images) ? body.images.map((item) => text(item, 1500)).filter(Boolean) : [],
  };
}

async function createStaff(body, role, actor, facilityId) {
  const email = text(body.email, 180).toLowerCase();
  if (!email) throw Object.assign(new Error("Email is required"), { status: 400 });
  if (await User.exists({ Email: email })) {
    throw Object.assign(new Error("Email is already registered"), { status: 409 });
  }
  const password = String(body.password || "");
  if (password.length < 8) {
    throw Object.assign(new Error("Temporary password must be at least 8 characters"), {
      status: 400,
    });
  }
  return User.create({
    Name: text(body.name, 160),
    Email: email,
    ContactNum: text(body.contact, 30),
    DOB: text(body.dob, 20),
    Role: role,
    IsActive: 1,
    DistrictId: body.district || undefined,
    SportComplexId: facilityId,
    createdBy: actor._id,
    Password: hashPassword(password),
  });
}

async function listFacilities(req, res) {
  const facilities = await SportsComplex.find()
    .populate("district", "District")
    .populate("manager", "Name Email ContactNum IsActive")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ data: facilities, rcode: 200 });
}

async function createFacility(req, res) {
  let facility;
  try {
    const body = req.body || {};
    const payload = facilityPayload(body);
    if (!payload.name || !payload.location || !payload.latitude || !payload.longitude) {
      return fail(res, 400, "Name, address, latitude and longitude are required");
    }
    if (!objectId(payload.district)) return fail(res, 400, "A valid district is required");
    facility = await SportsComplex.create(payload);
    const manager = await createStaff(
      { ...(body.manager || {}), district: body.district },
      ROLE.MANAGER,
      req.user,
      facility._id
    );
    facility.manager = manager._id;
    await facility.save();
    await facility.populate([
      { path: "district", select: "District" },
      { path: "manager", select: "Name Email ContactNum IsActive" },
    ]);
    return res.status(201).json({ data: facility, rcode: 200 });
  } catch (error) {
    if (facility) await SportsComplex.deleteOne({ _id: facility._id });
    return fail(res, error.status || 500, error.message || "Could not create facility");
  }
}

async function updateFacility(req, res) {
  try {
    if (!objectId(req.params.id)) return fail(res, 400, "Invalid facility");
    const facility = await SportsComplex.findById(req.params.id);
    if (!facility) return fail(res, 404, "Facility not found");
    Object.assign(facility, facilityPayload({ ...facility.toObject(), ...(req.body || {}) }));
    const managerInput = req.body && req.body.manager;
    if (managerInput) {
      let manager = facility.manager ? await User.findById(facility.manager) : null;
      if (!manager) {
        manager = await createStaff(
          { ...managerInput, district: facility.district },
          ROLE.MANAGER,
          req.user,
          facility._id
        );
        facility.manager = manager._id;
      } else {
        if (managerInput.email && managerInput.email.toLowerCase() !== manager.Email) {
          if (await User.exists({ Email: managerInput.email.toLowerCase(), _id: { $ne: manager._id } })) {
            return fail(res, 409, "Manager email is already registered");
          }
          manager.Email = managerInput.email.toLowerCase();
        }
        if (managerInput.name !== undefined) manager.Name = text(managerInput.name, 160);
        if (managerInput.contact !== undefined) manager.ContactNum = text(managerInput.contact, 30);
        if (managerInput.password) manager.Password = hashPassword(String(managerInput.password));
        manager.SportComplexId = facility._id;
        await manager.save();
      }
    }
    await facility.save();
    await facility.populate([
      { path: "district", select: "District" },
      { path: "manager", select: "Name Email ContactNum IsActive" },
    ]);
    return res.json({ data: facility, rcode: 200 });
  } catch (error) {
    return fail(res, 500, error.message || "Could not update facility");
  }
}

async function deleteFacility(req, res) {
  if (!objectId(req.params.id)) return fail(res, 400, "Invalid facility");
  const existing = await SportsComplex.findById(req.params.id).select("manager");
  if (!existing) return fail(res, 404, "Facility not found");
  const [configs, staff] = await Promise.all([
    FacilitySportConfig.countDocuments({ facility: req.params.id }),
    User.countDocuments({ SportComplexId: req.params.id, IsActive: 1 }),
  ]);
  const allowedManagerCount = existing.manager ? 1 : 0;
  if (configs || staff > allowedManagerCount) {
    return fail(res, 409, "Remove facility sport configurations and assigned staff first");
  }
  const facility = await SportsComplex.findByIdAndDelete(req.params.id);
  if (facility.manager) {
    await User.updateOne(
      { _id: facility.manager },
      { $set: { IsActive: 0 }, $unset: { SportComplexId: 1 } }
    );
  }
  return res.json({ data: { id: req.params.id }, rcode: 200 });
}

function sportPayload(body) {
  return {
    SportName: text(body.name || body.SportName, 120),
    Category: text(body.category || body.Category, 80),
    baseUrl: text(body.image || body.baseUrl, 1500),
    description: text(body.description, 2000),
    formats: Array.isArray(body.formats)
      ? body.formats.map((item) => text(item, 80)).filter(Boolean)
      : text(body.formats, 500).split(",").map((item) => item.trim()).filter(Boolean),
    defaultBookingMode: body.defaultBookingMode || "capacity",
    unitLabel: text(body.unitLabel, 80) || "participants",
    status: body.status || "Active",
    parameters: Array.isArray(body.parameters)
      ? body.parameters
      : text(body.parameters, 1000).split(",").map((item) => item.trim()).filter(Boolean),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  };
}

async function listSports(req, res) {
  const sports = await Sport.find().sort({ SportName: 1 }).lean();
  return res.json({ data: sports, rcode: 200 });
}

async function createSport(req, res) {
  try {
    const payload = sportPayload(req.body || {});
    if (!payload.SportName || !payload.Category) {
      return fail(res, 400, "Sport name and category are required");
    }
    if (await Sport.exists({ SportName: new RegExp(`^${payload.SportName}$`, "i") })) {
      return fail(res, 409, "A sport with this name already exists");
    }
    const sport = await Sport.create(payload);
    return res.status(201).json({ data: sport, rcode: 200 });
  } catch (error) {
    return fail(res, 500, error.message || "Could not create sport");
  }
}

async function updateSport(req, res) {
  try {
    if (!objectId(req.params.id)) return fail(res, 400, "Invalid sport");
    const sport = await Sport.findByIdAndUpdate(
      req.params.id,
      { $set: sportPayload(req.body || {}) },
      { new: true, runValidators: true }
    );
    if (!sport) return fail(res, 404, "Sport not found");
    return res.json({ data: sport, rcode: 200 });
  } catch (error) {
    return fail(res, 500, error.message || "Could not update sport");
  }
}

async function deleteSport(req, res) {
  if (!objectId(req.params.id)) return fail(res, 400, "Invalid sport");
  const [configs, coaches] = await Promise.all([
    FacilitySportConfig.countDocuments({ sport: req.params.id }),
    Instructor.countDocuments({ "sports.sport": req.params.id }),
  ]);
  if (configs || coaches) return fail(res, 409, "This sport is in use by a facility or coach");
  const sport = await Sport.findByIdAndDelete(req.params.id);
  if (!sport) return fail(res, 404, "Sport not found");
  return res.json({ data: { id: req.params.id }, rcode: 200 });
}

async function listCoaches(req, res) {
  const coaches = await Instructor.find()
    .populate("userId", "Name Email ContactNum IsActive")
    .populate("SportComplexId", "name")
    .populate("sports.sport", "SportName")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ data: coaches, rcode: 200 });
}

async function createCoach(req, res) {
  let user;
  try {
    const body = req.body || {};
    if (!objectId(body.facilityId)) return fail(res, 400, "A valid facility is required");
    const sportIds = Array.isArray(body.sportIds) ? body.sportIds.filter(objectId) : [];
    if (!sportIds.length) return fail(res, 400, "Select at least one sport");
    user = await createStaff(
      {
        name: body.name,
        email: body.email,
        contact: body.contact,
        dob: body.dob,
        password: body.password,
      },
      ROLE.COACH,
      req.user,
      body.facilityId
    );
    const coach = await Instructor.create({
      SportComplexId: body.facilityId,
      userId: user._id,
      createdBy: req.user._id,
      qualification: text(body.qualification, 250),
      status: body.status || "Active",
      sports: sportIds.map((sport) => ({
        sport,
        experience: Number(body.experience) || 0,
        timeSlot: [],
      })),
    });
    await coach.populate([
      { path: "userId", select: "Name Email ContactNum IsActive" },
      { path: "SportComplexId", select: "name" },
      { path: "sports.sport", select: "SportName" },
    ]);
    return res.status(201).json({ data: coach, user: publicUser(user), rcode: 200 });
  } catch (error) {
    if (user) await User.deleteOne({ _id: user._id });
    return fail(res, error.status || 500, error.message || "Could not create coach");
  }
}

async function updateCoach(req, res) {
  try {
    if (!objectId(req.params.id)) return fail(res, 400, "Invalid coach");
    const body = req.body || {};
    const coach = await Instructor.findById(req.params.id);
    if (!coach) return fail(res, 404, "Coach not found");
    const user = await User.findById(coach.userId).select("+Password");
    if (!user) return fail(res, 404, "Coach user not found");
    if (body.email && body.email.toLowerCase() !== user.Email) {
      if (await User.exists({ Email: body.email.toLowerCase(), _id: { $ne: user._id } })) {
        return fail(res, 409, "Email is already registered");
      }
      user.Email = body.email.toLowerCase();
    }
    if (body.name !== undefined) user.Name = text(body.name, 160);
    if (body.contact !== undefined) user.ContactNum = text(body.contact, 30);
    if (body.password) user.Password = hashPassword(String(body.password));
    if (objectId(body.facilityId)) {
      coach.SportComplexId = body.facilityId;
      user.SportComplexId = body.facilityId;
    }
    if (Array.isArray(body.sportIds)) {
      coach.sports = body.sportIds.filter(objectId).map((sport) => ({
        sport,
        experience: Number(body.experience) || 0,
        timeSlot: [],
      }));
    }
    coach.qualification = text(body.qualification, 250);
    coach.status = body.status || coach.status;
    user.IsActive = coach.status === "Active" ? 1 : 0;
    await Promise.all([coach.save(), user.save()]);
    await coach.populate([
      { path: "userId", select: "Name Email ContactNum IsActive" },
      { path: "SportComplexId", select: "name" },
      { path: "sports.sport", select: "SportName" },
    ]);
    return res.json({ data: coach, rcode: 200 });
  } catch (error) {
    return fail(res, 500, error.message || "Could not update coach");
  }
}

async function deleteCoach(req, res) {
  if (!objectId(req.params.id)) return fail(res, 400, "Invalid coach");
  if (await FacilitySportConfig.exists({ "slots.coach": req.params.id })) {
    return fail(res, 409, "This coach is assigned to one or more facility slots");
  }
  const coach = await Instructor.findByIdAndDelete(req.params.id);
  if (!coach) return fail(res, 404, "Coach not found");
  await User.updateOne({ _id: coach.userId }, { $set: { IsActive: 0 } });
  return res.json({ data: { id: req.params.id }, rcode: 200 });
}

module.exports = {
  listFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
  listSports,
  createSport,
  updateSport,
  deleteSport,
  listCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
};
