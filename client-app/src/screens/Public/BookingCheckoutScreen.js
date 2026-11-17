import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, SafeAreaView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "../../components/AppText";
import { FacilityHeader, Chip, Button, StateMessage, ui, GREEN } from "../../components/FacilityUI";
import FacilityPayment from "../../components/FacilityPayment";
import BookingCalendar from "../../components/BookingCalendar";
import BookingPassCard from "../../components/qr/BookingPassCard";
import { loadBookingConfigs } from "../../services/facilityService";
import { api } from "../../api/client";
import { restoreSession } from "../../services/authService";
import { shareBookingReceipt } from "../../utils/bookingReceipt";
const localDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; };
export default function BookingCheckoutScreen({ facility, onBack, onDone }) {
  const [configs,setConfigs] = useState([]), [configId,setConfigId] = useState(""), [slotId,setSlotId] = useState("");
  const [date,setDate] = useState(localDate()), [name,setName] = useState(""), [phone,setPhone] = useState(""), [email,setEmail] = useState(""), [members,setMembers] = useState("1"), [citizen,setCitizen] = useState(null);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(""), [revision,setRevision] = useState(0);
  const [availability,setAvailability] = useState(null), [availabilityLoading,setAvailabilityLoading] = useState(false), [availabilityRevision,setAvailabilityRevision] = useState(0);
  const [pending,setPending] = useState(null), [paymentOpen,setPaymentOpen] = useState(false), [proof,setProof] = useState(null), [confirmed,setConfirmed] = useState(null);
  const lock = useRef(false);
  useEffect(() => { let active=true;restoreSession().then(user=>{if(active && Number(user?.Role)===0){setCitizen(user);setName(user.Name||"");setEmail(user.Email||"");setPhone(user.ContactNum||"");}}).catch(()=>{});return ()=>{active=false;}; },[]);
  useEffect(() => { let alive=true;setLoading(true);setError("");loadBookingConfigs(facility?.id).then(rows=>{if(alive){setConfigs(rows);setConfigId(rows[0]?.id||"");setSlotId("");}}).catch(err=>{if(alive)setError(err.message);}).finally(()=>{if(alive)setLoading(false);});return ()=>{alive=false;}; },[facility?.id,revision]);
  useEffect(() => {
    if(!configId)return;
    let alive=true;setAvailabilityLoading(true);setAvailability(null);setSlotId("");
    api.get(`/api/public/sport-configs/${configId}/availability`,{auth:false}).then(response=>{if(!alive)return;const next=response.data;setAvailability(next);const entry=next.dates.find(day=>day.slots.some(slot=>slot.remaining>0))||next.dates[0];setDate(entry?.date||next.window.start);const slot=entry?.slots.find(slot=>slot.remaining>0);setSlotId(slot?.id||"");setMembers(String(slot?.bookingPolicy?.minMembers||1));}).catch(err=>{if(alive)setError(err.message);}).finally(()=>{if(alive)setAvailabilityLoading(false);});
    return ()=>{alive=false;};
  },[configId,availabilityRevision]);
  const config=configs.find(c=>c.id===configId), slots=availability?.dates.find(day=>day.date===date)?.slots||[], slot=slots.find(s=>s.id===slotId);
  const policy=slot?.bookingPolicy||config?.bookingPolicy||{}, isGroup=policy.reservationType==="group", exclusive=policy.inventoryMode==="exclusive-unit";
  const count=isGroup?Number(members):1, base=config?.price?.amount||0, perMember=config?.price?.perMemberAmount||base;
  const total=config?.price?.calculation==="per-member"?perMember*count:config?.price?.calculation==="base-plus-member"?base+(config.price.perMemberAmount||0)*count:base;
  const chooseDate=value=>{setDate(value);const first=availability.dates.find(day=>day.date===value)?.slots.find(s=>s.remaining>0);setSlotId(first?.id||"");setMembers(String(first?.bookingPolicy?.minMembers||1));};
  const verify=async data=>{if(lock.current)return;setPaymentOpen(false);setProof(data);setBusy(true);setError("");lock.current=true;try{const response=await api.post(`/api/public/bookings/${pending.id}/payment/verify`,data,{auth:false});if(response.data?.bookingStatus!=="Confirmed"||response.data?.paymentStatus!=="Paid")throw new Error("Payment has not been confirmed yet. Retry verification.");setConfirmed(response.data);setProof(null);}catch(err){setError(err.message);}finally{lock.current=false;setBusy(false);}};
  const submit=async()=>{
    if(lock.current)return;setError("");if(pending){setPaymentOpen(true);return;}
    if(!slot||!slot.remaining)return setError("Choose an available date and slot.");
    if(!name.trim()||!/^\+?[0-9 ()-]{10,18}$/.test(phone.trim()))return setError("Enter your full name and valid mobile number.");
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return setError("Enter a valid email address.");
    if(!Number.isInteger(count)||count<(policy.minMembers||1)||count>(policy.maxMembers||1))return setError(`Members must be between ${policy.minMembers||1} and ${policy.maxMembers||1}.`);
    setBusy(true);lock.current=true;
    try{const response=await api.post("/api/public/bookings",{configId,slotId,date,name:name.trim(),phone:phone.trim(),email:email.trim(),memberCount:count});setPending(response.data);setPaymentOpen(true);}catch(err){setError(err.message);if(err.status===409)setAvailabilityRevision(v=>v+1);}finally{lock.current=false;setBusy(false);}
  };
  const field=(label,value,setter,keyboardType="default",locked=false)=><View><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} style={[ui.input,locked&&{backgroundColor:"#EDF2EF",color:"#718078"}]} value={value} onChangeText={setter} editable={!busy&&!pending&&!locked} keyboardType={keyboardType} autoCapitalize="none" /></View>;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><FacilityHeader title={confirmed?"Booking confirmed":"Book a sports slot"} subtitle={facility?.name} onBack={busy?undefined:onBack}/><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    {confirmed?<View style={{gap:16}}><View style={[ui.card,{gap:12,alignItems:"center"}]}><Ionicons name="checkmark-circle" size={48} color={GREEN}/><Text style={ui.sectionTitle}>Payment verified</Text><Text style={ui.muted}>Reference: {confirmed.bookingReference}</Text><Text style={ui.sectionTitle}>INR {confirmed.totalAmount}</Text></View><BookingPassCard pass={confirmed.pass}/><Button secondary onPress={() => shareBookingReceipt({confirmed,pending,facility,date,name}).catch(err => setError(err.message))}>Download / share invoice</Button>{!!error && <Text style={ui.error}>{error}</Text>}<Button onPress={onDone||onBack}>Return to facilities</Button></View>:loading?<ActivityIndicator size="large" color={GREEN}/>:<>
      {!!error&&<Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {!configs.length?<StateMessage title="No online booking configured" message="Contact the facility or reload the booking schedule." action="Reload schedule" onAction={()=>setRevision(v=>v+1)}/>:<>
        {pending?<View style={[ui.card,{gap:12}]}><Text style={ui.sectionTitle}>Payment pending</Text><Text style={ui.muted}>{pending.reference} | {pending.sport} | {pending.slot.label}</Text><Text style={ui.muted}>Your court or capacity is held for 15 minutes. Complete payment to receive your QR pass.</Text></View>:<>
          <View style={[ui.card,{gap:14}]}><Text style={ui.sectionTitle}>1. Sport & booker details</Text><View style={ui.wrap}>{configs.map(c=><Chip key={c.id} active={c.id===configId} onPress={()=>{setError("");setConfigId(c.id);}}>{c.sport?.SportName||"Sport"}</Chip>)}</View>{citizen&&<Text style={[ui.muted,{color:GREEN}]}>Booking as {citizen.Name}. Contact details come from your account.</Text>}{field("Booker name",name,setName,"default",!!citizen?.Name)}{field("Mobile number",phone,setPhone,"phone-pad",!!citizen?.ContactNum)}{field("Email (optional)",email,setEmail,"email-address",!!citizen?.Email)}</View>
          <Text style={ui.sectionTitle}>2. Choose a date</Text>{availabilityLoading?<ActivityIndicator color={GREEN}/>:availability?<BookingCalendar availability={availability} selectedDate={date} onSelect={chooseDate}/>:<Button secondary onPress={()=>setAvailabilityRevision(v=>v+1)}>Reload availability</Button>}
          <View style={[ui.card,{gap:12}]}><View style={[ui.row,{justifyContent:"space-between"}]}><Text style={[ui.sectionTitle,{flex:1}]}>3. Available slots on {date}</Text><Button secondary onPress={()=>setAvailabilityRevision(v=>v+1)}>Refresh</Button></View>{!availabilityLoading&&!slots.length&&<Text style={ui.muted}>No slots operate on this date.</Text>}{slots.map(s=><View key={s.id} style={{opacity:s.remaining?1:0.45}}><Chip active={slotId===s.id} onPress={()=>{if(s.remaining){setSlotId(s.id);setMembers(String(s.bookingPolicy?.minMembers||1));}}}>{s.label} | {s.startTime}-{s.endTime}</Chip><Text style={[ui.muted,{marginTop:7}]}>{s.remaining} {s.inventoryLabel} left | {s.audience} | {s.purpose}{s.coach?` | Coach: ${s.coach}`:""}</Text></View>)}</View>
          <View style={[ui.card,{gap:12}]}><Text style={ui.sectionTitle}>Booking summary</Text><Text style={ui.muted}>{facility?.name}</Text><Text style={ui.muted}>{config?.sport?.SportName} | {date}</Text><Text style={ui.muted}>{slot?`${slot.startTime}-${slot.endTime}`:"Select an available slot"}</Text>{isGroup&&field(`Number of members (${policy.minMembers}-${policy.maxMembers})`,members,setMembers,"number-pad")}<Text style={{fontSize:13,fontWeight:"700",color:GREEN}}>{exclusive?"Whole court or field reserved":"Shared slot capacity"}</Text><Text style={ui.muted}>{exclusive?`One athlete books for the group (${policy.minMembers}-${policy.maxMembers} members).`:`${slot?.remaining||0} places currently available.`}</Text></View>
        </>}
        <View style={[ui.card,{gap:12}]}><Text style={ui.sectionTitle}>Amount due: INR {pending?.totalAmount??(Number.isFinite(total)?total:0)}</Text><Text style={ui.muted}>Secure Razorpay checkout | inventory held for 15 minutes</Text><Button disabled={busy||(!pending&&(!slot?.remaining||availabilityLoading))} onPress={proof?()=>verify(proof):submit}>{busy?"Please wait...":proof?"Retry payment verification":pending?"Continue payment":"Proceed to payment"}</Button><Button secondary disabled={busy} onPress={onBack}>Cancel</Button></View>
      </>}
    </>}
  </ScrollView>{paymentOpen&&pending?.payment&&<FacilityPayment payment={pending.payment} onPaid={verify} onClose={()=>setPaymentOpen(false)} onError={message=>{setPaymentOpen(false);setError(message);}}/>}</View></SafeAreaView>;
}
