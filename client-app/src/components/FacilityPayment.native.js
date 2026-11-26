import React, { useMemo } from "react";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Button } from "./FacilityUI";
export default function FacilityPayment({ payment, onPaid, onClose, onError }) {
  const html = useMemo(() => {
    const config = JSON.stringify({ key: payment.keyId, order_id: payment.orderId, amount: payment.amount, currency: payment.currency, name: "KhelGujarat", description: payment.description, prefill: payment.prefill, theme: { color: "#007D40" } }).replace(/</g, String.fromCharCode(92) + "u003c");
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="background:#f3f8f5;font-family:sans-serif;text-align:center;padding-top:40px">Opening secure checkout...<script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>function send(type,data){window.ReactNativeWebView.postMessage(JSON.stringify({type,data}));}try{var options=${config};options.handler=function(data){send('paid',data)};options.modal={ondismiss:function(){send('close')}};var checkout=new Razorpay(options);checkout.on('payment.failed',function(event){send('error',event.error.description)});checkout.open();}catch(e){send('error','Could not load payment checkout. Check your connection.');}</script></body></html>`;
  }, [payment]);
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: "#F3F8F5" }}><Button secondary onPress={onClose}>Close checkout</Button><WebView source={{ html, baseUrl: "https://checkout.razorpay.com" }} javaScriptEnabled onError={() => onError("Payment checkout could not load.")} onMessage={event => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === "paid") onPaid(message.data); else if (message.type === "close") onClose(); else if (message.type === "error") onError(String(message.data)); } catch { onError("Invalid payment response"); } }} /></SafeAreaView></Modal>;
}
