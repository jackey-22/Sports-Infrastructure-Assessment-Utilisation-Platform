/**
 * maintenanceCycleScheduler.js
 * ----------------------------
 * Runs a daily sweep at 08:00 IST to check for maintenance cycles
 * that are due or overdue, and sends push notifications to facility managers.
 *
 * Uses Node.js built-in timers (no external cron dependency required).
 * Called from server.js after DB connection is established.
 */

const { runNotificationSweep } = require("../Controller/MaintenanceCycleController");

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const SWEEP_HOUR_IST = 8; // 08:00 IST

function msUntilNextSweep() {
  const nowUtc = Date.now();
  const nowIst = nowUtc + IST_OFFSET_MS;
  const istDate = new Date(nowIst);

  const nextRunIst = new Date(
    Date.UTC(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth(),
      istDate.getUTCDate(),
      SWEEP_HOUR_IST,
      0,
      0,
      0
    ) - IST_OFFSET_MS // convert back to UTC
  );

  if (nextRunIst.getTime() <= nowUtc) {
    // Already past today's 08:00 IST — schedule for tomorrow
    nextRunIst.setUTCDate(nextRunIst.getUTCDate() + 1);
  }

  return nextRunIst.getTime() - nowUtc;
}

async function sweep() {
  try {
    await runNotificationSweep();
  } catch (error) {
    console.error("[MaintenanceCycle scheduler] Sweep error:", error);
  }
}

function startMaintenanceCycleScheduler() {
  const delay = msUntilNextSweep();
  const nextRun = new Date(Date.now() + delay);
  console.log(`[MaintenanceCycle scheduler] First sweep scheduled for ${nextRun.toISOString()} (IST 08:00)`);

  // Run once at 08:00 IST, then repeat every 24 h
  setTimeout(() => {
    sweep();
    setInterval(sweep, 24 * 60 * 60 * 1000);
  }, delay);

  // Also run once shortly after startup (5 seconds) so overdue cycles are caught on server restart
  setTimeout(() => {
    console.log("[MaintenanceCycle scheduler] Startup sweep starting…");
    sweep();
  }, 5000);
}

module.exports = { startMaintenanceCycleScheduler };
