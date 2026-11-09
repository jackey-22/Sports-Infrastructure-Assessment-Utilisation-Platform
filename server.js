const express = require("express");
const multer = require("multer");
const ejs = require("ejs");
const cron = require("node-cron");
require("dotenv").config();

const {
  authenticate,
  optionalAuthenticate,
  requireRole,
  ROLE,
} = require("./Middleware/auth.middleware");
const { isPublicRoute } = require("./Utils/publicRoutes");
const { createCorsMiddleware } = require("./Utils/cors");
const { PURPOSE, signChartToken, verifyChartToken } = require("./Utils/chartTokens");
const {
  canAccessComplex,
  canAccessAthleteId,
  complexFilter,
  sanitizeFilters,
} = require("./Utils/scope");

const UserRoute = require("./Routes/UserRoutes");
const SportController = require("./Controller/SportController");
const decodedToken = require("./Controller/DecodeToken");
const SportDataController = require("./Controller/SportDataController");
const DistrictController = require("./Controller/DistrictController");
const SportsComplexController = require("./Controller/SportsComplexController");
const UserController = require("./Controller/UserController");
const AthleteController = require("./Controller/AthleteController");
const InstructorController = require("./Controller/InstructorController");
const AthleteImageController = require("./Controller/AthleteImageController");
const PaymentController = require("./Controller/PaymentController");
const RatingController = require("./Controller/RatingController");
const ComplaintController = require("./Controller/ComplaintController");
const SessionController = require("./Controller/SessionConroller");
const SupervisorController = require("./Controller/SupervisorController");
const AuthorityController = require("./Controller/AuthorityController");
const AdminController = require("./Controller/AdminController");
const ComplaintTypeController = require("./Controller/ComplaintTypeController");
const ComplaintImageController = require("./Controller/ComplainImageController");
const SportComplexeImageController = require("./Controller/SportComplexImageController");
const SupervisorDashboardController = require("./Controller/SupervisorDashboardController");
const UpdatesController = require("./Controller/UpdatesController");
const UpdatesImageController = require("./Controller/UpdatesImageController");
const UtilizationController = require("./Controller/UtilizationController");
const GuestController = require("./Controller/GuestController");
const FacilityAssessmentController = require("./Controller/FacilityAssessmentController");
const OnlinePaymentRouter = require("./Routes/OnlinePaymentRoute");

const {
  filtersportsforcomplex,
} = require("./Controller/FilterSportsForComplex");

const bodyParser = require("body-parser");
const athleteRatingModel = require("./Model/athleteRatingModel");
const athleteModel = require("./Model/athleteModel");
const instructorModel = require("./Model/instructorModel");
const {
  getAuthorityComplaint,
} = require("./Controller/AuthorityComplaintController");
const { sendPushNotification } = require("./PushNotification");
const Reminder = require("./Model/Reminder");
const { setReminder } = require("./SetReminder");
const app = express();

// Reverse proxies must be declared explicitly. Leaving this unset keeps the
// direct socket address as req.ip, which is the safe default.
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set(
    "trust proxy",
    value === "true" ? true : value === "false" ? false : value
  );
}

//middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(createCorsMiddleware());

// Default-deny authentication gate. Only routes explicitly listed as public in
// Utils/publicRoutes.js are reachable without a valid access token.
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  if (isPublicRoute(req.method, req.path)) return next();
  if (req.method === "POST" && req.path === "/signup") {
    // Anonymous citizens may register; staff callers are identified if a token exists.
    return optionalAuthenticate(req, res, next);
  }
  return authenticate(req, res, next);
});

app.set("view engine", "ejs");

function sendChartForbidden(res) {
  return res
    .status(403)
    .json({ data: "", msg: "Chart access is invalid or expired", rcode: -10 });
}

// Issues a short-lived token for the WebView chart URLs. The chart pages stay
// outside the bearer-token gate because WebView navigations cannot send an
// Authorization header, but they now require a scoped token in the URL.
app.post("/chartToken", async (req, res) => {
  try {
    const body = req.body || {};
    const athleteId = body.athleteId;
    const sportId = body.sportId;
    const opponentAthleteId = body.opponentAthleteId;
    const purpose =
      body.type === PURPOSE.COMPARATIVE || opponentAthleteId
        ? PURPOSE.COMPARATIVE
        : PURPOSE.PERFORMANCE;

    if (!athleteId || !sportId) {
      return res
        .status(400)
        .json({ data: "", msg: "athleteId and sportId are required", rcode: -9 });
    }

    const athlete = await canAccessAthleteId(req.user, athleteId);
    if (!athlete) {
      return res.status(403).json({
        data: "",
        msg: "Athlete is outside your scope",
        rcode: -10,
      });
    }

    const claims = {
      purpose,
      athleteId: String(athleteId),
      sportId: String(sportId),
    };

    if (purpose === PURPOSE.COMPARATIVE) {
      if (!opponentAthleteId || String(opponentAthleteId) === String(athleteId)) {
        return res.status(400).json({
          data: "",
          msg: "A different opponentAthleteId is required",
          rcode: -9,
        });
      }
      const opponent = await athleteModel
        .findById(opponentAthleteId)
        .select("_id");
      if (!opponent) {
        return res
          .status(404)
          .json({ data: "", msg: "Opponent athlete not found", rcode: 404 });
      }
      // Staff comparisons stay inside their facility/district. Athletes may
      // compare against leaderboard peers, which is the existing product flow.
      if (
        req.user.Role !== ROLE.ATHLETE &&
        !(await canAccessAthleteId(req.user, opponentAthleteId))
      ) {
        return res.status(403).json({
          data: "",
          msg: "Opponent athlete is outside your scope",
          rcode: -10,
        });
      }
      claims.opponentAthleteId = String(opponentAthleteId);
    }

    return res.json({
      token: signChartToken(claims),
      rcode: 200,
    });
  } catch (error) {
    console.error("Chart token issuance failed:", error.message);
    return res
      .status(500)
      .json({ data: "", msg: "Could not issue chart token", rcode: -9 });
  }
});

app.get("/athelteperformance/:athleteid/:sportid", async (req, res) => {
  try {
    verifyChartToken(req.query.token, {
      purpose: PURPOSE.PERFORMANCE,
      athleteId: req.params.athleteid,
      sportId: req.params.sportid,
    });
  } catch (error) {
    return sendChartForbidden(res);
  }

  let athelteid = req.params.athleteid;
  let sportid = req.params.sportid;
  let analysis = await AthleteController.getParameterSum(sportid, athelteid);

  res.render("chart", { analysis });
});
app.get(
  "/comparativeathelteperformance/:athleteid/:opponentathelteid/:sportid",
  async (req, res) => {
    try {
      verifyChartToken(req.query.token, {
        purpose: PURPOSE.COMPARATIVE,
        athleteId: req.params.athleteid,
        opponentAthleteId: req.params.opponentathelteid,
        sportId: req.params.sportid,
      });
    } catch (error) {
      return sendChartForbidden(res);
    }

    let athelteid = req.params.athleteid;
    let opponentathelteid = req.params.opponentathelteid;
    let sportid = req.params.sportid;
    let analysis = [];
    let atheltedata = await AthleteController.getParameterSum(
      sportid,
      athelteid
    );
    analysis.push({ currentathelte: atheltedata });

    let opponentdata = await AthleteController.getParameterSum(
      sportid,
      opponentathelteid
    );
    analysis.push({ opponentdata: opponentdata });
    res.render("comparativechart", { analysis });
  }
);
//UserRoutes
app.use("/", UserRoute);
app.post("/verify", decodedToken.decodedToken);
app.get(
  "/getuser",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UserController.getUser
);
app.get(
  "/getuserwithdistrict",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UserController.getUserWithDistrict
);
app.get(
  "/getuserwithsportscomplex",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UserController.getUserWithSportsComplex
);
app.get(
  "/getuserwithdistrictwithcomplex",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UserController.getUserWithDistrictandSportsComplex
);
app.get("/getuserwithathelte", UserController.athleteDetail);

//Sport routes
app.post(
  "/sport",
  requireRole(ROLE.ADMIN),
  SportController.upload.single("picture"),
  SportDataController.AddSport
);
app.get("/getSports", SportDataController.getSport);

//updates,news,achievements
app.post(
  "/addUpdates",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  UpdatesImageController.upload.single("image"),
  UpdatesController.addUpdates
);
app.get("/getUpdates", UpdatesController.getUpdates);
app.get("/getUpdatesForAthlete", UpdatesController.getUpdatesForAthlete);
app.patch(
  "/updateUpdates/:id",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  UpdatesController.updateUpdates
);

//District routes
app.post("/addDistrict", requireRole(ROLE.ADMIN), DistrictController.addDistrict);
app.get("/getDistrict", DistrictController.getDistrict);

//Sports Complex routes
app.post(
  "/addSportsComplex",
  requireRole(ROLE.ADMIN),
  SportComplexeImageController.upload.single("picture"),
  SportsComplexController.AddSportsComplex
);
app.get("/getSportsComplex", SportsComplexController.getSportsComplex);
app.get(
  "/getSportsComplexwithmanager",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  SportsComplexController.getSportsComplexwithmanager
);
app.get(
  "/getSportsComplexwithsport",
  SportsComplexController.getSportsComplexwithSportName
);
app.get(
  "/getSportsComplexwithdistrict",
  SportsComplexController.getSportsComplexwithdistrict
);
app.get(
  "/getSportsComplexwithmanagerwithdistrict",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  SportsComplexController.getSportsComplexwithmanagerwithdistrict
);
app.get("/searchSportsComplex", SportsComplexController.SearchComplex);

// Counts for Supervisor Dashboard (App)

app.get(
  "/SupervisorDasboardCount",
  requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.ADMIN),
  SupervisorDashboardController.SupervisorDasboardCount
);

app.patch(
  "/updateSportsComplex/:id",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  SportController.upload.array("images"),
  SportsComplexController.updateSportsComplex
);
app.get("/getComplexFromSport", SportsComplexController.sportsComplexOfSport);
app.get("/sportsComplexDetail", SportsComplexController.SportsComplexDetail);

//athlete routes
app.post(
  "/addAthlete",
  requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.ADMIN),
  AthleteImageController.upload.single("picture"),
  AthleteController.addAthlete
);
app.get("/getAthletes", AthleteController.getAthlete);
app.get("/getAthleteWithGoals", AthleteController.getAthleteWithGoals);
app.get("/getAthletesWithRating", AthleteController.getAthletewithRating);
app.get(
  "/getAthletesWithAllRating",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  AthleteController.getAthletesWithAllRating
);
app.get(
  "/getAthletesWithAllSportsRating",
  AthleteController.getAthletesWithAllSportsRating
);
app.get(
  "/getAthleteswithsupervisor",
  AthleteController.getAthletewithsupervisor
);
app.get("/getAthleteswithpayments", AthleteController.getAthletewithpayments);
app.get(
  "/getAthleteswithpaymentswithsupervisor",
  AthleteController.getAthletewithpaymentswithsupervisor
);
app.patch("/updateAthlete/:id", AthleteController.updateAthlete);

app.patch("/goalOfAthlete", AthleteController.goalOfAthletes);
app.patch("/updatedAchievedStatus", AthleteController.achieveOfAthletes);

//Instructor routes
app.post(
  "/addInstructor",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  InstructorController.addInstructor
);
app.get("/getInstructors", InstructorController.getInstructor);
app.get(
  "/getInstructorswithuser",
  InstructorController.getInstructorwithUserName
);
app.get(
  "/getInstructorswithsport",
  InstructorController.getInstructorwithSportsName
);
app.get("/getInstructorswithall", InstructorController.getInstructorwithAll);
app.patch(
  "/updateInstructors/:id",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  InstructorController.updateInstructor
);
app.get(
  "/CountForInstructer",
  requireRole(ROLE.COACH, ROLE.MANAGER, ROLE.ADMIN),
  InstructorController.CountForInstructer
);

//payment routes
app.post(
  "/paymentdetail",
  requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.ADMIN),
  PaymentController.addPayment
);
app.get("/getPaymentDetails", PaymentController.getAllPayments);
app.get(
  "/getPaymentDetailswithsportwithinstructor",
  PaymentController.getAllPaymentswithsportwithinstructor
);
app.patch(
  "/updatePaymentDetails/:id",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  PaymentController.updatePayment
);
app.get(
  "/countOfPayment",
  PaymentController.CountOFAllPaymentswithsportwithinstructor
);

//Rating routes
app.post("/addRating", requireRole(ROLE.ATHLETE), RatingController.addRating);
app.get("/getAllRatings", RatingController.getAllRatings);

//Complaint routes
const photoStorage = multer.diskStorage({
  destination: "./public/complaints",
  filename: (req, file, cb) => {
    console.log(file.originalname);
    cb(null, file.originalname);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 15000000 },
});
app.post("/complaintPhoto", uploadPhoto.single("photo"), (req, res) => {
  res.json({ rcode: 200 });
});
app.post(
  "/addComplaint",
  ComplaintImageController.upload.single("picture"),
  ComplaintController.addComplaint
);
app.post("/addComplaintApp", ComplaintController.addComplaintApp);
app.get("/getAllComplaints", ComplaintController.getAllComplaints);
app.patch(
  "/updateComplaint/:id",
  requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  ComplaintController.updateComplaint
);
//
app.patch(
  "/updateComplaintAthleteResponse/:id",
  ComplaintController.updateComplaintAthleteResponse
);
app.get(
  "/getAuthorityComplaint",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  getAuthorityComplaint
);
app.get(
  "/getAllComplaintsAdmin",
  requireRole(ROLE.ADMIN),
  ComplaintController.getAllComplaintsAdmin
);
//Complaint Types
app.post(
  "/addComplaintType",
  requireRole(ROLE.ADMIN),
  ComplaintTypeController.addComplaintType
);
app.get("/getComplaintType", ComplaintTypeController.getComplainttype);
app.get(
  "/getComplaintsAdmin",
  requireRole(ROLE.ADMIN),
  ComplaintController.getComplaintsAdmin
);

//Authority details
app.get(
  "/AuthorityDetails",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  AuthorityController.getDetails
);
app.get(
  "/getSportsCount",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  AuthorityController.getSportsCount
);

//Admin Routes
app.get("/AdminViewDetails", requireRole(ROLE.ADMIN), AdminController.AdminViewDetails);
app.get(
  "/sportDetailOfComplex",
  requireRole(ROLE.ADMIN),
  AdminController.sportDetailOfComplex
);
app.get(
  "/atheleteInSportsComplex",
  requireRole(ROLE.ADMIN),
  AdminController.atheleteInSportsComplex
);

//session routes

// app.get("/getSession", SessionController.getSession);
app.post("/addSession/:id", SessionController.addSession);
app.get(
  "/getSession",
  requireRole(
    ROLE.ATHLETE,
    ROLE.SUPERVISOR,
    ROLE.COACH,
    ROLE.MANAGER,
    ROLE.AUTHORITY,
    ROLE.ADMIN
  ),
  SessionController.getSession
);
app.get(
  "/filtersport/:id",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  filtersportsforcomplex
);
app.patch("/updateSportsInSession", SessionController.updateSportsInSession);
app.get(
  "/attendanceSportWise",
  requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  SessionController.attendanceSportWise
);

app.get("/getInstructorForPayment", requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.ADMIN), SupervisorController.getInstructorForPayment);
app.get("/paymentHistoryAthlete", PaymentController.getAthletePayments);
// app.patch("/updates",SessionController.updates)

// app.get(
//   "/atheleteCountbyInstructer",
//   InstructorController.atheleteCountbyInstructer
// );

// app.get("/complaintCount", InstructorController.complaintCount);

// app.get(
//   "/supervisorDashboard",
//   SupervisorDashboardController.SportsComplexDetail
// );

//utilizationRoutes
app.get(
  "/timeSlotUtilization",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.timeSlotUtilization
);
app.get(
  "/sportCapacityUtilization",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.sportCapacityUtilization
);
app.get(
  "/ComplaintsAnalysis",
  requireRole(ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.ComplaintsAnalysis
);
app.get(
  "/monthWiseEnroll",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.monthWiseEnroll
);
app.get(
  "/DistrictWiseSportsComplex",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.DistrictWiseSportsComplex
);
app.get(
  "/agewiseSportCount",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.agewiseSportCount
);
app.get(
  "/agegrpCount",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.agegrpCount
);
app.get(
  "/rating",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.ratingWiseTop5
);
app.get(
  "/sportRatingWiseTop5",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.sportRatingWiseTop5
);
app.get(
  "/monthWiseEventCount",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.monthWiseEventCount
);
app.get(
  "/monthWiseComplainCount",
  requireRole(ROLE.AUTHORITY, ROLE.ADMIN),
  UtilizationController.monthWiseComplainCount
);
app.post(
  "/getAtheleteIdFromPayment",
  requireRole(ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.ADMIN),
  UtilizationController.getAtheleteIdFromPayment
);

app.post("/remarkRatingByAthlete", requireRole(ROLE.ATHLETE), async (req, res) => {
  let {
    sportId,
    athleteId,
    sportComplexId,
    remarks,
    parameters,
    instructorId,
  } = req.body;

  const ownAthlete = await athleteModel.findOne({
    _id: athleteId,
    userId: req.user._id,
  });
  if (!ownAthlete) {
    return res
      .status(403)
      .json({ data: "", msg: "Athlete is outside your scope", rcode: -10 });
  }

  let rating = new athleteRatingModel({
    athleteId,
    remarks,
    sport: sportId,
    sportComplex: sportComplexId,
    parameters,
    instructorId,
  });
  await rating.save();

  res.json({ rcode: 200 });
});
// app.get("/ratingForSupervisor", async (req, res) => {
//   let { sportComplexId } = req.query;
//   let ratings = await athleteRatingModel
//     .find({
//       sportComplex: sportComplexId,
//       isEvaluated: 0,
//     })
//     .populate("athleteId")
//     .sort({ rating: -1 });
//   res.json({ rcode: 200, ratings });
// });

app.get(
  "/ratingForInstructor",
  requireRole(ROLE.COACH, ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  async (req, res) => {
    const instructorId = sanitizeFilters(req.query, ["instructorId"]).instructorId;
    if (!instructorId) {
      return res
        .status(400)
        .json({ data: "", msg: "instructorId is required", rcode: -9 });
    }
    const instructor = await instructorModel.findById(instructorId);
    if (!instructor) {
      return res
        .status(404)
        .json({ data: "", msg: "Instructor not found", rcode: 404 });
    }
    if (req.user.Role === ROLE.COACH) {
      const own = await instructorModel.findOne({ userId: req.user._id });
      if (!own || String(own._id) !== String(instructor._id)) {
        return res.status(403).json({
          data: "",
          msg: "Ratings are outside your scope",
          rcode: -10,
        });
      }
    } else if (!(await canAccessComplex(req.user, instructor.SportComplexId))) {
      return res.status(403).json({
        data: "",
        msg: "Ratings are outside your scope",
        rcode: -10,
      });
    }

    let ratings = await athleteRatingModel
      .find({
        instructorId: instructorId,
        isEvaluated: 0,
      })
      .populate({
        path: "athleteId",
        populate: {
          path: "userId",
        },
      })
      .populate("sport")
      .sort({ rating: -1 });
    res.json({ rcode: 200, ratings });
  }
);
app.get(
  "/ratingForAll",
  requireRole(ROLE.SUPERVISOR, ROLE.COACH, ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN),
  async (req, res) => {
    const query = await complexFilter(req.user, "sportComplex");
    if (req.user.Role === ROLE.COACH) {
      const own = await instructorModel.findOne({ userId: req.user._id });
      if (!own) return res.json({ rcode: 200, ratings: [] });
      query.instructorId = own._id;
    }
    let ratings = await athleteRatingModel
      .find(query)
      .populate({
        path: "athleteId",
        populate: {
          path: "userId",
        },
      })
      .sort({ rating: -1 });
    res.json({ rcode: 200, ratings });
  }
);
app.post(
  "/ratingByInstructor",
  requireRole(ROLE.COACH, ROLE.MANAGER, ROLE.ADMIN),
  async (req, res) => {
    let { ratingId, rating } = req.body;
    let ratings = await athleteRatingModel
      .findOne({ _id: ratingId })
      .populate("athleteId");
    if (!ratings) {
      return res
        .status(404)
        .json({ data: "", msg: "Rating not found", rcode: 404 });
    }
    if (req.user.Role === ROLE.COACH) {
      const instructor = await instructorModel.findOne({ userId: req.user._id });
      if (
        !instructor ||
        String(ratings.instructorId) !== String(instructor._id)
      ) {
        return res.status(403).json({
          data: "",
          msg: "Rating is outside your scope",
          rcode: -10,
        });
      }
    } else if (!(await canAccessComplex(req.user, ratings.sportComplex))) {
      return res.status(403).json({
        data: "",
        msg: "Rating is outside your scope",
        rcode: -10,
      });
    }
    ratings.isEvaluated = 1;
    ratings.rating = rating;
    await ratings.save();
    if (ratings.athleteId.userId) {
      setReminder(
        Date.now(),
        "Check your leaderboard",
        "Your Daily Response Noted",
        [ratings.athleteId.userId]
      );
    }
    res.json({ rcode: 200 });
  }
);
app.get("/averageUserRating", async (req, res) => {
  const q = sanitizeFilters(req.query, ["userId", "sportId"]);
  if (!q.userId) {
    return res
      .status(400)
      .json({ data: "", msg: "userId is required", rcode: -9 });
  }
  const athlete = await canAccessAthleteId(req.user, q.userId);
  if (!athlete) {
    return res.status(403).json({
      data: "",
      msg: "Athlete is outside your scope",
      rcode: -10,
    });
  }
  let rating = await averageRating(q.userId, q.sportId);
  res.json({ rating, rcode: 200 });
});
async function averageRating(userId, sportId) {
  let ratings = await athleteRatingModel.find({
    athleteId: userId,
    sport: sportId == null ? { $exists: true } : sportId,
    isEvaluated: 1,
  });
  let total = ratings.length;
  let total2 = 0;
  ratings.forEach((ele) => {
    total2 += ele.rating;
  });
  return total2 / total;
}

async function sendDueReminders() {
  console.log("run");
  let today = new Date();
  let reminder = await Reminder.find({
    issent: 0,
    date: { $lt: today },
  }).populate({ path: "userIds", select: { notificationtoken: 1 } });
  for (let index = 0; index < reminder.length; index++) {
    const element = reminder[index];
    await sendPushNotification(
      element.userIds.map((ele) => ele.notificationtoken),
      element.title,
      element.message
    );
    element.issent = 1;
    element.save();
  }
}

// Only the long-running server process should schedule reminders. Importing
// the app (for tests or tooling) must not leave a timer running.
if (require.main === module) {
  cron.schedule("*/1 * * * *", sendDueReminders);
}

//Guest route
app.post("/addGuest", GuestController.addUser);
app.get(
  "/getGuest",
  requireRole(
    ROLE.SUPERVISOR,
    ROLE.COACH,
    ROLE.MANAGER,
    ROLE.AUTHORITY,
    ROLE.ADMIN
  ),
  GuestController.getAllUsers
);
app.get("/gettimeslotforguest", GuestController.gettimeslotfrominstructor);
app.get("/getPaymentTimeslotCount", PaymentController.getPaymentTimeslotCount);

app.use("/onlinepayment", OnlinePaymentRouter);

app.get(
  "/api/manager/facility",
  requireRole(ROLE.MANAGER),
  FacilityAssessmentController.assignedFacility
);
app.get(
  "/api/manager/assessments",
  requireRole(ROLE.MANAGER),
  FacilityAssessmentController.list
);
app.get(
  "/api/manager/assessments/:id",
  requireRole(ROLE.MANAGER, ROLE.ADMIN),
  FacilityAssessmentController.getOne
);
app.post(
  "/api/manager/assessments/analyse",
  requireRole(ROLE.MANAGER),
  FacilityAssessmentController.analysisRateLimiter,
  FacilityAssessmentController.receiveAssessmentPhotos,
  FacilityAssessmentController.analyse
);
app.post(
  "/api/manager/assessments",
  requireRole(ROLE.MANAGER),
  FacilityAssessmentController.createAssessment
);
app.get(
  "/api/admin/assessments",
  requireRole(ROLE.ADMIN),
  FacilityAssessmentController.adminList
);

// Exposed for tests and operational inspection.
app.locals.loginRateLimiter = UserRoute.loginRateLimiter;
app.locals.uploadRateLimiter = UserRoute.uploadRateLimiter;

if (require.main === module) {
  require("./config/dbconfig").getDbConnetion();
  const port = Number(process.env.PORT) || 9999;
  app.listen(port, () => console.log(`server started at ${port}`));
}

module.exports = app;
