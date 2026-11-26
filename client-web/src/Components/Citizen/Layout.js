import React from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Activity, Award, CalendarCheck, Compass, FileText, Medal, Trophy, Users } from "lucide-react";
import { UserActions } from "../../store/UserData";
import { FetchDistrict } from "../../API/FetchDistrict";
import { FetchComplaintType } from "../../API/FetchComplaintType";
import PortalShell from "../Common/PortalShell";

const SECTIONS = [
  {
    label: "Services",
    items: [
      { to: "/citizen/dashboard", label: "Dashboard", icon: Activity, end: true },
      { to: "/citizen/explore", label: "Explore & Book", icon: Compass },
      { to: "/citizen/bookings", label: "My Bookings", icon: CalendarCheck },
      { to: "/citizen/portfolio", label: "Athlete Portfolio", icon: Award },
      { to: "/citizen/performance", label: "Performance & Awards", icon: Trophy },
      { to: "/citizen/leaderboard", label: "Top Athletes", icon: Medal },
      { to: "/citizen/complaints", label: "Grievances", icon: FileText },
      { to: "/citizen/profile", label: "My Profile", icon: Users },
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
      roleTitle="Citizen & Athlete Portal"
      sections={SECTIONS}
    >
      <Outlet />
    </PortalShell>
  );
}
