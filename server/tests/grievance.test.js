const {
  test,
  afterEach
} = require("node:test");
const assert = require("node:assert/strict");
const Complaint = require("../Model/ComplaintModel");
const Facility = require("../Model/SportsComplexModel");
const Athlete = require("../Model/athleteModel");
const User = require("../Model/UsersModel");
const Reminder = require("../Model/Reminder");
const controller = require("../Controller/GrievanceController");
const policy = require("../Utils/grievancePolicy");
const {
  gateOperatorAllowed
} = require("../Middleware/auth.middleware");
const facility = "507f1f77bcf86cd799439011",
  other = "507f1f77bcf86cd799439012",
  owner = "507f1f77bcf86cd799439013",
  id = "507f1f77bcf86cd799439014",
  district = "507f1f77bcf86cd799439015";
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
function res() {
  return {
    code: 200,
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}
function chain(value) {
  return {
    select() {
      return this;
    },
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => value
  };
}
function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === "$and") return value.every(item => matches(row, item));
    if (key === "$or") return value.some(item => matches(row, item));
    if (value && typeof value === "object" && !(value instanceof Date)) return Object.entries(value).every(([op, v]) => op === "$ne" ? String(row[key]) !== String(v) : op === "$in" ? v.map(String).includes(String(row[key])) : op === "$lt" ? row[key] < v : op === "$lte" ? new Date(row[key]) <= new Date(v) : false);
    return String(row[key]) === String(value);
  });
}
function fixture(extra = {}) {
  const state = {
    rows: [{
      _id: id,
      userId: owner,
      sportsComplex: facility,
      level: 0,
      status: 0,
      workflowStatus: "Open",
      revision: 0,
      workflowVersion: 1,
      dueAt: policy.nextDeadline(),
      remarks: [],
      history: [],
      ...extra
    }],
    notifications: [],
    queries: []
  };
  stub(Complaint, "updateMany", async (query, update) => {
    state.normalization = update;
  });
  stub(Complaint, "find", query => chain(state.rows.filter(row => matches(row, query)).map(row => ({
    ...row
  }))));
  stub(Complaint, "findById", key => chain(structuredClone(state.rows.find(row => row._id === key))));
  stub(Complaint, "create", async input => {
    const row = {
      _id: id,
      ...input
    };
    state.rows.push(row);
    return row;
  });
  stub(Complaint, "findOneAndUpdate", async (query, update) => {
    const row = state.rows.find(row => matches(row, query));
    if (!row) return null;
    Object.assign(row, update.$set);
    row.revision += update.$inc.revision;
    for (const [key, value] of Object.entries(update.$push)) row[key].push(value);
    return {
      ...row
    };
  });
  stub(Facility, "exists", async () => true);
  stub(Facility, "find", query => {
    state.facilityQuery = query;
    return chain([{
      _id: facility,
      name: "Test facility"
    }]);
  });
  stub(Facility, "findById", () => chain({
    district
  }));
  stub(Athlete, "findOne", () => chain({
    SportComplexId: facility
  }));
  stub(User, "find", query => {
    state.queries.push(query);
    return chain([{
      _id: "507f1f77bcf86cd799439016"
    }]);
  });
  stub(Reminder.prototype, "save", async function () {
    state.notifications.push(this);
    return this;
  });
  return state;
}
function user(Role, extra = {}) {
  return {
    _id: owner,
    Role,
    SportComplexId: facility,
    DistrictId: district,
    ...extra
  };
}
function req(Role, body = {}, extra = {}) {
  return {
    user: user(Role),
    body,
    params: {
      id
    },
    query: {},
    ...extra
  };
}
test("all roles start at their confirmed higher handling level", async () => {
  const expected = [0, 1, 0, 2, 3, 3, 0];
  for (let role = 0; role <= 6; role++) {
    const state = fixture();
    const response = res();
    await controller.createGrievance(req(role, {
      sportsComplex: facility,
      subject: "Broken net",
      description: "Needs repair"
    }), response);
    assert.equal(response.code, 201);
    assert.equal(response.body.data.level, expected[role]);
    assert.equal(response.body.data.history[0].role, role);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.queries[0].Role, policy.HANDLERS[expected[role]]);
  }
});
test("staff creation rejects a foreign facility and validates fields and evidence", async () => {
  fixture();
  for (const [body, code] of [[{
    sportsComplex: other,
    description: "Issue"
  }, 403], [{
    sportsComplex: facility,
    description: ""
  }, 400], [{
    sportsComplex: facility,
    description: "Issue",
    proofUrl: "file:///bad"
  }, 400]]) {
    const response = res();
    await controller.createGrievance(req(3, body), response);
    assert.equal(response.code, code);
  }
});
test("permissions reject wrong roles, self handling, foreign facilities and resolved records", () => {
  const row = {
    userId: owner,
    level: 1,
    status: 0,
    workflowStatus: "Open"
  };
  assert.equal(policy.permissions(row, user(3, {
    _id: other
  }), true).canRespond, true);
  assert.equal(policy.permissions(row, user(3), true).canRespond, false);
  assert.equal(policy.permissions(row, user(4, {
    _id: other
  }), true).canRespond, false);
  assert.equal(policy.permissions(row, user(3, {
    _id: other
  }), false).canRespond, false);
  assert.equal(policy.permissions({
    ...row,
    status: 1
  }, user(0), true).canEscalate, false);
});
test("list views enforce complainant, facility, role and district boundaries", async () => {
  const state = fixture({
    level: 1
  });
  state.rows.push({
    ...state.rows[0],
    _id: other,
    userId: other,
    sportsComplex: other
  });
  let response = res();
  await controller.grievanceList(req(0, {}, {
    query: {
      view: "mine"
    }
  }), response);
  assert.equal(response.body.data.length, 1);
  response = res();
  await controller.grievanceList(req(3, {}, {
    user: user(3, {
      _id: "manager"
    }),
    query: {
      view: "assigned"
    }
  }), response);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].permissions.canRespond, true);
  response = res();
  await controller.grievanceList(req(2, {}, {
    query: {
      view: "assigned"
    }
  }), response);
  assert.equal(response.body.data.length, 0);
  state.rows[0].level = 2;
  response = res();
  await controller.grievanceList(req(4, {}, {
    user: user(4, {
      _id: "authority"
    }),
    query: {
      view: "assigned"
    }
  }), response);
  assert.equal(response.body.data.length, 1);
  assert.equal(state.facilityQuery.district, district);
});
test("staff complainants manually escalate each step, with a reason, and stop at Admin", async () => {
  const state = fixture();
  let response = res();
  await controller.escalateGrievance(req(2, {
    reason: ""
  }), response);
  assert.equal(response.code, 400);
  for (let level = 1; level <= 3; level++) {
    response = res();
    await controller.escalateGrievance(req(2, {
      reason: "Still unresolved",
      revision: level - 1
    }), response);
    assert.equal(response.code, 200);
    assert.equal(state.rows[0].level, level);
    assert.equal(state.rows[0].history.length, level);
    assert.ok(state.rows[0].dueAt > new Date());
  }
  response = res();
  await controller.escalateGrievance(req(2, {
    reason: "Again"
  }), response);
  assert.equal(response.code, 403);
});
test("only current handlers respond or resolve and responses preserve the deadline", async () => {
  const state = fixture({
      level: 1
    }),
    originalDeadline = state.rows[0].dueAt;
  let response = res();
  await controller.respondGrievance(req(1, {
    response: "Wrong role"
  }, {
    user: user(1, {
      _id: other
    })
  }), response);
  assert.equal(response.code, 403);
  response = res();
  await controller.respondGrievance(req(3, {
    response: "Working on it",
    resolve: false
  }, {
    user: user(3, {
      _id: other
    })
  }), response);
  assert.equal(response.code, 200);
  assert.equal(state.rows[0].dueAt, originalDeadline);
  assert.equal(state.rows[0].status, 0);
  response = res();
  await controller.respondGrievance(req(3, {
    response: "Repaired",
    resolve: true
  }, {
    user: user(3, {
      _id: other
    })
  }), response);
  assert.equal(response.code, 200);
  assert.equal(state.rows[0].status, 1);
  assert.equal(state.rows[0].workflowStatus, "Resolved");
  assert.ok(state.rows[0].resolvedAt);
  response = res();
  await controller.escalateGrievance(req(2, {
    reason: "Again"
  }), response);
  assert.equal(response.code, 403);
});
test("foreign facilities, malformed IDs, stale revisions and nonboolean resolution are rejected", async () => {
  fixture({
    level: 1
  });
  const cases = [req(3, {
    response: "x"
  }, {
    user: user(3, {
      _id: other,
      SportComplexId: other
    })
  }), req(3, {
    response: "x"
  }, {
    params: {
      id: "bad"
    }
  }), req(0, {
    reason: "x",
    revision: 9
  }), req(3, {
    response: "x",
    resolve: "false"
  }, {
    user: user(3, {
      _id: other
    })
  })];
  for (let index = 0; index < cases.length; index++) {
    const response = res();
    await (index === 2 ? controller.escalateGrievance : controller.respondGrievance)(cases[index], response);
    assert.equal(response.code, [403, 400, 409, 400][index]);
  }
});
test("concurrent manual requests advance once and notify once", async () => {
  const state = fixture();
  const responses = [res(), res()];
  await Promise.all(responses.map(response => controller.escalateGrievance(req(2, {
    reason: "Unresolved",
    revision: 0
  }), response)));
  assert.equal(state.rows[0].level, 1);
  assert.equal(state.rows[0].history.length, 1);
  assert.equal(state.notifications.length, 1);
  assert.deepEqual(responses.map(r => r.code).sort(), [200, 409]);
});
test("overdue jobs escalate responded grievances one step without repeating", async () => {
  const state = fixture({
    workflowStatus: "Responded",
    dueAt: new Date(0)
  });
  await Promise.all([controller.escalateOverdueComplaints(), controller.escalateOverdueComplaints()]);
  assert.equal(state.rows[0].level, 1);
  assert.equal(state.rows[0].history.length, 1);
  assert.equal(state.notifications.length, 1);
  assert.equal(await controller.escalateOverdueComplaints(), 0);
  state.rows[0].level = 3;
  state.rows[0].dueAt = new Date(0);
  assert.equal(await controller.escalateOverdueComplaints(), 0);
  state.rows[0].level = 2;
  state.rows[0].status = 1;
  assert.equal(await controller.escalateOverdueComplaints(), 0);
});
test("manual escalation racing the scheduler advances once", async () => {
  const state = fixture({
      dueAt: new Date(0)
    }),
    response = res();
  await Promise.all([controller.escalateOverdueComplaints(), controller.escalateGrievance(req(2, {
    reason: "Overdue",
    revision: 0
  }), response)]);
  assert.equal(state.rows[0].level, 1);
  assert.equal(state.rows[0].history.length, 1);
  assert.equal(state.notifications.length, 1);
});
test("legacy normalization preserves deadlines and resolution state", async () => {
  const state = fixture();
  await controller.normalizeLegacy();
  const fields = state.normalization[0].$set;
  assert.deepEqual(fields.dueAt.$ifNull[0], "$dueAt");
  assert.equal(fields.workflowVersion, 1);
  assert.ok(JSON.stringify(fields.workflowStatus).includes("Resolved"));
});
test("gate accounts gain only scoped grievance and evidence APIs", () => {
  for (const [method, path] of [["GET", "/api/grievances"], ["GET", "/api/grievances/facilities"], ["POST", "/api/grievances"], ["POST", `/api/grievances/${id}/escalate`], ["POST", "/api/uploads/attachment"]]) assert.equal(gateOperatorAllowed({
    method,
    path
  }, user(6)), true);
  for (const [method, path] of [["POST", `/api/grievances/${id}/respond`], ["GET", "/getAllComplaints"], ["GET", "/api/dashboard/admin"]]) assert.equal(gateOperatorAllowed({
    method,
    path
  }, user(6)), false);
});
test("legacy filters narrow scope and reject query injection", async () => {
  fixture();
  let response = res();
  await controller.grievanceList(req(0, {}, {
    query: {
      userId: other
    }
  }), response);
  assert.equal(response.body.data.length, 0);
  response = res();
  await controller.grievanceList(req(0, {}, {
    query: {
      _id: {
        $ne: id
      }
    }
  }), response);
  assert.equal(response.code, 400);
  response = res();
  await controller.grievanceList(req(0, {}, {
    query: {
      level: "9"
    }
  }), response);
  assert.equal(response.code, 400);
});
test("legacy clients cannot request a skipped escalation level", async () => {
  fixture();
  const response = res();
  await controller.escalateGrievance(req(2, {
    reason: "Skip",
    level: 3
  }), response);
  assert.equal(response.code, 400);
});
test("notification storage failure does not report a committed grievance as failed", async () => {
  fixture();
  stub(Reminder.prototype, "save", async () => {
    throw Error("storage unavailable");
  });
  stub(console, "error", () => {});
  const response = res();
  await controller.createGrievance(req(0, {
    sportsComplex: facility,
    description: "Broken net"
  }), response);
  assert.equal(response.code, 201);
});

test("Athlete/Citizen cannot manually escalate even their own grievance", async () => {
  const state = fixture();
  assert.equal(policy.permissions(state.rows[0], user(0), true).canEscalate, false);
  const response = res();
  await controller.escalateGrievance(req(0, {reason:"Please escalate", revision:0}), response);
  assert.equal(response.code,403);
  assert.equal(state.rows[0].level,0);
  assert.equal(state.notifications.length,0);
});
