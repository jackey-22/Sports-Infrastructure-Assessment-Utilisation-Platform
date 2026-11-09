import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@material-tailwind/react";
import { PrimeReactProvider } from "primereact/api";
import AdminPanel from "./Components/Admin/AdminPanel";

//Authenatication
import LoginVerify from "./Components/Auth/LoginVerify";
import Verify from "./Components/Auth/Verify";

//Login Page (Common for All)
import Login from "./Pages/Login";
import HomeLanding from "./Components/Public/HomeLanding";
import PublicExplore from "./Components/Public/PublicExplore";

//ErrorPage
import ErrorPage from "./Pages/ErrorPage";

//All Layout
import AuthorityLayout from "./Components/Authority/Layout";
import ManagerLayout from "./Components/Manager/Layout";

import AuthorityDashboard from "./Pages/AuthorityDashboard";
import ManagerDashboard from "./Pages/ManagerDashboard";
import AdminDashboard from "./Pages/AdminDashboard";

//Authority Pages
import AddManager from "./Components/Authority/Manager/AddManager";
import AllManager from "./Components/Authority/Manager/AllManager";
import AllAuthoritySportsComplex from "./Components/Authority/SportsComplex/AllSportsComplex";
import Profile from "./Components/Authority/Profile/Profile";

// Manager Pages

import AuthorityProfile from "./Components/Manager/Profile";
import AddSupervisor from "./Components/Manager/Supervisor/AddSupervisor";
import AllSupervisor from "./Components/Manager/Supervisor/AllSupervisor";
import AddInstructor from "./Components/Manager/Instructor/AddInstructor";
import AllInstructor from "./Components/Manager/Instructor/AllInstructor";
import SportsComplexDetails from "./Components/Manager/SportsComplexDetails/SportsComplexDetails";
import EditSportsComplexDetails from "./Components/Manager/SportsComplexDetails/EditSportsComplexDetails";
import ComplaintDetails from "./Components/Manager/Complaint/ComplainDetails";
import AuthorityComplaintDataTable from "./Components/Authority/Complaint/ComplaintDetails";
import Athelte from "./Components/Manager/Athelte/Athelte";
import AddComplaint from "./Components/Authority/Complaint/AddComplaint";
import ManagerAddComplaint from "./Components/Manager/Complaint/ManagerAddComplaint";
import ComplexNews from "./Components/Manager/News/ComplexNews";
import AddComplexNews from "./Components/Manager/News/AddComplexNews";
import Leaderboard from "./Components/Admin/LeaderBoard/Leaderboard";
import Utilization from "./Components/Manager/Analysis/Utilization";
import AuthorityAnalysis from "./Components/Authority/Analysis/AuthorityAnalysis";
// import SlotDataTable from "./Components/Manager/SlotDataTable";
import Slot from "./Components/Manager/Slot";

// Phase 2C.2 Manager modules
import ManagerTransactionList from "./Components/Manager/Transaction/ManagerTransactionList";
import ManagerGrantList from "./Components/Manager/Grant/ManagerGrantList";
import ManagerGrantDetail from "./Components/Manager/Grant/ManagerGrantDetail";
import ManagerProofSubmission from "./Components/Manager/Grant/ManagerProofSubmission";
import ManagerAssessmentList from "./Components/Manager/Assessment/ManagerAssessmentList";
import ManagerAssessmentForm from "./Components/Manager/Assessment/ManagerAssessmentForm";
import ManagerAssessmentDetail from "./Components/Manager/Assessment/ManagerAssessmentDetail";
import ManagerOverviewDashboard from "./Components/Manager/Dashboard/ManagerDashboard";

// Phase 2C.3 Coach modules
import CoachLayout from "./Components/Coach/Layout";
import CoachDashboard from "./Components/Coach/Dashboard/CoachDashboard";
import CoachAthleteList from "./Components/Coach/Athletes/CoachAthleteList";
import CoachAthleteProfile from "./Components/Coach/AthleteProfile/CoachAthleteProfile";
import CoachRateAthlete from "./Components/Coach/Rating/CoachRateAthlete";
import CoachRatingHistory from "./Components/Coach/RatingHistory/CoachRatingHistory";

// Phase 2C.4 Citizen modules
import CitizenLayout from "./Components/Citizen/Layout";
import CitizenDashboard from "./Components/Citizen/Dashboard/CitizenDashboard";
import CitizenAttendance from "./Components/Citizen/Attendance/CitizenAttendance";
import CitizenFeedback from "./Components/Citizen/Feedback/CitizenFeedback";
import CitizenComplaints from "./Components/Citizen/Complaints/CitizenComplaints";
import CitizenProfile from "./Components/Citizen/Profile/CitizenProfile";

// Admin Phase 2C.1 modules
import AdminModuleLayout from "./Components/Admin/ModuleLayout";
import GrievanceList from "./Components/Admin/Grievance/GrievanceList";
import TransactionList from "./Components/Admin/Transaction/TransactionList";
import GrantList from "./Components/Admin/Grant/GrantList";
import AdminAssessmentList from "./Components/Admin/Assessment/AdminAssessmentList";
import GrantAllocation from "./Components/Admin/Grant/GrantAllocation";
import GrantDetail from "./Components/Admin/Grant/GrantDetail";

const routes = createBrowserRouter([
  {
    path: "/",
    element: <HomeLanding />,
  },
  {
    path: "/explore",
    element: <PublicExplore />,
  },
  {
    path: "/login",
    element: <Login />,
    loader: LoginVerify,
    errorElement: <ErrorPage />,
  },
  {
    path: "/admin",
    element: <AdminPanel />,
    loader: () => {
      return Verify(5);
    },
    errorElement: <ErrorPage />,
  },
  {
    path: "/admin/insights",
    element: <AdminModuleLayout />,
    loader: () => {
      return Verify(5);
    },
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "grievances", element: <GrievanceList /> },
      { path: "transactions", element: <TransactionList /> },
      { path: "grants", element: <GrantList /> },
      { path: "grants/allocate", element: <GrantAllocation /> },
      { path: "grants/:grantId", element: <GrantDetail /> },
      { path: "assessments", element: <AdminAssessmentList /> },
    ],
  },
  {
    path: "/authority",
    element: <AuthorityLayout />,
    loader: () => {
      return Verify(4);
    },
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <AuthorityDashboard />,
      },
      {
        path: "profile",
        element: <Profile />,
        errorElement: <ErrorPage />,
      },
      {
        path: "analysis",
        element: <AuthorityAnalysis />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addmanager",
        element: <AddManager />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allmanager",
        element: <AllManager />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allsportscomplex",
        element: <AllAuthoritySportsComplex />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allcomplaint",
        element: <AuthorityComplaintDataTable />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addcomplaint",
        element: <AddComplaint />,
        errorElement: <ErrorPage />,
      },
      {
        path: "leaderboard",
        element: <Leaderboard />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  {
    path: "/manager",
    element: <ManagerLayout />,
    loader: () => {
      return Verify(3);
    },
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <ManagerDashboard />,
      },
      {
        path: "overview",
        element: <ManagerOverviewDashboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: "profile",
        element: <AuthorityProfile />,
        errorElement: <ErrorPage />,
      },
      {
        path: "analysis",
        element: <Utilization />,
        errorElement: <ErrorPage />,
      },
      {
        path: "facilitydetails",
        element: <SportsComplexDetails />,
        errorElement: <ErrorPage />,
      },
      {
        path: "editfacility",
        element: <EditSportsComplexDetails />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allsupervisor",
        element: <AllSupervisor />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addsupervisor",
        element: <AddSupervisor />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allinstructor",
        element: <AllInstructor />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addinstructor",
        element: <AddInstructor />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allcomplaint",
        element: <ComplaintDetails />,
        errorElement: <ErrorPage />,
      },
      {
        path: "transactions",
        element: <ManagerTransactionList />,
        errorElement: <ErrorPage />,
      },
      {
        path: "grants",
        element: <ManagerGrantList />,
        errorElement: <ErrorPage />,
      },
      {
        path: "grants/:grantId",
        element: <ManagerGrantDetail />,
        errorElement: <ErrorPage />,
      },
      {
        path: "grants/:grantId/submit-proof",
        element: <ManagerProofSubmission />,
        errorElement: <ErrorPage />,
      },
      {
        path: "assessment",
        element: <ManagerAssessmentList />,
        errorElement: <ErrorPage />,
      },
      {
        path: "assessment/new",
        element: <ManagerAssessmentForm />,
        errorElement: <ErrorPage />,
      },
      {
        path: "assessment/:assessmentId",
        element: <ManagerAssessmentDetail />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allathelte",
        element: <Athelte />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addcomplaint",
        element: <ManagerAddComplaint />,
        errorElement: <ErrorPage />,
      },
      {
        path: "complexevents",
        element: <ComplexNews />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addcomplexevent",
        element: <AddComplexNews />,
        errorElement: <ErrorPage />,
      },
      {
        path: "leaderboard",
        element: <Leaderboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: "slottable",
        element: <Slot />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  {
    path: "/coach",
    element: <CoachLayout />,
    loader: () => {
      return Verify(2);
    },
    errorElement: <ErrorPage />,
    children: [
      {
        path: "dashboard",
        element: <CoachDashboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: "athletes",
        element: <CoachAthleteList />,
        errorElement: <ErrorPage />,
      },
      {
        path: "athletes/:athleteId",
        element: <CoachAthleteProfile />,
        errorElement: <ErrorPage />,
      },
      {
        path: "rate/:athleteId",
        element: <CoachRateAthlete />,
        errorElement: <ErrorPage />,
      },
      {
        path: "rating-history",
        element: <CoachRatingHistory />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  {
    path: "/citizen",
    element: <CitizenLayout />,
    loader: () => {
      return Verify(0);
    },
    errorElement: <ErrorPage />,
    children: [
      {
        path: "dashboard",
        element: <CitizenDashboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: "attendance",
        element: <CitizenAttendance />,
        errorElement: <ErrorPage />,
      },
      {
        path: "feedback",
        element: <CitizenFeedback />,
        errorElement: <ErrorPage />,
      },
      {
        path: "complaints",
        element: <CitizenComplaints />,
        errorElement: <ErrorPage />,
      },
      {
        path: "profile",
        element: <CitizenProfile />,
        errorElement: <ErrorPage />,
      },
    ],
  },
]);

const App = () => {
  return (
    <ThemeProvider>
      <PrimeReactProvider>
        <RouterProvider router={routes}></RouterProvider>
      </PrimeReactProvider>
    </ThemeProvider>
  );
};

export default App;
