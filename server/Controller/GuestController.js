const Guest = require("../Model/GuestModel");
const instructorModel = require("../Model/instructorModel");
const { sanitizeFilters, guestQueryScope } = require("../Utils/scope");

// Public guest booking: only the booking fields are accepted.
module.exports.addUser = async function (req, res) {
  try {
    const body = {};
    [
      "Name",
      "Email",
      "ContactNum",
      "timeslot",
      "duration",
      "sport",
      "SportComplexId",
      "Startdate",
      "Enddate",
    ].forEach((key) => {
      if (req.body[key] !== undefined) body[key] = req.body[key];
    });
    const guest = new Guest(body);
    const savedGuest = await guest.save();
    res.status(201).json(savedGuest);
  } catch (error) {
    res.status(400).json({ error: "Could not save booking" });
  }
};

module.exports.getAllUsers = async function (req, res) {
  try {
    const filters = sanitizeFilters(req.query, [
      "_id",
      "Email",
      "ContactNum",
      "SportComplexId",
      "sport",
    ]);
    const scope = await guestQueryScope(req.user);
    const guests = await Guest.find({ ...filters, ...scope })
      .populate("SportComplexId")
      .populate("sport");
    res.status(200).json(guests);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve guests" });
  }
};

module.exports.gettimeslotfrominstructor = async function (req, res) {
  try {
    let data = await instructorModel.find({
      SportComplexId: req.query.SportComplexId,
    });
    let timeslot = [];

    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      for (let j = 0; j < element.sports.length; j++) {
        const ele = element.sports[j];
        if (ele.sport.equals(req.query.sportId)) {
          timeslot = timeslot.concat(ele.timeSlot);
        }
      }
    }

    res.json({ data: timeslot, rcode: 200 });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error", rcode: 500 });
  }
};
