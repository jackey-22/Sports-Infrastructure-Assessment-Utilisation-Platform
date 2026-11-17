import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
export async function shareBookingReceipt({ confirmed, pending, facility, date, name }) {
  const rows = [["Booking reference",confirmed.bookingReference],["Payment ID",confirmed.razorpayPaymentId||"Razorpay payment"],["Paid on",confirmed.paidAt ? new Date(confirmed.paidAt).toLocaleString("en-IN") : "Paid"],["Beneficiary",confirmed.pass?.userName||name],["Facility",facility.name],["Sport",pending.sport],["Date",date],["Session",`${pending.slot.startTime} - ${pending.slot.endTime}`],["Members",pending.memberCount],["Total paid",`INR ${confirmed.totalAmount}`]];
  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:sans-serif;color:#193d28;padding:30px}h1{color:#007d40}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #e0e9e3}td:first-child{font-weight:bold}p{font-size:12px;color:#718078}</style></head><body><h1>KhelGujarat</h1><h2>Booking payment receipt</h2><table>${rows.map(([key,value])=>`<tr><td>${escape(key)}</td><td>${escape(value)}</td></tr>`).join("")}</table><p>Payment confirmed by KhelGujarat. Present the booking QR pass at the facility gate.</p></body></html>`;
  if (Platform.OS === "web") { await Print.printAsync({html}); return; }
  const file = await Print.printToFileAsync({html});
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri,{mimeType:"application/pdf",dialogTitle:"Save booking invoice",UTI:"com.adobe.pdf"});
  else await Print.printAsync({uri:file.uri});
}
