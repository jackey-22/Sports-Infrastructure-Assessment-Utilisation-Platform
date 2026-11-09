// Offline demo accounts.
//
// The Admin/Manager/Coach/Citizen modules read from the local demo store and
// never call the API, but login and the role-gated route loaders still went to
// http://localhost:9999. These accounts let the whole product be demonstrated
// with no backend running.
//
// shortcut: fixed client-side credentials plus a "demo:" token; demo use only,
// replace with real verification once the API is always available.
import { MANAGER_FACILITY_ID } from "../../data/manager/managerDemoData";
import { COACH_FACILITY_ID } from "../../data/coach/coachDemoData";

const TOKEN_PREFIX = "demo:";

// Mirrors the accounts created by seedDatabase.js, so the same credentials work
// online and offline.
const ACCOUNTS = [
  {
    _id: "demo-admin-0001",
    Name: "Dr. Arvind Patel, IAS (Director General)",
    Email: "admin@sag.gujarat.gov.in",
    Password: "admin",
    ContactNum: "+91 79 2328 7411",
    DOB: "1975-04-12",
    Role: 5,
    DistrictId: "Gandhinagar",
    SportComplexId: "",
    IsActive: 1,
  },
  {
    _id: "demo-authority-0001",
    Name: "Shri Bhavik Solanki (DSO Ahmedabad)",
    Email: "dso.ahmedabad@sag.gujarat.gov.in",
    Password: "dso",
    ContactNum: "+91 79 2216 4800",
    DOB: "1982-08-20",
    Role: 4,
    DistrictId: "Ahmedabad",
    SportComplexId: "",
    IsActive: 1,
  },
  {
    _id: "demo-manager-0001",
    Name: "Rajesh Vaghela (Complex Manager)",
    Email: "manager.khokhra@sag.gujarat.gov.in",
    Password: "manager",
    ContactNum: "+91 79 2216 4801",
    DOB: "1988-11-05",
    Role: 3,
    DistrictId: "Ahmedabad",
    SportComplexId: MANAGER_FACILITY_ID,
    IsActive: 1,
  },
  {
    _id: "demo-coach-0001",
    Name: "Nirav Joshi (Badminton Coach)",
    Email: "coach.khokhra@sag.gujarat.gov.in",
    Password: "coach",
    ContactNum: "+91 79 2216 4810",
    DOB: "1990-04-18",
    Role: 2,
    DistrictId: "Ahmedabad",
    SportComplexId: COACH_FACILITY_ID,
    IsActive: 1,
  },
  {
    _id: "demo-athlete-0001",
    Name: "Aarav Trivedi (Badminton Athlete)",
    Email: "athlete.aarav@gmail.com",
    Password: "athlete",
    ContactNum: "+91 98980 12345",
    DOB: "2002-09-14",
    Role: 0,
    DistrictId: "Ahmedabad",
    SportComplexId: COACH_FACILITY_ID,
    IsActive: 1,
  },
];

function withoutPassword({ Password, ...user }) {
  return user;
}

// Returns the public user (no password) when the credentials match, else null.
export function findDemoUser(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  const account = ACCOUNTS.find(
    (item) => item.Email.toLowerCase() === normalized && item.Password === password
  );
  return account ? withoutPassword(account) : null;
}

export function demoToken(user) {
  return `${TOKEN_PREFIX}${user._id}`;
}

// Resolves a locally-issued demo token back to its user, or null for real tokens.
export function readDemoToken(token) {
  if (typeof token !== "string" || !token.startsWith(TOKEN_PREFIX)) return null;
  const account = ACCOUNTS.find(
    (item) => item._id === token.slice(TOKEN_PREFIX.length)
  );
  return account ? withoutPassword(account) : null;
}

export function homeForRole(role) {
  switch (role) {
    case 5:
      return "/admin";
    case 4:
      return "/authority";
    case 3:
      return "/manager/overview";
    case 2:
      return "/coach/dashboard";
    case 0:
      return "/citizen/dashboard";
    default:
      return "/";
  }
}
