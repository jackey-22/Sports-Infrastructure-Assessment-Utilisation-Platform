const {test,afterEach}=require("node:test"),assert=require("node:assert/strict");
const Athlete=require("../Model/athleteModel"),Instructor=require("../Model/instructorModel"),Guest=require("../Model/GuestModel"),Rating=require("../Model/athleteRatingModel"),Evaluation=require("../Model/PerformanceEvaluationModel"),Template=require("../Model/EvaluationTemplateModel");
const workflow=require("../Controller/WorkflowController"),performance=require("../Controller/PerformanceController");
const facility="507f1f77bcf86cd799439011",owner="507f1f77bcf86cd799439012",athleteId="507f1f77bcf86cd799439013",coachId="507f1f77bcf86cd799439014",sport="507f1f77bcf86cd799439015",instructorId="507f1f77bcf86cd799439016",parameter="507f1f77bcf86cd799439017";
const undo=[];function stub(obj,key,value){undo.push([obj,key,obj[key]]);obj[key]=value;}afterEach(()=>{while(undo.length){const[obj,key,value]=undo.pop();obj[key]=value;}});
const chain=value=>({select(){return this;},populate(){return this;},sort(){return this;},async lean(){return value;}});
const res=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const coach={_id:coachId,Role:2,SportComplexId:facility};
function fixture({assignedFacility,paid=true,profile=true}={}) {
  const athlete={_id:athleteId,userId:owner,isActive:1,...(assignedFacility?{SportComplexId:assignedFacility}:{})};
  const state={created:0,bookedQueries:[]};
  stub(Instructor,"findOne",()=>chain({_id:instructorId,SportComplexId:facility,sports:[{sport}]}));
  stub(Athlete,"find",query=>{state.athleteQuery=query;return chain(profile?[{...athlete,userId:{_id:owner,Name:"Linked athlete",Email:"linked@example.test"}}]:[]);});
  stub(Athlete,"findById",()=>chain(athlete));
  stub(Guest,"find",query=>{state.bookingQuery=query;return chain([{_id:"booking",citizenUser:{_id:owner,Name:"Linked athlete",Email:"linked@example.test"},sport:{_id:sport,SportName:"Swimming"},SportComplexId:facility,bookingStatus:"Confirmed",paymentStatus:paid?"Paid":"Pending"}]);});
  stub(Guest,"exists",async query=>{state.bookedQueries.push(query);return paid;});
  stub(Rating,"find",()=>chain([]));stub(Evaluation,"find",()=>chain([]));stub(Evaluation,"create",async value=>{state.created++;return value;});
  stub(Template,"findOne",()=>chain({_id:"template",version:1,recognitionLevels:[],parameters:[{_id:parameter,name:"Technique",active:true,evaluationType:"qualitative",maxScore:5,weightage:100}]}));
  return state;
}
const evaluationRequest=()=>({user:coach,body:{athleteId,sportId:sport,details:[{parameterId:parameter,actualValue:4}]}});
test("a paid coaching booking links a citizen profile missing its facility to the coach roster",async()=>{
  const state=fixture(),response=res();await workflow.coachRateableAthletes({user:coach},response);
  assert.equal(response.body.rcode,200);assert.equal(response.body.data.athletes.length,1);assert.equal(response.body.data.athletes[0].athleteId,athleteId);assert.equal(response.body.data.athletes[0].canRate,true);
  assert.equal(state.bookingQuery.SportComplexId,facility);assert.equal(state.athleteQuery.$or[1].SportComplexId,null);assert.ok(state.athleteQuery.$or[1].userId.$in.includes(owner));
});
test("an unlinked booked user stays disabled with a finite eligibility count and clear reason",async()=>{
  fixture({profile:false});const response=res();await workflow.coachRateableAthletes({user:coach},response);const row=response.body.data.athletes[0];assert.equal(row.eligibleRatingBookings,1);assert.equal(row.canRate,false);assert.match(row.evaluationUnavailableReason,/profile/);
});
test("confirmed paid coaching enrolment authorizes evaluation when facility is missing",async()=>{
  const state=fixture(),response=res();await performance.createEvaluation(evaluationRequest(),response);
  assert.equal(response.code,201);assert.equal(state.created,1);assert.equal(response.body.data.totalScore,80);
  assert.deepEqual(state.bookedQueries[0],{coach:instructorId,SportComplexId:facility,citizenUser:owner,sport,bookingStatus:"Confirmed",paymentStatus:"Paid"});
});
test("the fallback cannot evaluate an athlete assigned to another facility",async()=>{
  const state=fixture({assignedFacility:"507f1f77bcf86cd799439099"}),response=res();await performance.createEvaluation(evaluationRequest(),response);assert.equal(response.code,403);assert.equal(state.created,0);assert.equal(state.bookedQueries.length,0);
});
test("missing paid enrolment and unrelated sports remain ineligible",async()=>{
  const state=fixture({paid:false}),response=res();await performance.createEvaluation(evaluationRequest(),response);assert.equal(response.code,403);assert.equal(state.created,0);
  const wrongSport=evaluationRequest();wrongSport.body.sportId="507f1f77bcf86cd799439098";const rejected=res();await performance.createEvaluation(wrongSport,rejected);assert.equal(rejected.code,403);assert.equal(state.created,0);
});
