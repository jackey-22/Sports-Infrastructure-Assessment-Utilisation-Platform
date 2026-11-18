const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),babel=require("@babel/core");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const host=tag=>({children})=>React.createElement(tag,null,children);
const Text=({children,numberOfLines,accessibilityRole})=>React.createElement("span",{"data-lines":numberOfLines,role:accessibilityRole==="header"?"heading":undefined},children);
const native={View:host("div"),Image:()=>React.createElement("img",{alt:""}),TouchableOpacity:({children,accessibilityLabel,disabled})=>React.createElement("button",{"aria-label":accessibilityLabel,disabled},children),ScrollView:host("main"),StyleSheet:{create:value=>value},StatusBar:()=>null};
function load(relative,overrides={}) {
  const filename=path.join(__dirname,"../src/components/common/",relative),code=babel.transformSync(fs.readFileSync(filename,"utf8"),{babelrc:false,configFile:false,plugins:[require.resolve("@babel/plugin-transform-react-jsx"),require.resolve("@babel/plugin-transform-modules-commonjs")]}).code;
  const state={exports:{}};
  vm.runInNewContext(code,{exports:state.exports,require:name=> {
    if(Object.hasOwn(overrides,name))return overrides[name];
    if(name==="react")return React;
    if(name==="react-native")return native;
    if(name==="@expo/vector-icons")return {Ionicons:()=>null,MaterialCommunityIcons:()=>null};
    if(name==="expo-linear-gradient")return {LinearGradient:host("section")};
    if(name==="react-native-svg")return {__esModule:true,default:host("svg"),Path:()=>null};
    if(name.includes("AppText"))return {Text};
    if(name.endsWith(".png"))return 1;
    throw Error("Unexpected dependency: "+name);
  }});
  return state.exports;
}
const header=load("AppHeader.js");
test("standard and compact headers use the same SAG branding without fake notifications or role codes",()=> {
  for(const variant of ["standard","compact"]) {
    const markup=renderToStaticMarkup(React.createElement(header.default,{title:"Grievances",subtitle:"Track your requests",variant}));
    for(const value of ["Government of Gujarat","Sports Authority of Gujarat (SAG)","Grievances","Track your requests"])assert.ok(markup.includes(value));
    assert.ok(!markup.includes("Go back"));assert.ok(!markup.includes("Sign out"));assert.ok(!markup.includes("notification"));assert.ok(!markup.includes("ROLE 0"));
  }
});
test("header actions preserve callbacks and disabled state and omit actions without a handler",()=> {
  let back=0,logout=0,share=0;
  for(const [label,callback] of [["Go back",()=>back++],["Sign out",()=>logout++],["Share facility",()=>share++]]) {
    const element=header.HeaderAction({label,icon:"arrow-back",onPress:callback});element.props.onPress();assert.equal(element.props.accessibilityLabel,label);
  }
  assert.deepEqual([back,logout,share],[1,1,1]);
  assert.equal(header.HeaderAction({label:"Missing"}),null);
  assert.equal(header.HeaderAction({label:"Saving",onPress:()=>{},disabled:true}).props.disabled,true);
  assert.ok(header.headerTokens.actionSize>=44);
  const markup=renderToStaticMarkup(React.createElement(header.default,{title:"Facility",onBack:()=>{},onLogout:()=>{},actions:[{label:"Share facility",icon:"share-social-outline",onPress:()=>{}}]}));
  for(const label of ["Go back","Sign out","Share facility"])assert.ok(markup.includes(label));
});
test("long titles keep a two-line accessible heading and subtitle is optional",()=> {
  const title="Performance and achievements for a long facility and sport title";
  const markup=renderToStaticMarkup(React.createElement(header.default,{title}));
  assert.ok(markup.includes(title));assert.ok(markup.includes('data-lines="2"'));assert.ok(markup.includes('role="heading"'));assert.ok(!markup.includes("undefined"));
});
test("scroll layout puts the header inside the scroll and preserves refresh and keyboard behavior",()=> {
  const module=load("AppScreenScroll.js",{"./AppHeader":{APP_BACKGROUND:"#F3F6F9"}});
  const refresh=React.createElement("refresh"),heading=React.createElement("header"),body=React.createElement("body");
  const onScroll=()=>{},element=module.default.render({header:heading,children:body,refreshControl:refresh,keyboardShouldPersistTaps:"handled",onScroll},null);
  assert.equal(element.type,native.ScrollView);assert.equal(element.props.refreshControl,refresh);assert.equal(element.props.onScroll,onScroll);assert.equal(element.props.keyboardShouldPersistTaps,"handled");
  assert.equal(element.props.children[0],heading);assert.equal(element.props.children[1].props.children,body);
});
test("the app shell owns a single safe-area boundary outside screen content",()=> {
  const Provider=host("provider"),Safe=host("safe"),metrics={insets:{top:24,bottom:16,left:0,right:0}};
  const module=load("AppShell.js",{"./AppHeader":{APP_BACKGROUND:"#F3F6F9",HEADER_GREEN:"#073D2D"},"react-native-safe-area-context":{SafeAreaProvider:Provider,SafeAreaView:Safe,initialWindowMetrics:metrics}});
  const element=module.default({children:React.createElement("screen")});
  assert.equal(element.type,Provider);assert.equal(element.props.initialMetrics,metrics);assert.equal(element.props.children.type,Safe);assert.deepEqual(Array.from(element.props.children.props.edges),["top","left","right","bottom"]);
  assert.equal(element.props.children.props.children[1].props.children.type,"screen");
});
const parser=require("@babel/parser"),traverse=require("@babel/traverse").default;
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
test("all 20 active screen modules use the shared scrolling header including empty branches",()=> {
  const files=walk(path.join(__dirname,"../src/screens")).filter(file=>file.endsWith(".js")&&!file.endsWith(`${path.sep}SupervisorScanScreen.js`));assert.equal(files.length,20);
  for(const file of files) {
    const ast=parser.parse(fs.readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]});let headers=0;
    traverse(ast,{JSXElement(p){const name=p.node.openingElement.name.name;
      assert.ok(!["SafeAreaView","CitizenHeader","SagHeader","FacilityHeader","StatusBar"].includes(name),file+": duplicate header or safe area");
      if(name==="AppHeader") {headers++;const attr=p.findParent(a=>a.isJSXAttribute()&&a.node.name.name==="header");assert.ok(attr,file+": header is not in the scroll container");assert.equal(attr.parentPath.node.name.name,"AppScreenScroll");}
    }});
    assert.ok(headers>=1,file+": no shared header");
  }
});

test("wave occupies a container anchored to both header edges independently of text padding",()=> {
  const element=header.default({title:"Grievances"});
  const children=React.Children.toArray(element.props.children);
  const wave=children[children.length-1];
  assert.equal(wave.props.style.position,"absolute");
  assert.equal(wave.props.style.left,0);assert.equal(wave.props.style.right,0);
  assert.equal(wave.props.children.props.width,"100%");
  assert.equal(wave.props.style.height,header.headerTokens.waveHeight);
});
