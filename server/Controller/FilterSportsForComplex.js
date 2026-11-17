const mongoose = require("mongoose");
const SportsComplexModel = require("./../Model/SportsComplexModel");
const SportModel = require("./../Model/SportModel");
const { canAccessComplex } = require("../Utils/scope");

module.exports.filtersportsforcomplex = async function (req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ data: "", msg: "Invalid facility", rcode: -9 });
    }
    if (!(await canAccessComplex(req.user, id))) {
      return res.status(403).json({
        data: "",
        msg: "Facility is outside your scope",
        rcode: -10,
      });
    }

    let SportsComplex = await SportsComplexModel.findOne({ _id: id });
    if (!SportsComplex) {
      return res
        .status(404)
        .json({ data: "", msg: "Facility not found", rcode: 404 });
    }
    const removeId = SportsComplex.sports.map((item) => item.sport);

    let FilterSports = await SportModel.find({ _id: { $nin: removeId } });

    return res.json({
      data: FilterSports,
      msg: "filter successfully",
      rcode: 200,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ data: "", msg: "Could not filter sports", rcode: -9 });
  }
};
