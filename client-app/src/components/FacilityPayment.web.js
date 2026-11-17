import React, { useEffect, useRef } from "react";
export default function FacilityPayment({ payment, onPaid, onClose, onError }) {
  const callbacks = useRef({ onPaid, onClose, onError }); callbacks.current = { onPaid, onClose, onError };
  useEffect(() => {
    let alive = true, checkout;
    const open = () => { if (!alive) return; checkout = new window.Razorpay({ key: payment.keyId, order_id: payment.orderId, amount: payment.amount, currency: payment.currency, name: "KhelGujarat", prefill: payment.prefill, theme: { color: "#007D40" }, handler: data => callbacks.current.onPaid(data), modal: { ondismiss: () => callbacks.current.onClose() } }); checkout.on("payment.failed", event => callbacks.current.onError(event.error.description)); checkout.open(); };
    if (window.Razorpay) open();
    else { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = open; script.onerror = () => alive && callbacks.current.onError("Could not load payment checkout"); document.body.appendChild(script); }
    return () => { alive = false; checkout?.close(); };
  }, [payment]);
  return null;
}
