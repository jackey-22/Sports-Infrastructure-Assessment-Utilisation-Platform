const UserModel = require("../Model/UsersModel");
const DistrictModel = require("../Model/DistrictsModel");
const SportComplexModel = require("../Model/SportsComplexModel");
const sendMail = require("../sendEmail");
const InstructorModel = require("../Model/instructorModel");
const athleteModel = require("../Model/athleteModel");
const { default: mongoose } = require("mongoose");
const {
  hashPassword,
  verifyPassword,
  isHashed,
  safeEqual,
} = require("../Utils/password");
const { signAccessToken } = require("../Utils/tokens");
const { ROLE } = require("../Utils/roles");
const { sanitizeFilters } = require("../Utils/scope");
require("dotenv").config();

const SIGNUP_ROLES = Object.values(ROLE);
const MIN_PASSWORD_LENGTH = 8;

function sanitizeUser(user) {
  if (!user) return user;
  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete plain.Password;
  return plain;
}

function isSignupAllowed(actor, requestedRole) {
  if (requestedRole === ROLE.ATHLETE) return true;
  if (!actor) return false;
  if (actor.Role === ROLE.ADMIN) return true;
  if (actor.Role === ROLE.AUTHORITY) return requestedRole === ROLE.MANAGER;
  if (actor.Role === ROLE.MANAGER) {
    return requestedRole === ROLE.SUPERVISOR || requestedRole === ROLE.COACH;
  }
  return false;
}

function buildUserPayload(body, requestedRole, passwordHash) {
  return {
    Name: body.Name,
    Email: body.Email,
    ContactNum: body.ContactNum,
    DOB: body.DOB,
    Role: requestedRole,
    IsActive: 1,
    DistrictId: body.DistrictId,
    SportComplexId: body.SportComplexId,
    Password: passwordHash,
  };
}

module.exports.signup = async function (req, res) {
  try {
    const body = req.body || {};
    const actor = req.user;
    const requestedRole = Number(body.Role);

    if (!SIGNUP_ROLES.includes(requestedRole)) {
      return res
        .status(400)
        .json({ data: "", msg: "Invalid role", rcode: -9 });
    }
    if (typeof body.Email !== "string" || body.Email.trim() === "") {
      return res
        .status(400)
        .json({ data: "", msg: "Email is required", rcode: -9 });
    }
    if (!isSignupAllowed(actor, requestedRole)) {
      return res.status(403).json({
        data: "",
        msg: "You cannot create a user with this role",
        rcode: -10,
      });
    }

    const existing = await UserModel.findOne({ Email: body.Email });
    if (existing) {
      return res
        .status(409)
        .json({ data: "", msg: "Email already registered", rcode: -9 });
    }

    // Citizens choose their own password; staff accounts receive a generated one.
    let passwordPlain;
    if (requestedRole === ROLE.ATHLETE) {
      if (
        typeof body.Password !== "string" ||
        body.Password.length < MIN_PASSWORD_LENGTH
      ) {
        return res.status(400).json({
          data: "",
          msg: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          rcode: -9,
        });
      }
      passwordPlain = body.Password;
    } else {
      passwordPlain = sendMail.passwordGenerate(8);
    }

    const userData = buildUserPayload(
      body,
      requestedRole,
      hashPassword(passwordPlain)
    );

    // Scope staff creation to the creator's own district / complex.
    if (actor && actor.Role === ROLE.AUTHORITY) {
      userData.DistrictId = actor.DistrictId;
    }
    if (actor && actor.Role === ROLE.MANAGER) {
      userData.SportComplexId = actor.SportComplexId;
    }
    if (actor && actor.Role === ROLE.AUTHORITY && requestedRole === ROLE.MANAGER) {
      const complex = await SportComplexModel.findOne({
        _id: body.SportComplexId,
      });
      if (!complex || String(complex.district) !== String(actor.DistrictId)) {
        return res.status(403).json({
          data: "",
          msg: "Selected facility is outside your district",
          rcode: -10,
        });
      }
    }

    let User = new UserModel(userData);
    let data = await User.save();

    if (requestedRole !== ROLE.ATHLETE) {
      sendMail.sendEmail(userData.Email, passwordPlain);
    }

    if (requestedRole === ROLE.AUTHORITY) {
      const district = await DistrictModel.findOne({ _id: data.DistrictId });
      if (district) {
        district.authorityID = new mongoose.Types.ObjectId(data._id);
        await district.save();
      }
    } else if (requestedRole === ROLE.MANAGER) {
      const sportComplex = await SportComplexModel.findOne({
        _id: data.SportComplexId,
      });
      if (sportComplex) {
        sportComplex.manager = new mongoose.Types.ObjectId(data._id);
        await sportComplex.save();
      }
    } else if (requestedRole === ROLE.COACH) {
      const instructor = new InstructorModel({
        SportComplexId: data.SportComplexId,
        userId: data._id,
        createdBy: actor ? actor._id : data._id,
        sports: Array.isArray(body.sports) ? body.sports : [],
      });
      const instructorData = await instructor.save();
      return res.json({
        data: { data2: instructorData, data: sanitizeUser(data) },
        msg: "User Added(role:2)",
        rcode: 200,
      });
    } else if (requestedRole === ROLE.ATHLETE) {
      const photo = typeof body.photo === "string" ? body.photo : "";
      // Only a plain filename may be stored; paths are rejected to prevent
      // traversal through the later profile-photo URL.
      const candidate = photo.split("/").pop();
      const myPhotoName = /^[A-Za-z0-9._-]+$/.test(candidate) ? candidate : "";
      const athlete = new athleteModel({
        address: body.address,
        bloodGroup: body.bloodGroup,
        disability: body.disability,
        baseUrl: "./athletes/" + myPhotoName,
        isActive: 1,
        userId: data._id,
        emergencyNumber: body.emergencyNumber,
        healthIssue: body.healthIssue,
      });
      await athlete.save();
      return res.json({ rcode: 200, myPhotoName });
    }

    return res.json({
      data: sanitizeUser(data),
      msg: `User Added(role:${requestedRole})`,
      rcode: 200,
    });
  } catch (error) {
    console.error("Signup failed:", error.message);
    return res
      .status(500)
      .json({ data: "", msg: "Could not create user", rcode: -9 });
  }
};

module.exports.login = async function (req, res) {
  try {
    const { Email, Password, notificationtoken } = req.body || {};
    if (
      typeof Email !== "string" ||
      typeof Password !== "string" ||
      Email.length === 0 ||
      Password.length === 0
    ) {
      return res
        .status(400)
        .json({ data: "", msg: "Email and password are required", rcode: -9 });
    }

    const user = await UserModel.findOne({ Email }).select("+Password");
    if (!user) {
      return res
        .status(401)
        .json({ data: "", msg: "Invalid credentials", rcode: -9 });
    }

    let passwordMatches = false;
    if (isHashed(user.Password)) {
      passwordMatches = verifyPassword(Password, user.Password);
    } else if (typeof user.Password === "string" && user.Password.length > 0) {
      // Legacy plaintext record: verify, then replace it with a hash.
      passwordMatches = safeEqual(Password, user.Password);
      if (passwordMatches) {
        const newHash = hashPassword(Password);
        // Conditional update keeps concurrent logins from corrupting the value.
        await UserModel.updateOne(
          { _id: user._id, Password: user.Password },
          { $set: { Password: newHash } }
        );
        user.Password = newHash;
      }
    }

    if (!passwordMatches || user.IsActive === 0) {
      return res
        .status(401)
        .json({ data: "", msg: "Invalid credentials", rcode: -9 });
    }

    if (notificationtoken) {
      user.notificationtoken = notificationtoken;
      await user.save();
    }

    const accessToken = signAccessToken(user);
    return res.json({
      data: sanitizeUser(user),
      msg: "login done",
      token: accessToken,
      rcode: 200,
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res
      .status(500)
      .json({ data: "", msg: "Could not sign in", rcode: -9 });
  }
};

function scopedUserQuery(req) {
  const query = sanitizeFilters(req.query, [
    "_id",
    "Email",
    "Name",
    "Role",
    "DistrictId",
    "SportComplexId",
  ]);
  if (req.user.Role === ROLE.AUTHORITY) {
    query.DistrictId = req.user.DistrictId || null;
  } else if (req.user.Role === ROLE.MANAGER) {
    query.SportComplexId = req.user.SportComplexId || null;
  }
  return query;
}

module.exports.getUser = function (req, res) {
  UserModel.find(scopedUserQuery(req))
    .then((data) => {
      res.json({ data: data, msg: "User Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve users", rcode: -9 });
    });
};

module.exports.getUserWithDistrict = function (req, res) {
  UserModel.find(scopedUserQuery(req))
    .populate("DistrictId")
    .then((data) => {
      res.json({ data: data, msg: "User Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve users", rcode: -9 });
    });
};

module.exports.getUserWithSportsComplex = function (req, res) {
  UserModel.find(scopedUserQuery(req))
    .populate("SportComplexId")
    .then((data) => {
      res.json({ data: data, msg: "User Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve users", rcode: -9 });
    });
};

module.exports.getUserWithDistrictandSportsComplex = function (req, res) {
  UserModel.find(scopedUserQuery(req))
    .populate("SportComplexId")
    .populate("DistrictId")
    .then((data) => {
      res.json({ data: data, msg: "User Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve users", rcode: -9 });
    });
};

module.exports.uploadPhoto = async (req, res) => {
  res.json({ rcode: 200, filename: req.savedPhotoName });
};

module.exports.athleteDetail = async function (req, res) {
  try {
    const filters = sanitizeFilters(req.query, ["_id", "Email", "Name", "Role"]);
    // Citizens may only look up their own account.
    if (req.user.Role === ROLE.ATHLETE) {
      filters._id = req.user._id;
    }
    const data = await UserModel.findOne(filters);

    if (data != null) {
      const athleteDetail = await athleteModel.find({ userId: data._id });
      return res.json({
        data: data,
        athleteDetail: athleteDetail,
        msg: "User Retrieved",
        rcode: 200,
      });
    }
    return res.json({ rcode: -9 });
  } catch (error) {
    return res
      .status(500)
      .json({ data: "", msg: "Could not retrieve user", rcode: -9 });
  }
};
