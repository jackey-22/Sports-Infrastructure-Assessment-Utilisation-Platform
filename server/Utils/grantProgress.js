function percentForAmount(grant, amountUsed) {
  const allocation = Number(grant?.allocatedAmount);
  if (!Number.isFinite(allocation) || allocation <= 0) return 0;
  return Math.round(((Number(amountUsed) / allocation) * 100) * 100) / 100;
}

function verifiedGrantTotals(grant, excludeId = null) {
  const amountUsed = (grant?.progressUpdates || []).reduce((total, item) => {
    if (item.reviewStatus !== "Verified" || (excludeId && String(item._id) === String(excludeId))) return total;
    return total + (Number(item.amountUsed) || 0);
  }, 0);
  return { amountUsed, percent: percentForAmount(grant, amountUsed) };
}

function validateMilestoneProgress(grant, amountUsed, verifiedTotal, submittedPercent = null) {
  if (!Number.isFinite(amountUsed) || amountUsed <= 0) {
    return "Milestone amount must be greater than zero";
  }
  if (verifiedTotal.amountUsed + amountUsed > Number(grant.allocatedAmount)) {
    const remaining = Math.max(0, Number(grant.allocatedAmount) - verifiedTotal.amountUsed);
    return `Milestone amount cannot exceed the remaining allocation of ₹${remaining.toLocaleString("en-IN")}`;
  }
  const calculatedPercent = percentForAmount(grant, amountUsed);
  if (submittedPercent !== null && (
    !Number.isFinite(Number(submittedPercent)) ||
    Math.abs(Number(submittedPercent) - calculatedPercent) > 0.01
  )) {
    return `The milestone percentage must be ${calculatedPercent}% for ₹${amountUsed.toLocaleString("en-IN")}`;
  }
  return "";
}

module.exports = { percentForAmount, verifiedGrantTotals, validateMilestoneProgress };
