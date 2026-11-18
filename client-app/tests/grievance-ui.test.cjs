const {
  test
} = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const {
  renderToStaticMarkup
} = require("react-dom/server");
const babel = require("@babel/core"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const host = tag => ({
  children
}) => React.createElement(tag, null, children);
const text = {
  Text: host("span"),
  TextInput: props => React.createElement("textarea", {
    "aria-label": props.accessibilityLabel,
    placeholder: props.placeholder,
    defaultValue: props.value
  })
};
const native = {
  View: host("div"),
  ScrollView: host("div"),
  SafeAreaView: host("main"),
  TouchableOpacity: host("button"),
  ActivityIndicator: host("span"),
  StyleSheet: {
    create: value => value
  },
  Platform: {
    OS: "web"
  },
  Image: host("img")
};
const Picker = host("select");
Picker.Item = host("option");
const code = babel.transformSync(fs.readFileSync(path.join(__dirname, "../src/screens/Citizen/ComplaintsScreen.js"), "utf8"), {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve("@babel/plugin-transform-react-jsx"), require.resolve("@babel/plugin-transform-modules-commonjs")]
}).code;
const moduleState = {
  exports: {}
};
vm.runInNewContext(code, {
  exports: moduleState.exports,
  require: name => {
    if (name === "react") return React;
    if (name === "react-native") return native;
    if (name.includes("AppText")) return text;
    if (name === "@react-native-picker/picker") return {
      Picker
    };
    if (name === "@expo/vector-icons") return {
      Ionicons: () => null,
      MaterialCommunityIcons: () => null
    };
    if (name === "expo-linear-gradient") return {
      LinearGradient: host("div")
    };
    if (name === "react-native-svg") return {
      __esModule: true,
      default: host("svg"),
      Path: host("path")
    };
    return {};
  }
});
const {
  GrievanceCard
} = moduleState.exports;
const item = {
  _id: "ticket",
  subject: "Broken lighting",
  Description: "Floodlight is not working",
  userId: {
    Name: "Test Athlete"
  },
  sportsComplex: {
    name: "Test Sports Complex"
  },
  workflowStatus: "Open",
  handlingRole: "Manager",
  dueAt: "2026-11-20T10:00:00Z",
  photo: "https://example.com/photo.jpg",
  permissions: {
    canRespond: true,
    canResolve: true,
    canEscalate: true
  },
  history: []
};
const render = citizen => renderToStaticMarkup(React.createElement(GrievanceCard, {
  item,
  citizen,
  busy: false,
  response: "",
  onResponse: () => {},
  onAction: () => {},
  onAttachment: () => {}
}));
test("citizen card hides all staff actions even with stale escalation permissions", () => {
  const markup = render(true);
  for (const value of ["Broken lighting", "Test Sports Complex", "Test Athlete", "Deadline", "View attachment"]) assert.ok(markup.includes(value));
  assert.ok(!markup.includes("Escalate"));
  assert.ok(!markup.includes("escalation reason"));
  assert.ok(!markup.includes("Resolve"));
  assert.ok(!markup.includes("Write a response"));
});
test("staff card retains response, resolve and escalation actions in the shared design", () => {
  const markup = render(false);
  for (const value of ["Broken lighting", "Respond", "Resolve", "Escalate", "Response or escalation reason"]) assert.ok(markup.includes(value));
});
test("citizen cards can display escalated status without offering manual escalation", () => {
  const markup = renderToStaticMarkup(React.createElement(GrievanceCard, {
    item: {
      ...item,
      workflowStatus: "Escalated",
      handlingRole: "District Authority"
    },
    citizen: true,
    busy: false
  }));
  assert.ok(markup.includes("District Authority"));
  assert.ok(markup.includes("Escalated"));
  assert.ok(!markup.includes("Response or escalation reason"));
  assert.ok(!markup.includes(">Escalate<"));
});
