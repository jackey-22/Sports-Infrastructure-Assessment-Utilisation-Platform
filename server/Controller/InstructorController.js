const UsersModel = require("../Model/UsersModel");
const mongoose = require("mongoose");
const InstructorModel = require("../Model/instructorModel");
const paymentModel = require("../Model/PaymentModel");
const complaintModel = require("../Model/ComplaintModel");
const {
  sanitizeFilters,
  complexFilter,
  canAccessComplex,
} = require("../Utils/scope");
const { ROLE } = require("../Utils/roles");

async function scopedInstructorQuery(req) {
  const filters = sanitizeFilters(req.query, [
    "_id",
    "userId",
    "createdBy",
    "SportComplexId",
  ]);
  // A coach without an assigned facility may still see their own instructor
  // profile (used by the notification screen), but nothing else.
  if (req.user.Role === ROLE.COACH && !req.user.SportComplexId) {
    return { ...filters, userId: req.user._id };
  }
  // Scope is applied last so a query parameter cannot widen it.
  const scope = await complexFilter(req.user, "SportComplexId");
  return { ...filters, ...scope };
}

module.exports.addInstructor = async function (req, res) {
  if (!(await canAccessComplex(req.user, req.body.SportComplexId))) {
    return res.status(403).json({
      data: "",
      msg: "Facility is outside your scope",
      rcode: -10,
    });
  }
  let Instructor = new InstructorModel(req.body);

  let data = await Instructor.save();

  res.json({ data: data, msg: "Instructor Added", rcode: 200 });
};

module.exports.getInstructor = async function (req, res) {
  InstructorModel.find(await scopedInstructorQuery(req))
    .then((data) => {
      res.json({ data: data, msg: "Instructor Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve instructors", rcode: -9 });
    });
};
module.exports.getInstructorwithUserName = async function (req, res) {
  InstructorModel.find(await scopedInstructorQuery(req))
    .populate("userId")
    .then((data) => {
      res.json({ data: data, msg: "Instructor Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve instructors", rcode: -9 });
    });
};
module.exports.getInstructorwithSportsName = async function (req, res) {
  InstructorModel.find(await scopedInstructorQuery(req))
    .populate("sports.sport")
    .then((data) => {
      res.json({ data: data, msg: "Instructor Retrived", rcode: 200 });
    })
    .catch(() => {
      res.status(500).json({ data: "", msg: "Could not retrieve instructors", rcode: -9 });
    });
};
module.exports.getInstructorwithAll = async function (req, res) {
  let data = await InstructorModel.find(await scopedInstructorQuery(req))
    .populate("sports.sport")
    .populate("userId");
  res.json({ data: data, msg: "Instructor Retrived", rcode: 200 });
};

module.exports.updateInstructor = async function (req, res) {
  const id = req.params.id;

  // console.log(req.files);
  // let resourcesarray = [];
  // req.files.forEach((ele) => {
  //   resourcesarray.push(`http://localhost:9999/uploads/${ele.originalname}`);
  // });

  // console.log(resourcesarray);

  // let json = {
  //   bloodGroup: req.body.bloodGroup,
  //   isApproved: req.body.isApproved,
  //   healthIssue: req.body.healthIssue,
  //   disability: req.body.disability,
  //   isActive: req.body.isActive,
  //   address: req.body.address,
  //   emergencyNumber: req.body.emergencyNumber,
  // };

  let Instructor = await InstructorModel.findOne({ _id: id });

  if (!Instructor) {
    return res
      .status(404)
      .json({ data: "", msg: "Instructor not found", rcode: 404 });
  }
  if (!(await canAccessComplex(req.user, Instructor.SportComplexId))) {
    return res.status(403).json({
      data: "",
      msg: "Instructor is outside your scope",
      rcode: -10,
    });
  }

  if (req.body.userId !== undefined) {
    Instructor.userId = req.body.userId;
  }

  if (req.body.createdBy !== undefined) {
    Instructor.createdBy = req.body.createdBy;
  }

  if (req.body.sports !== undefined) {
    Instructor.sports = req.body.sports;
  }

  try {
    let response = await Instructor.save();
    res.json({ data: response, msg: "updated successfully", rcode: 200 });
  } catch (error) {
    console.error(error);
    res.json({ data: error.msg, msg: "smw", rcode: -9 });
  }
};

module.exports.CountForInstructer = async function (req, res) {
  try {
    const q = sanitizeFilters(req.query, ["sportsComplexId", "instructorId"]);
    const sportsComplexId = q.sportsComplexId;
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
    let instructorId = q.instructorId;
    if (req.user.Role === ROLE.COACH) {
      const own = await InstructorModel.findOne({ userId: req.user._id });
      if (!own) {
        return res.status(403).json({
          data: "",
          msg: "Instructor profile is not assigned",
          rcode: -10,
        });
      }
      instructorId = own._id;
    }
    if (!instructorId) {
      return res
        .status(400)
        .json({ data: "", msg: "instructorId is required", rcode: -9 });
    }

    const data = await paymentModel.aggregate([
      {
        $lookup: {
          from: "instructors",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "instructorInfo.userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $group: {
          _id: {
            instructorId: "$userInfo.Name",
          },
          uniqueAthleteIds: { $addToSet: "$athleteId" },
        },
      },
      {
        $project: {
          // instructorId: "$_id.instructorId",
          userCount: { $size: "$uniqueAthleteIds" },
        },
      },
    ]);

    const complaincount = await complaintModel.find({ level: 1 });

    const result = await paymentModel.aggregate([
      {
        $match: {
          $and: [
            {
              sportsComplexId: new mongoose.Types.ObjectId(
                sportsComplexId
              ),
            },
            // {
            //   instructorId: new mongoose.Types.ObjectId(req.query.instructorId),
            // },
          ],
        },
      },
      {
        $lookup: {
          from: "instructors",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "instructorInfo.userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $match: {
          "instructorInfo.userId": new mongoose.Types.ObjectId(
            instructorId
          ),
        },
      },
      {
        $group: {
          _id: {
            sportsComplexId: "$sportsComplexId",
            instructorId: "$userInfo.Name",
            athleteId: "$athleteId", // Group by athleteId for unique counts
          },
          athleteCount: { $sum: 1 },
        },
      },

      {
        $group: {
          _id: {
            sportsComplexId: "$_id.sportsComplexId",
            instructorId: "$_id.instructorId",
          },

          uniqueAthleteCount: { $sum: 1 }, // Count of athletes
        },
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          //sportsComplexId: '$_id.sportsComplexId',
          instructorName: "$_id.instructorId",
          //instructorName: '$userInfo.Name',
          uniqueAthleteCount: 1,
        },
      },
    ]);

    console.log(result);
    const responseArray = [
      // { data: data },
      { ComplainCount: complaincount.length },
      { result: result },
      { rcode: 200 },
    ];

    res.json(responseArray);

    // res.json({
    //   data: data,
    //   ComplainCount:complaincount.length,
    //   result : result,
    //   rcode: 200,
    // });
  } catch (err) {
    console.log(err);
  }
};

// module.exports.complaintCount = async function (req, res) {
//   try {
//     let data = await complaintModel.find({ level: 1 });
//     res.json({
//       result: data.length,
//       data: data,
//       rcode: 200,
//     });
//   } catch (err) {
//     console.log(err);
//   }
// };
