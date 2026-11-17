const BookingPayment = require("../Model/BookingPaymentModel");
const Instructor = require("../Model/instructorModel");
const { ROLE } = require("../Utils/roles");

const fail = (res, status, message) =>
  res.status(status).json({ data: "", msg: message, rcode: status === 403 ? -10 : -9 });

async function report(req, res) {
  try {
    const query = {};
    if (req.user.Role === ROLE.MANAGER) {
      if (!req.user.SportComplexId) return fail(res, 403, "No facility is assigned to this manager");
      query.facility = req.user.SportComplexId;
    } else if (req.user.Role === ROLE.COACH) {
      const coach = await Instructor.findOne({ userId: req.user._id }).select("_id");
      if (!coach) {
        return res.json({ data: emptyReport("Coach bookings"), rcode: 200 });
      }
      query.coach = coach._id;
    } else if (req.user.Role === ROLE.ADMIN) {
      if (req.query.facilityId) query.facility = req.query.facilityId;
    } else {
      return fail(res, 403, "You cannot access booking payments");
    }

    if (req.query.status && ["Created", "Paid", "Failed", "Refunded"].includes(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) query.createdAt.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (req.query.to) query.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }

    const records = await BookingPayment.find(query)
      .populate("facility", "name district")
      .populate("sport", "SportName")
      .populate({
        path: "coach",
        select: "userId qualification",
        populate: { path: "userId", select: "Name Email" },
      })
      .populate(
        "booking",
        "Name Email ContactNum Startdate timeslot memberCount bookingStatus paymentStatus"
      )
      .sort({ createdAt: -1 })
      .lean();

    const paid = records.filter((row) => row.status === "Paid");
    const facilities = new Set(records.map((row) => String(row.facility?._id || row.facility)));
    return res.json({
      data: {
        scope: req.user.Role === ROLE.ADMIN ? "Platform" : req.user.Role === ROLE.MANAGER ? "Facility" : "Coach",
        summary: {
          bookings: records.length,
          paidBookings: paid.length,
          pendingBookings: records.filter((row) => row.status === "Created").length,
          totalCollected: paid.reduce((sum, row) => sum + Number(row.amount || 0), 0),
          facilities: facilities.size,
          athletes: new Set(records.map((row) => row.payer?.email || row.payer?.phone).filter(Boolean)).size,
        },
        rows: records.map((row) => ({
          id: row._id,
          bookingId: row.booking?._id,
          bookingReference: row.bookingReference,
          facility: row.facility?.name || "Facility",
          sport: row.sport?.SportName || "Sport",
          coach: row.coach?.userId?.Name || "—",
          athlete: row.booking?.Name || row.payer?.name || "Athlete",
          email: row.booking?.Email || row.payer?.email || "",
          phone: row.booking?.ContactNum || row.payer?.phone || "",
          date: row.booking?.Startdate || "",
          time: row.booking?.timeslot || {},
          members: row.booking?.memberCount || 1,
          bookingStatus: row.booking?.bookingStatus || "Pending Payment",
          paymentStatus: row.status,
          amount: row.amount,
          paymentReference: row.razorpayPaymentId || row.razorpayOrderId,
          createdAt: row.createdAt,
          paidAt: row.paidAt,
        })),
      },
      rcode: 200,
    });
  } catch (error) {
    return fail(res, 500, error.message || "Could not load booking payments");
  }
}

function emptyReport(scope) {
  return {
    scope,
    summary: { bookings: 0, paidBookings: 0, pendingBookings: 0, totalCollected: 0, facilities: 0, athletes: 0 },
    rows: [],
  };
}

module.exports = { report };
