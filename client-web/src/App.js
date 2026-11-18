import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@material-tailwind/react";
import { PrimeReactProvider } from "primereact/api";
import AdminPanel from "./Components/Admin/AdminPanel";

//Authenatication
import LoginVerify from "./Components/Auth/LoginVerify";
import Verify from "./Components/Auth/Verify";

//Login Page (Common for All)
import Login from "./Pages/Login";
import CitizenSignup from "./Pages/CitizenSignup";
import HomeLanding from "./Components/Public/HomeLanding";
import PublicExplore from "./Components/Public/PublicExplore";
import CitizenBookingPage from "./Components/Public/CitizenBookingPage";

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

import SportsComplexDetails from "./Components/Manager/SportsComplexDetails/SportsComplexDetails";
import EditSportsComplexDetails from "./Components/Manager/SportsComplexDetails/EditSportsComplexDetails";
import SportsConfiguration from "./Components/Manager/SportsConfiguration/SportsConfiguration";
import AuthorityComplaintDataTable from "./Components/Authority/Complaint/ComplaintDetails";
import AddComplaint from "./Components/Authority/Complaint/AddComplaint";
import Leaderboard from "./Components/Admin/LeaderBoard/Leaderboard";
import AuthorityAnalysis from "./Components/Authority/Analysis/AuthorityAnalysis";

// Phase 2C.2 Manager modules
import ManagerGrantList from "./Components/Manager/Grant/ManagerGrantList";
import ManagerGrantDetail from "./Components/Manager/Grant/ManagerGrantDetail";
import ManagerProofSubmission from "./Components/Manager/Grant/ManagerProofSubmission";
import ManagerAssessmentList from "./Components/Manager/Assessment/ManagerAssessmentList";
import ManagerAssessmentForm from "./Components/Manager/Assessment/ManagerAssessmentForm";
import ManagerAssessmentDetail from "./Components/Manager/Assessment/ManagerAssessmentDetail";

// Phase 2C.3 Coach modules
import CoachLayout from "./Components/Coach/Layout";
import CoachDashboard from "./Components/Coach/Dashboard/CoachDashboard";
import CoachAthletes from "./Components/Coach/Athletes/CoachAthletes";

// Phase 2C.4 Citizen modules
import CitizenLayout from "./Components/Citizen/Layout";
import CitizenDashboard from "./Components/Citizen/Dashboard/CitizenDashboard";
import CitizenComplaints from "./Components/Citizen/Complaints/CitizenComplaints";
import CitizenBookings from "./Components/Citizen/Bookings/CitizenBookings";
import CitizenProfile from "./Components/Citizen/Profile/CitizenProfile";

// Admin Phase 2C.1 modules
import AdminModuleLayout from "./Components/Admin/ModuleLayout";
import GrievanceList from "./Components/Admin/Grievance/GrievanceList";
import GrantList from "./Components/Admin/Grant/GrantList";
import AdminAssessmentList from "./Components/Admin/Assessment/AdminAssessmentList";
import GrantAllocation from "./Components/Admin/Grant/GrantAllocation";
import GrantDetail from "./Components/Admin/Grant/GrantDetail";
import BookingPaymentReport from "./Components/Booking/BookingPaymentReport";
import GrievanceWorkspace from "./Components/Workflow/GrievanceWorkspace";
import RatingWorkspace from "./Components/Workflow/RatingWorkspace";
import GrantWorkspace from "./Components/Workflow/GrantWorkspace";

import GateOperators from "./Components/Gate/GateOperators";
import GateScanner from "./Components/Gate/GateScanner";

const routes = createBrowserRouter([
  { path: "/gate/grievances", element: <GrievanceWorkspace role="gate" />, loader: () => Verify(6), errorElement: <ErrorPage /> },
  { path: "/supervisor", element: <GrievanceWorkspace role="supervisor" />, loader: () => Verify(1), errorElement: <ErrorPage /> },
  { path: "/gate", element: <GateScanner />, loader: () => Verify(6), errorElement: <ErrorPage /> },
  {
    path: "/",
    element: <HomeLanding />,
  },
  {
    path: "/explore",
    element: <PublicExplore />,
  },
  {
    path: "/book/:facilityId",
    element: <CitizenBookingPage />,
  },
  {
    path: "/login",
    element: <Login />,
    loader: LoginVerify,
    errorElement: <ErrorPage />,
  },
  {
    path: "/signup",
    element: <CitizenSignup />,
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
      { path: "grievances", element: <GrievanceWorkspace role="admin" /> },
      { path: "bookings", element: <BookingPaymentReport role="admin" /> },
      { path: "grants", element: <GrantWorkspace role="admin" /> },
      { path: "grants/allocate", element: <GrantWorkspace role="admin" /> },
      { path: "grants/:grantId", element: <GrantWorkspace role="admin" /> },
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
        element: <GrievanceWorkspace role="authority" />,
        errorElement: <ErrorPage />,
      },
      {
        path: "addcomplaint",
        element: <GrievanceWorkspace role="authority" />,
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
      { path: "gate-operators", element: <GateOperators /> },
      { path: "gate-desk", element: <GateScanner embedded /> },
      {
        index: true,
        element: <ManagerDashboard />,
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
        path: "sports-configuration",
        element: <SportsConfiguration />,
        errorElement: <ErrorPage />,
      },
      {
        path: "allcomplaint",
        element: <GrievanceWorkspace role="manager" />,
        errorElement: <ErrorPage />,
      },
      {
        path: "transactions",
        element: <BookingPaymentReport role="manager" />,
        errorElement: <ErrorPage />,
      },
      {
        path: "grants",
        element: <GrantWorkspace role="manager" />,
        errorElement: <ErrorPage />,
      },
      {
        path: "grants/:grantId",
        element: <GrantWorkspace role="manager" />,
        errorElement: <ErrorPage />,
      },
      {
        path: "grants/:grantId/submit-proof",
        element: <GrantWorkspace role="manager" />,
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
      { path: "grievances", element: <GrievanceWorkspace role="coach" /> },
      {
        path: "dashboard",
        element: <CoachDashboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: "athletes",
        element: <CoachAthletes />,
        errorElement: <ErrorPage />,
      },
      {
        path: "bookings",
        element: <BookingPaymentReport role="coach" />,
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
        path: "bookings",
        element: <CitizenBookings />,
        errorElement: <ErrorPage />,
      },
      {
        path: "complaints",
        element: <GrievanceWorkspace role="citizen" />,
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
