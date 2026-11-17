const PaymentModel = require("../Model/PaymentModel");
const { setReminder } = require("../SetReminder");
const athleteModel = require("./../Model/athleteModel");
const SportsComplexModel = require("./../Model/SportsComplexModel");
const SportComplex = require("./../Model/SportsComplexModel");
const mongoose = require("mongoose");
const { ROLE } = require("../Utils/roles");
const {
  sanitizeFilters,
  canAccessComplex,
  canAccessAthlete,
  districtComplexIds,
} = require("../Utils/scope");

async function paymentScope(user) {
  if (!user) return { _id: null };
  if (user.Role === ROLE.ADMIN) return {};
  if (user.Role === ROLE.ATHLETE) {
    const athletes = await athleteModel
      .find({ userId: user._id })
      .select("_id")
      .lean();
    return { athleteId: { $in: athletes.map((a) => a._id) } };
  }
  if (user.Role === ROLE.AUTHORITY) {
    return {
      sportsComplexId: { $in: await districtComplexIds(user.DistrictId) },
    };
  }
  return { sportsComplexId: user.SportComplexId || null };
}

module.exports.addPayment = async function (req, res) {
  try {
    const body = {};
    [
      "sports",
      "athleteId",
      "duration",
      "instructorId",
      "timeSlot",
      "from",
      "sportsComplexId",
    ].forEach((key) => {
      if (req.body[key] !== undefined) body[key] = req.body[key];
    });
    body.paymentTakenBy = req.user._id;
    if ([ROLE.SUPERVISOR, ROLE.COACH, ROLE.MANAGER].includes(req.user.Role)) {
      body.sportsComplexId = req.user.SportComplexId;
    }

    const athlete = await athleteModel.findById(body.athleteId);
    if (!athlete) {
      return res
        .status(404)
        .json({ data: "", msg: "Athlete not found", rcode: 404 });
    }
    if (!(await canAccessAthlete(req.user, athlete))) {
      return res.status(403).json({
        data: "",
        msg: "Athlete is outside your scope",
        rcode: -10,
      });
    }

    let data = await new PaymentModel(body).save();
    athlete.createdBy = req.user._id;
    athlete.payments.push(data._id);
    let data1 = await athlete.save();
    if (athlete.userId) {
      setReminder(
        Date.now(),
        "Congratulations!!!",
        "You are Added in Sports Complex",
        [athlete.userId]
      );
    }
    return res.json({
      data: data,
      data1: data1,
      msg: "Payment Generated",
      rcode: 200,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ data: "", msg: "Could not add payment", rcode: -9 });
  }
};

module.exports.getAllPayments = async function (req, res) {
  const filters = sanitizeFilters(req.query, [
    "_id",
    "athleteId",
    "sportsComplexId",
    "sports",
    "instructorId",
  ]);
  const scope = await paymentScope(req.user);
  PaymentModel.find({ ...filters, ...scope })
    .then((data) => {
      res.json({ data: data, msg: "Payment Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve payments", rcode: -9 });
    });
};

module.exports.getAllPaymentswithsportwithinstructor = async function (
  req,
  res
) {
  const convertMonthsToDays = (months, startdate) => {
    // Get the current date

    const today = new Date();
    // Calculate future date based on months
    const futureDate = new Date(startdate);
    futureDate.setMonth(startdate.getMonth() + months);

    let timeDifference;
    // Calculate the difference in milliseconds
    if (startdate.getTime() - today.getTime() > 0) {
      timeDifference = futureDate - startdate;
    } else {
      timeDifference = futureDate - today;
    }

    // Convert milliseconds to days
    const days = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    console.log(days);
    return days;
  };

  const filters = sanitizeFilters(req.query, [
    "_id",
    "athleteId",
    "sportsComplexId",
    "sports",
    "instructorId",
  ]);
  const scope = await paymentScope(req.user);
  const d = await PaymentModel.find({ ...filters, ...scope })
    .populate("sports")
    .populate({
      path: "instructorId",
      populate: {
        path: "userId",
      },
    });
  const data = d.filter(
    (obj) => convertMonthsToDays(obj.duration, obj.from) >= 0
  );
  res.json({ data: data, msg: "Payment Retrived", rcode: 200 });
};

// .populate("instructorId")
// .populate("instructorId.userId")

module.exports.updatePayment = async function (req, res) {
  const id = req.params.id;
  let Payment = await PaymentModel.findOne({ _id: id });
  if (!Payment) {
    return res
      .status(404)
      .json({ data: "", msg: "Payment not found", rcode: 404 });
  }
  if (!(await canAccessAthlete(req.user, {
    userId: null,
    SportComplexId: Payment.sportsComplexId,
  }))) {
    return res.status(403).json({
      data: "",
      msg: "Payment is outside your scope",
      rcode: -10,
    });
  }

  if (req.body.duration !== undefined) {
    Payment.duration = req.body.duration;
  }

  if (req.body.timeSlot !== undefined) {
    Payment.timeSlot = req.body.timeSlot;
  }

  try {
    let response = await Payment.save();
    res.json({
      data: response,
      msg: "payment updated successfully",
      rcode: 200,
    });
  } catch (error) {
    console.error(error);
    res.json({ data: error.msg, msg: "smw", rcode: -9 });
  }
};

module.exports.CountOFAllPaymentswithsportwithinstructor = async function (
  req,
  res
) {
  try {
    let sportsComplexId = req.query.sportsComplexId;
    if ([ROLE.SUPERVISOR, ROLE.COACH, ROLE.MANAGER].includes(req.user.Role)) {
      sportsComplexId = req.user.SportComplexId;
    }
    if (!sportsComplexId) {
      return res
        .status(400)
        .json({ data: "", msg: "sportsComplexId is required", rcode: -9 });
    }
    if (!(await canAccessComplex(req.user, sportsComplexId))) {
      return res.status(403).json({
        data: "",
        msg: "Facility is outside your scope",
        rcode: -10,
      });
    }
    let data = await PaymentModel.aggregate([
      {
        $match: {
          sportsComplexId: new mongoose.Types.ObjectId(sportsComplexId),
        },
      },
      {
        $group: {
          _id: "$athleteId", // Group by userId (athleteId)
          paymentCount: { $sum: 1 },
          payments: { $push: "$$ROOT" }, // Store the original payment documents in an array
        },
      },
      {
        $lookup: {
          from: "athletes", // The name of the "sports" collection
          localField: "payments.athleteId", // Field in the "payments" array
          foreignField: "_id", // Field in the "sports" collection
          as: "athleteData",
        },
      },
      {
        $lookup: {
          from: "users", // The name of the "sports" collection
          localField: "athleteData.userId", // Field in the "payments" array
          foreignField: "_id", // Field in the "sports" collection
          as: "userData",
        },
      },
      {
        $lookup: {
          from: "sports", // The name of the "sports" collection
          localField: "payments.sports", // Field in the "payments" array
          foreignField: "_id", // Field in the "sports" collection
          as: "sportsData",
        },
      },
      {
        $lookup: {
          from: "instructors", // The name of the "instructors" collection
          localField: "payments.instructorId", // Field in the "payments" array
          foreignField: "_id", // Field in the "instructors" collection
          as: "instructorData",
        },
      },
      {
        $project: {
          _id: 0, // Keep the original _id field
          athleteId: "$_id", // Create a new field named athleteId and assign the value of _id to it
          paymentCount: 1,
          sports: "$sportsData", // Include the sports data
          instructor: "$instructorData", // Include the instructor data
          athlete: "$athleteData",
          user: "$userData",
        },
      },
    ]);
    res.json({
      results: data.length,
      data: data,
      rcode: 200,
    });
  } catch (err) {
    console.log(err);
    res.json({
      err: err.msg,
      rcode: -9,
    });
  }
};

module.exports.getPaymentTimeslotCount = async (req, res) => {
  let sports = req.query.sports;
  let sportsComplex = req.query.sportsComplex;
  if ([ROLE.SUPERVISOR, ROLE.COACH, ROLE.MANAGER].includes(req.user.Role)) {
    sportsComplex = req.user.SportComplexId;
  }
  let timeSlotFrom = req.query.timeSlotFrom;
  let timeSlotTo = req.query.timeSlotTo;
  let payment = await PaymentModel.find({
    sportsComplexId: sportsComplex,
    sports: sports,
  });
  let capacity = await SportsComplexModel.findOne({
    _id: sportsComplex,
  }).lean();
  let mycap = 0;
  capacity.sports.forEach((ele) => {
    if (ele.sport.toString() == sports) {
      mycap = ele.capacity;
    }
  });
  // my cap maa capacity chhe
  let paymentdata = [];
  payment.forEach((ele) => {
    let date = new Date(ele.from);
    let day = date.getDate();
    let now = new Date();
    let nday = now.getDate();
    let nmonth = now.getMonth();
    let nyear = now.getFullYear();
    let duration = 30 * ele.duration;

    if (
      ele.timeSlot.from == timeSlotFrom &&
      ele.timeSlot.to == timeSlotTo &&
      (date - now) / 86400000 + duration > 0
    ) {
      paymentdata.push(ele);
    }
  });
  console.log(paymentdata.length);

  res.json({ data: mycap - paymentdata.length, rcode: 200 });
};

module.exports.getAthletePayments = async (req, res) => {
  let athleteId = req.query.athleteId;
  if (!athleteId) {
    return res
      .status(400)
      .json({ data: "", msg: "athleteId is required", rcode: -9 });
  }
  const athlete = await athleteModel.findById(athleteId);
  if (!athlete) {
    return res
      .status(404)
      .json({ data: "", msg: "Athlete not found", rcode: 404 });
  }
  if (!(await canAccessAthlete(req.user, athlete))) {
    return res.status(403).json({
      data: "",
      msg: "Athlete is outside your scope",
      rcode: -10,
    });
  }
  let payment = await PaymentModel.find({ athleteId: athleteId })
    .populate("sportsComplexId")
    .populate("sports")
    .populate({
      path: "athleteId",
      populate: { path: "userId", model: "users", select: { Name: 1 } },
    });
  let myObj = [];
  payment.forEach((ele) => {
    let to = new Date(
      new Date(ele.from).setMilliseconds(1000) + ele.duration * 2629746000
    );
    let amount = 0;
    ele.sportsComplexId.sports.forEach((sp) => {
      if (sp.sport.toString() == ele.sports._id.toString()) {
        amount = ele.duration * sp.fees;
        return;
      }
    });
    myObj.push({
      sportName: ele.sports.SportName,
      sportComplexName: ele.sportsComplexId.name,
      from: ele.from,
      to,
      athleteName: ele.athleteId.userId.Name,
      amount,
    });
  });
  res.json({ rcode: 200, payments: myObj });
};
