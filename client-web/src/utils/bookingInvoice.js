const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);

export async function downloadBookingInvoice(booking) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(5, 83, 72); doc.rect(0, 0, 210, 38, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text("KhelGujarat", 16, 18);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Sports facility booking receipt", 16, 27);
  doc.setTextColor(30, 41, 59); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("PAYMENT INVOICE", 16, 55);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 16, 62);
  const rows = [
    ["Booking reference", booking.reference], ["Payment ID", booking.paymentId || "Razorpay payment"],
    ["Payment date", booking.paidAt ? new Date(booking.paidAt).toLocaleString("en-IN") : "Paid"],
    ["Citizen / athlete", booking.name || "Account holder"], ["Facility", booking.facility], ["Sport", booking.sport],
    ["Booking date", booking.date], ["Time", booking.timeLabel || `${booking.time?.from || ""} - ${booking.time?.to || ""}`],
    ["Members", String(booking.members || booking.memberCount || 1)], ["Payment status", booking.paymentStatus || "Paid"],
  ];
  let y = 76;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 6, 182, 10, "F"); }
    doc.setFont("helvetica", "bold"); doc.setTextColor(71, 85, 105); doc.text(String(label), 18, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42); doc.text(String(value || "—").slice(0, 75), 75, y);
    y += 10;
  });
  doc.setFillColor(236, 253, 245); doc.roundedRect(14, y + 2, 182, 24, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setTextColor(5, 83, 72); doc.setFontSize(11); doc.text("Total paid", 20, y + 16);
  doc.setFontSize(16); doc.text(money(booking.amount ?? booking.totalAmount), 188, y + 16, { align: "right" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.text("This computer-generated invoice confirms the payment recorded by KhelGujarat.", 16, 282);
  doc.save(`KhelGujarat-${String(booking.reference || "invoice").replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`);
}
