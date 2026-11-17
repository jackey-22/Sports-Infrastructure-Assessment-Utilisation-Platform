const RatingModel = require("../Model/RatingModel");
const SportsComplexModel = require("../Model/SportsComplexModel");
const athleteModel = require("../Model/athleteModel");
const { sanitizeFilters } = require("../Utils/scope");

module.exports.addRating = async function (req, res) {
  const q = sanitizeFilters(req.body, [
    "athleteId",
    "sportId",
    "sportsComplexId",
    "remarks",
    "rating",
  ]);
  let athleteId = q.athleteId;
  let sportId = q.sportId;
  let sportsComplexId = q.sportsComplexId;
  let remarks = q.remarks;
  let rating = Number(q.rating);

  if (!athleteId || !sportId || !sportsComplexId) {
    return res
      .status(400)
      .json({ data: "", msg: "athleteId, sportId and sportsComplexId are required", rcode: -9 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ data: "", msg: "Rating must be between 1 and 5", rcode: -9 });
  }

  // Athletes may only rate their own record.
  const ownAthlete = await athleteModel.findOne({
    _id: athleteId,
    userId: req.user._id,
  });
  if (!ownAthlete) {
    return res
      .status(403)
      .json({ data: "", msg: "Athlete is outside your scope", rcode: -10 });
  }

  let oldRating = await RatingModel.findOne({
    athleteId,
    sport: sportId,
    sportComplex: sportsComplexId,
  });
  let count = await RatingModel.count({
    sport: sportId,
    sportComplex: sportsComplexId,
  });
  let sportComplex = await SportsComplexModel.findOne({ _id: sportsComplexId });
  if (!sportComplex) {
    return res
      .status(404)
      .json({ data: "", msg: "Facility not found", rcode: 404 });
  }
  sportComplex.sports.forEach((ele) => {
    if (ele.sport.toString() == sportId) {
      if (oldRating) {
        let oldNumber = oldRating.rating;
        ele.rating =
          (ele.rating * count - oldNumber + parseInt(rating)) / count;
        oldRating.rating = rating;
      } else {
        if (ele.rating) {
          ele.rating = (ele.rating * count + parseInt(rating)) / (count + 1);
        } else {
          ele.rating = rating;
        }
      }
      return;
    }
  });
  if (!oldRating) {
    oldRating = new RatingModel({
      sport: sportId,
      athleteId: athleteId,
      rating: rating,
      sportComplex: sportsComplexId,
      remarks: remarks,
    });
  }
  await sportComplex.save();
  await oldRating.save();

  res.json({ msg: "Rating added successfully", rcode: 200 });
};

// Public facility reviews. Only display fields are populated so guest browsing
// does not expose athlete contact details.
module.exports.getAllRatings = async function (req, res) {
  const filters = sanitizeFilters(req.query, [
    "sportComplex",
    "sport",
    "athleteId",
    "rating",
  ]);
  RatingModel.find(filters)
    .populate("sport")
    .populate({
      path: "athleteId",
      select: "baseUrl userId",
      populate: { path: "userId", select: "Name" },
    })
    .then((data) => {
      res.json({ data: data, msg: "Rating Retrived", rcode: 200 });
    })
    .catch((err) => {
      res.json({ data: err.msg, msg: "smw", rcode: -9 });
    });
};
