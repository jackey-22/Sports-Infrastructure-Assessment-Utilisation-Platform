const {
  ROLE
} = require("./roles");
const HANDLERS = [ROLE.SUPERVISOR, ROLE.MANAGER, ROLE.AUTHORITY, ROLE.ADMIN];
const LABELS = ["Supervisor", "Manager", "District Authority", "Admin"];
function startLevel(role) {
  return {
    0: 0,
    1: 1,
    2: 0,
    3: 2,
    4: 3,
    5: 3,
    6: 0
  }[Number(role)];
}
function isOpen(item) {
  return item.status !== 1 && item.workflowStatus !== "Resolved";
}
function permissions(item, user, inScope) {
  const own = String(item.userId?._id || item.userId) === String(user._id);
  const handler = Boolean(inScope && HANDLERS[item.level] === Number(user.Role) && !own);
  return {
    canRespond: handler && isOpen(item),
    canResolve: handler && isOpen(item),
    canEscalate: Number(user.Role) !== ROLE.ATHLETE && (own || handler) && isOpen(item) && item.level < 3
  };
}
function nextDeadline(now = Date.now()) {
  return new Date(now + Math.max(1, Number(process.env.GRIEVANCE_RESPONSE_HOURS) || 48) * 3600000);
}
module.exports = {
  HANDLERS,
  LABELS,
  startLevel,
  isOpen,
  permissions,
  nextDeadline
};
