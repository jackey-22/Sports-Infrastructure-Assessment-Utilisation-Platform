import React from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { useDispatch } from "react-redux";
import { BarChart3, Building2, FileText, Map, ShieldCheck, Trophy, UserRound, Users } from "lucide-react";
import { UserActions } from "../../store/UserData";
import { FetchDistrict } from "../../API/FetchDistrict";
import { FetchComplaintType } from "../../API/FetchComplaintType";
import PortalShell from "../Common/PortalShell";

const SECTIONS = [
  {
    label: "District Oversight",
    items: [
      { to: "/authority", label: "Dashboard", icon: ShieldCheck, end: true },
      { to: "/authority/analysis", label: "District Analysis", icon: BarChart3 },
      { to: "/authority/allsportscomplex", label: "Sports Complexes", icon: Building2 },
      { to: "/authority/allmanager", label: "Facility Managers", icon: Users },
      { to: "/authority/allcomplaint", label: "Grievances", icon: FileText },
      { to: "/authority/leaderboard", label: "Leaderboard", icon: Trophy },
      { to: "/authority/profile", label: "Profile", icon: UserRound },
      { to: "/explore", label: "Gujarat GIS Map", icon: Map },
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
      roleTitle="District Authority Console"
      sections={SECTIONS}
    >
      <Outlet />
    </PortalShell>
  );
}
