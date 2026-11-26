import React from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Activity,
  Building2,
  FileText,
  ListChecks,
  Medal,
  School,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { UserActions } from "../../store/UserData";
import { FetchDistrict } from "../../API/FetchDistrict";
import { FetchComplaintType } from "../../API/FetchComplaintType";
import PortalShell from "../Common/PortalShell";

const SECTIONS = [
  {
    label: "Facility Operations",
    items: [
      { to: "/manager", label: "Dashboard", icon: Activity, end: true },
      { to: "/manager/facilitydetails", label: "Facility Details", icon: Building2 },
      { to: "/manager/sports-configuration", label: "Sports & Slots", icon: ListChecks },
      { to: "/manager/transactions", label: "Bookings & Payments", icon: Wallet },
      { to: "/manager/allcomplaint", label: "Grievances", icon: FileText },
    ],
  },
  {
    label: "Access & Programs",
    items: [
      { to: "/manager/institution-events", label: "Institution Events", icon: School },
      { to: "/manager/achievements", label: "Athlete Achievements", icon: Trophy },
      { to: "/manager/leaderboard", label: "Leaderboard", icon: Medal },
      { to: "/manager/gate-operators", label: "Gate Operators", icon: Users },
      { to: "/manager/gate-desk", label: "Gate Desk & Scanner", icon: ShieldCheck },
      { to: "/manager/grants", label: "Grants & Utilisation", icon: Wallet },
      { to: "/manager/assessment", label: "Condition Assessment", icon: Activity },
    ],
  },
];

export default function Layout() {
  const dispatch = useDispatch();
  dispatch(UserActions.getuserdata(useLoaderData()));
  FetchDistrict();
  FetchComplaintType();

  return (
    <PortalShell
      roleTitle="Facility Manager Console"
      sections={SECTIONS}
    >
      <Outlet />
    </PortalShell>
  );
}
