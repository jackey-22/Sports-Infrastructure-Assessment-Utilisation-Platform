const {
  test,
  afterEach
} = require("node:test");
const assert = require("node:assert/strict");
const {
  parameterScore,
  evaluationPreview,
  evaluationPayload,
  preferredSport,
  achievementPayload
} = require("../src/utils/performance");
const qualitative = {
  _id: "p1",
  name: "Technique",
  active: true,
  evaluationType: "qualitative",
  maxScore: 5,
  weightage: 40
};
const higher = {
  _id: "p2",
  name: "Distance",
  active: true,
  evaluationType: "quantitative",
  benchmark: {
    min: 10,
    max: 30
  },
  weightage: 30
};
const lower = {
  _id: "p3",
  name: "Sprint",
  active: true,
  evaluationType: "statistical",
  benchmark: {
    min: 5,
    max: 15
  },
  scoringMethod: "lower_is_better",
  weightage: 30
};
const template = {
  _id: "507f1f77bcf86cd799439011",
  version: 2,
  parameters: [qualitative, higher, lower, {
    ...qualitative,
    _id: "inactive",
    active: false
  }],
  recognitionLevels: [{
    minScore: 75,
    label: "Excellent"
  }, {
    minScore: 0,
    label: "Developing"
  }]
};
const scores = {
  p1: "4",
  p2: "25",
  p3: "7.5"
};
test("normalizes qualitative, higher-is-better and lower-is-better parameters", () => {
  assert.equal(parameterScore(qualitative, 4), 80);
  assert.equal(parameterScore(higher, 25), 75);
  assert.equal(parameterScore(lower, 7.5), 75);
  assert.equal(parameterScore(lower, 5), 100);
  assert.equal(parameterScore(lower, 15), 0);
  assert.equal(parameterScore(qualitative, "0"), 0);
});
test("rejects blank, nonnumeric, nonfinite and out-of-range marks", () => {
  for (const value of [undefined, null, "", " ", "abc", NaN, Infinity, [], true, -1, 6]) assert.equal(parameterScore(qualitative, value), null);
  assert.equal(parameterScore(higher, 31), null);
  assert.equal(parameterScore(lower, 4), null);
  assert.equal(parameterScore({
    ...higher,
    benchmark: {
      min: 3,
      max: 3
    }
  }, 3), null);
});
test("weights active parameters out of 100 and identifies incomplete marks", () => {
  const preview = evaluationPreview(template, scores);
  assert.equal(preview.total, 77);
  assert.equal(preview.completed, 3);
  assert.equal(preview.valid, true);
  assert.equal(preview.details.length, 3);
  const incomplete = evaluationPreview(template, {
    p1: "4"
  });
  assert.equal(incomplete.valid, false);
  assert.match(incomplete.error, /Distance/);
  assert.equal(evaluationPreview({
    parameters: []
  }, {}).valid, false);
});
test("rounds each weighted result before summing, matching server storage", () => {
  const value = evaluationPreview({
    parameters: [{
      ...qualitative,
      maxScore: 3,
      weightage: 33.33
    }, {
      ...qualitative,
      _id: "p2",
      maxScore: 3,
      weightage: 33.33
    }, {
      ...qualitative,
      _id: "p3",
      maxScore: 3,
      weightage: 33.34
    }]
  }, {
    p1: 1,
    p2: 1,
    p3: 1
  });
  assert.equal(value.total, 33.33);
  assert.equal(value.details[0].normalizedScore, 33.33);
});
test("evaluation payload uses actual parameter values and preserves zero", () => {
  const row = {
    canRate: true,
    athleteId: "athlete"
  };
  const payload = evaluationPayload(row, "sport", template, {
    ...scores,
    p1: "0"
  }, "  Improve stamina  ");
  assert.equal(payload.details[0].actualValue, 0);
  assert.equal(payload.remarks, "Improve stamina");
  assert.equal(payload.totalScore, undefined);
  assert.throws(() => evaluationPayload({
    ...row,
    canRate: false
  }, "sport", template, scores, ""), /not eligible/);
  assert.throws(() => evaluationPayload(row, "sport", template, {}, ""), /Technique/);
});
test("sport defaults follow next booking, latest booking, then associated sport", () => {
  assert.equal(preferredSport({
    nextBooking: {
      sportId: "next"
    },
    latestBooking: {
      sportId: "last"
    }
  }), "next");
  assert.equal(preferredSport({
    latestBooking: {
      sportId: "last"
    },
    sports: [{
      id: "first"
    }]
  }), "last");
  assert.equal(preferredSport({
    sports: [{
      id: "first"
    }]
  }), "first");
  assert.equal(preferredSport(null), "");
});
const achievement = {
  sportId: "sport",
  title: "  Winner  ",
  category: "Gold Medal",
  achievementDate: "2026-11-18",
  description: "  Final  ",
  rank: "1",
  eventName: "District Open"
};
test("achievement input validates dates and required fields without changing verification state", () => {
  assert.equal(achievementPayload(achievement).title, "Winner");
  assert.equal(achievementPayload(achievement).description, "Final");
  for (const date of ["", "2026-02-30", "2026-13-01", "not-a-date"]) assert.throws(() => achievementPayload({
    ...achievement,
    achievementDate: date
  }), /valid achievement date/);
  assert.throws(() => achievementPayload({
    ...achievement,
    sportId: ""
  }), /Select a sport/);
});
test("mobile performance service uses the same API endpoints and returns server failures", async () => {
  const fs = require("node:fs"),
    vm = require("node:vm"),
    path = require("node:path"),
    babel = require("@babel/core");
  const calls = [],
    api = {
      async get(url) {
        calls.push(["GET", url]);
        return {
          data: url.endsWith("rateable-athletes") ? {
            athletes: []
          } : [{
            _id: "saved"
          }]
        };
      },
      async post(url, body) {
        calls.push(["POST", url, body]);
        return {
          data: {
            _id: "saved",
            totalScore: 77
          }
        };
      }
    };
  const code = babel.transformSync(fs.readFileSync(path.join(__dirname, "../src/services/performanceService.js"), "utf8"), {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")]
  }).code;
  const module = {
    exports: {}
  };
  vm.runInNewContext(code, {
    exports: module.exports,
    require: () => ({
      api
    })
  });
  const service = module.exports.performanceService;
  await service.coachRoster();
  await service.template("sport");
  const saved = await service.evaluate({
    athleteId: "athlete"
  });
  await service.ownEvaluations();
  await service.sports();
  await service.achievements();
  await service.submitAchievement(achievement);
  assert.deepEqual(calls.map(call => call[1]), ["/api/coach/rateable-athletes", "/api/evaluation-templates/sport", "/api/coach/evaluations", "/api/athlete/evaluations", "/getSports", "/api/athlete/achievements", "/api/athlete/achievements"]);
  assert.equal(saved.totalScore, 77);
  api.post = async () => {
    throw Error("No published evaluation template for this sport");
  };
  await assert.rejects(() => service.evaluate({}), /No published/);
});
const undo = [];
function stub(obj, key, value) {
  undo.push([obj, key, obj[key]]);
  obj[key] = value;
}
afterEach(() => {
  while (undo.length) {
    const [obj, key, value] = undo.pop();
    obj[key] = value;
  }
});
test("mobile preview matches the existing backend evaluation and athlete history", async () => {
  const Athlete = require("../../server/Model/athleteModel"),
    Instructor = require("../../server/Model/instructorModel"),
    Template = require("../../server/Model/EvaluationTemplateModel"),
    Evaluation = require("../../server/Model/PerformanceEvaluationModel"),
    controller = require("../../server/Controller/PerformanceController");
  const athleteId = "507f1f77bcf86cd799439012",
    sportId = "507f1f77bcf86cd799439013",
    facility = "507f1f77bcf86cd799439014",
    coachId = "507f1f77bcf86cd799439015",
    owner = "507f1f77bcf86cd799439016";
  const chain = value => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      populate() {
        return this;
      },
      async lean() {
        return value;
      }
    }),
    athlete = {
      _id: athleteId,
      userId: owner,
      SportComplexId: facility
    };
  let saved;
  stub(Athlete, "findById", () => chain(athlete));
  stub(Athlete, "findOne", () => chain(athlete));
  stub(Instructor, "findOne", () => chain({
    sports: [{
      sport: sportId
    }]
  }));
  stub(Template, "findOne", () => chain(template));
  stub(Evaluation, "create", async input => {
    saved = {
      _id: "evaluation",
      ...input
    };
    return saved;
  });
  stub(Evaluation, "find", query => {
    assert.equal(String(query.athlete), athleteId);
    return chain([saved]);
  });
  const response = () => ({
      code: 200,
      status(code) {
        this.code = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    }),
    res = response();
  await controller.createEvaluation({
    user: {
      _id: coachId,
      Role: 2,
      SportComplexId: facility
    },
    body: evaluationPayload({
      canRate: true,
      athleteId
    }, sportId, template, scores, "Good progress")
  }, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.data.totalScore, evaluationPreview(template, scores).total);
  assert.equal(res.body.data.recognition.label, "Excellent");
  const own = response();
  await controller.ownEvaluations({
    user: {
      _id: owner,
      Role: 0
    },
    query: {}
  }, own);
  assert.equal(own.code, 200);
  assert.equal(own.body.data[0].totalScore, 77);
});

test("evaluation cards render saved parameter results, recognition and remarks",()=> {
  const React=require("react"),{renderToStaticMarkup}=require("react-dom/server"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),babel=require("@babel/core");
  const host=tag=>({children})=>React.createElement(tag,null,children);
  const native={View:host("div"),TouchableOpacity:({children,disabled})=>React.createElement("button",{disabled},children),StyleSheet:{create:value=>value},ActivityIndicator:host("span")};
  const text={Text:host("span"),TextInput:()=>React.createElement("input")};
  const code=babel.transformSync(fs.readFileSync(path.join(__dirname,"../src/components/performance/PerformanceUI.js"),"utf8"),{babelrc:false,configFile:false,plugins:[require.resolve("@babel/plugin-transform-react-jsx"),require.resolve("@babel/plugin-transform-modules-commonjs")]}).code;
  const module={exports:{}};vm.runInNewContext(code,{exports:module.exports,require:name=>name==="react"?React:name==="react-native"?native:text});
  const {EvaluationCard,ResourceState}=module.exports;
  const evaluation={sport:{SportName:"Athletics"},totalScore:77,recognition:{label:"Excellent"},coach:{Name:"Test Coach"},evaluationDate:"2026-11-18",templateVersion:2,details:[{parameterId:"p1",parameterName:"Sprint",actualValue:7.5,normalizedScore:75,weightedScore:22.5}],remarks:"Improve stamina"};
  const markup=renderToStaticMarkup(React.createElement(EvaluationCard,{evaluation}));
  for(const text of ["Athletics","77.00","100","Excellent","Test Coach","Sprint","7.5","75.00","22.50","Improve stamina"]) assert.ok(markup.includes(text));
  const unavailable=renderToStaticMarkup(React.createElement(ResourceState,{error:"No published evaluation template for this sport",onRetry:()=>{}}));assert.ok(unavailable.includes("No published evaluation template"));assert.ok(unavailable.includes("Retry"));
});
