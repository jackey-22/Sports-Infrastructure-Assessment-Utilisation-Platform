import React from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Activity, CalendarCheck, Medal, Receipt, Trophy, Users } from "lucide-react";
import { UserActions } from "../../store/UserData";
import { FetchDistrict } from "../../API/FetchDistrict";
import { FetchComplaintType } from "../../API/FetchComplaintType";
import PortalShell from "../Common/PortalShell";

const SECTIONS = [
  {
    label: "Coaching",
    items: [
      { to: "/coach/dashboard", label: "Dashboard", icon: Activity, end: true },
      { to: "/coach/athletes", label: "Athletes & Evaluations", icon: Users },
      { to: "/coach/achievements", label: "Achievements", icon: Trophy },
      { to: "/coach/leaderboard", label: "Top Athletes", icon: Medal },
      { to: "/coach/bookings", label: "Coaching Bookings", icon: CalendarCheck },
      { to: "/coach/grievances", label: "Grievances", icon: Receipt },
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
      roleTitle="Coach Console"
      sections={SECTIONS}
    >
      <Outlet />
    </PortalShell>
  );
}
