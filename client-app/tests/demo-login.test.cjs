const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const parser=require("@babel/parser"),traverse=require("@babel/traverse").default,generate=require("@babel/generator").default;
const source=fs.readFileSync(path.join(__dirname,"../src/screens/Auth/LoginScreen.js"),"utf8");
const ast=parser.parse(source,{sourceType:"module",plugins:["jsx"]});let fn;
traverse(ast,{VariableDeclarator(p){if(p.node.id.name==="handleQuickDemoLogin")fn=p.node.init;}});
function fixture(login){const state={success:[],alerts:[],loading:[]},context={login,loginLock:{current:false},setLoading:value=>state.loading.push(value),setEmail:value=>state.email=value,setPassword:value=>state.password=value,setShowDemos:()=>{},onLoginSuccess:value=>state.success.push(value),Alert:{alert:(...args)=>state.alerts.push(args)}};state.run=vm.runInNewContext("("+generate(fn).code+")",context);return state;}
test("demo shortcut authenticates the selected credentials and uses the real database identity",async()=> {
  const calls=[],user={_id:"real-database-id",Name:"Actual user",Role:2},state=fixture(async(email,password)=>{calls.push([email,password]);return user;});
  await state.run({email:"demo@example.test",password:"test-only"});
  assert.deepEqual(calls,[["demo@example.test","test-only"]]);assert.equal(state.success[0],user);assert.deepEqual(state.loading,[true,false]);assert.equal(state.alerts.length,0);
  assert.ok(!source.includes("demo_jwt_token"));assert.ok(!source.includes("mockUser"));
});
test("failed demo sign-in surfaces the server error without fabricating a successful session",async()=> {
  const state=fixture(async()=>{throw Error("Invalid credentials");});await state.run({email:"demo@example.test",password:"test-only"});
  assert.equal(state.success.length,0);assert.equal(state.alerts[0][1],"Invalid credentials");assert.deepEqual(state.loading,[true,false]);
});
test("rapid demo taps submit only one login request",async()=> {
  let calls=0,resolve;const deferred=new Promise(done=>resolve=done),state=fixture(async()=>{calls++;return deferred;});
  const first=state.run({email:"demo@example.test",password:"test-only"});await state.run({email:"demo@example.test",password:"test-only"});assert.equal(calls,1);resolve({_id:"real"});await first;assert.equal(state.success.length,1);
});

test("an existing personal athlete account prompts for its password without inventing credentials",async()=> {
  let calls=0;const state=fixture(async()=>{calls++;});await state.run({email:"linked@example.test"});
  assert.equal(calls,0);assert.equal(state.email,"linked@example.test");assert.equal(state.password,"");assert.equal(state.success.length,0);assert.equal(state.alerts[0][0],"Athlete sign-in");
});
