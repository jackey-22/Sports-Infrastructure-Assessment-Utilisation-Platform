const Athlete = require("../Model/athleteModel");
const User = require("../Model/UsersModel");
const Reminder = require("../Model/Reminder");
const Updates = require("../Model/UpdatesModel");
const { sendPushNotification } = require("../PushNotification");
const { ROLE } = require("../Utils/roles");

/**
 * Publishes an Announcement (Updates) when `createAnnouncement` is true,
 * and notifies all athletes who selected `sportId` in their `preferredSports`
 * via both FCM push notification and in-app Reminder entry.
 */
async function notifyPreferredAthletes({
  sportId,
  facilityId = null,
  title,
  message,
  category = "slot",
  createAnnouncement = true,
}) {
  if (!title || !message) return { matchedAthletes: 0, notifiedTokens: 0 };

  if (createAnnouncement) {
    try {
      await Updates.create({
        title,
        description: message,
        level: 0,
        sportComplexId: facilityId || undefined,
        sportId: sportId || null,
        category,
        active: "1",
      });
    } catch (err) {
      console.error("[SportPreferenceNotification] Announcement save error:", err.message);
    }
  }

  if (!sportId) return { matchedAthletes: 0, notifiedTokens: 0 };

  const athletes = await Athlete.find({ preferredSports: sportId })
    .select("userId")
    .lean();

  const userIds = [...new Set(athletes.map((a) => String(a.userId || "")).filter(Boolean))];
  if (!userIds.length) return { matchedAthletes: 0, notifiedTokens: 0 };

  const users = await User.find({
    _id: { $in: userIds },
    Role: ROLE.ATHLETE,
    IsActive: { $ne: 0 },
  })
    .select("_id notificationtoken")
    .lean();

  if (!users.length) return { matchedAthletes: 0, notifiedTokens: 0 };

  const tokens = users.map((u) => u.notificationtoken).filter(Boolean);
  if (tokens.length) {
    try {
      await sendPushNotification(tokens, title, message);
    } catch (err) {
      console.error("[SportPreferenceNotification] Push error:", err.message);
    }
  }

  try {
    await Reminder.create({
      date: new Date(),
      title,
      message,
      issent: 1,
      userIds: users.map((u) => u._id),
    });
  } catch (err) {
    console.error("[SportPreferenceNotification] Reminder save error:", err.message);
  }

  return { matchedAthletes: users.length, notifiedTokens: tokens.length };
}

module.exports = { notifyPreferredAthletes };
