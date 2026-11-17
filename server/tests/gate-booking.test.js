const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
process.env.ACCESS_TOKEN_SECRET = "test-only-gate-secret";
const User = require("../Model/UsersModel");
const Guest = require("../Model/GuestModel");
const Attendance = require("../Model/BookingAttendanceModel");
const gate = require("../Controller/GateOperatorController");
const passes = require("../Controller/BookingPassController");
const attendance = require("../Controller/BookingAttendanceController");
const { buildBookingPass } = require("../Utils/bookingPass");
const { verifyPassword } = require("../Utils/password");
const { signAccessToken } = require("../Utils/tokens");
const { authenticate, optionalAuthenticate, gateOperatorAllowed } = require("../Middleware/auth.middleware");
const { ROLE } = require("../Utils/roles");
const originals = [];
function stub(target,key,value) { originals.push([target,key,target[key]]); target[key] = value; }
afterEach(() => { while(originals.length) { const [target,key,value] = originals.pop(); target[key] = value; } });
function res() { return { statusCode:200, status(value) { this.statusCode=value; return this; }, json(value) { this.body=value; return this; } }; }
const facility = "507f1f77bcf86cd799439012";
const staff = { _id:"507f1f77bcf86cd799439013", Role:ROLE.GATE_OPERATOR, SportComplexId:facility, IsActive:1 };
const today = () => new Date(Date.now()+330*60000).toISOString().slice(0,10);
function booking(date=today()) { return { _id:"507f1f77bcf86cd799439011", bookingReference:"BK-TEST", citizenUser:"507f1f77bcf86cd799439014", Name:"Test Citizen", SportComplexId:{_id:facility,name:"Test Facility"},sport:{SportName:"Badminton"},Startdate:date,Enddate:date,timeslot:{from:"00:00",to:"23:59"},memberCount:2,bookingStatus:"Confirmed",paymentStatus:"Paid" }; }
function scanFixture() {
  const state = { booking:booking(), attendance:null };
  stub(Guest,"findById",()=>{const chain={populate(){return chain;},async lean(){return state.booking;}};return chain;});
  stub(Attendance,"findOneAndUpdate",async(query,update)=>{
    if(update.$setOnInsert) { if(!state.attendance) state.attendance={_id:"attendance-1",...update.$setOnInsert,exitAt:null}; return state.attendance; }
    if(!state.attendance || state.attendance.exitAt) return null;
    Object.assign(state.attendance,update.$set);return state.attendance;
  });
  stub(Attendance,"findOne",async()=>state.attendance);
  stub(Attendance,"exists",async query=>query.exitAt ? Boolean(state.attendance?.exitAt) : Boolean(state.attendance));
  state.token=JSON.parse(buildBookingPass(state.booking).qrPayload).token;
  return state;
}
test("gate operators are restricted to QR and attendance APIs",()=>{
  assert(gateOperatorAllowed({method:"POST",path:"/api/gate/attendance"},staff));
  assert(gateOperatorAllowed({method:"GET",path:"/api/gate/attendance"},staff));
  assert(gateOperatorAllowed({method:"POST",path:"/api/booking-passes/verify"},staff));
  for(const [method,path] of [["POST","/signup"],["GET","/getuser"],["POST","/api/manager/gate-operators"],["POST","/addSession/123"],["GET","/api/citizen/bookings"]]) assert.equal(gateOperatorAllowed({method,path},staff),false);
});
test("authentication blocks scanner escalation and immediately rejects deactivated staff",async()=>{
  let current={...staff};stub(User,"findById",async()=>current);
  const headers={authorization:`Bearer ${signAccessToken(staff)}`};
  let next=false,response=res();await authenticate({method:"GET",path:"/getuser",headers},response,()=>{next=true;});assert.equal(response.statusCode,403);assert.equal(next,false);
  response=res();await optionalAuthenticate({method:"POST",path:"/signup",headers},response,()=>{next=true;});assert.equal(response.statusCode,403);
  current.IsActive=0;response=res();await authenticate({method:"GET",path:"/api/gate/attendance",headers},response,()=>{next=true;});assert.equal(response.statusCode,401);
});
test("manager creates a hashed scanner account in their own facility",async()=>{
  let saved,duplicateQuery;stub(User,"exists",async query=>{duplicateQuery=query;return null;});stub(User,"create",async value=>{saved=value;return {_id:"new-user",...value};});
  const response=res();await gate.create({user:{_id:"manager-1",Role:3,SportComplexId:facility},body:{Name:"Gate Staff",Email:"gate+desk@example.com",Password:"strong-password",SportComplexId:"another-facility",Role:5}},response);
  assert.equal(response.statusCode,201);assert.equal(saved.Role,ROLE.GATE_OPERATOR);assert.equal(saved.SportComplexId,facility);assert(verifyPassword("strong-password",saved.Password));assert.equal(response.body.data.Password,undefined);
  const regex=new RegExp(duplicateQuery.Email.$regex,"i");assert(regex.test("gate+desk@example.com"));assert.equal(regex.test("gateeeedesk@example.com"),false);
});
test("manager activation changes are limited to gate staff at their facility",async()=>{
  let query;stub(User,"findOneAndUpdate",value=>{query=value;return {select:async()=>null};});const response=res();await gate.setActive({user:{SportComplexId:facility},params:{id:"other-user"},body:{IsActive:0}},response);assert.equal(query.SportComplexId,facility);assert.equal(query.Role,ROLE.GATE_OPERATOR);assert.equal(response.statusCode,404);
});
test("signed booking QR cannot be forged or used at another facility",async()=>{
  const state=scanFixture();let response=res();await passes.verify({user:{...staff,SportComplexId:"other"},body:{token:state.token}},response);assert.equal(response.statusCode,403);
  const parts=state.token.split(".");parts[1]=Buffer.from(JSON.stringify({bookingId:state.booking._id,facilityId:"forged"})).toString("base64url");response=res();await passes.verify({user:staff,body:{token:parts.join(".")}},response);assert.equal(response.statusCode,400);
});
test("entry is idempotent, exit persists, and completed visits cannot re-enter",async()=>{
  const state=scanFixture(),request={user:staff,body:{token:state.token,action:"entry"}};
  let response=res();await attendance.record(request,response);assert.equal(response.statusCode,200);const entry=state.attendance.entryAt;
  response=res();await attendance.record(request,response);assert.equal(response.statusCode,200);assert.equal(state.attendance.entryAt,entry);
  response=res();await attendance.record({...request,body:{...request.body,action:"exit"}},response);assert.equal(response.statusCode,200);assert(state.attendance.exitAt);assert.equal(response.body.data.status,"Completed");
  response=res();await attendance.record(request,response);assert.equal(response.statusCode,409);
});
test("exit requires entry and future-date bookings cannot mark attendance",async()=>{
  const state=scanFixture();let response=res();await attendance.record({user:staff,body:{token:state.token,action:"exit"}},response);assert.equal(response.statusCode,409);
  state.booking=booking("2099-01-01");state.token=JSON.parse(buildBookingPass(state.booking).qrPayload).token;response=res();await attendance.record({user:staff,body:{token:state.token,action:"entry"}},response);assert.equal(response.statusCode,400);assert.equal(state.attendance,null);
});
test("cancelled or refunded bookings invalidate previously generated QR passes",async()=>{
  const state=scanFixture();state.booking.paymentStatus="Refunded";let response=res();await attendance.record({user:staff,body:{token:state.token,action:"entry"}},response);assert.equal(response.statusCode,400);assert.equal(state.attendance,null);
  state.booking.paymentStatus="Paid";state.booking.bookingStatus="Cancelled";response=res();await passes.verify({user:staff,body:{token:state.token}},response);assert.equal(response.statusCode,400);
});
test("expired sessions never expose a live QR payload",()=>{const pass=buildBookingPass(booking("2000-01-01"));assert.equal(pass.status,"Expired");assert.equal(pass.qrPayload,null);});
