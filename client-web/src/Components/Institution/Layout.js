import React from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { useDispatch } from "react-redux";
import { CalendarPlus, ClipboardList, Compass } from "lucide-react";
import { UserActions } from "../../store/UserData";
import PortalShell from "../Common/PortalShell";

const SECTIONS = [
  {
    label: "Institution Events",
    items: [
      { to: "/institute", label: "Event Requests", icon: ClipboardList, end: true },
      { to: "/institute/new", label: "New Event Request", icon: CalendarPlus },
      { to: "/institute/explore", label: "Explore Facilities", icon: Compass },
    ],
  },
];

export default function InstitutionLayout() {
  const dispatch = useDispatch();
  dispatch(UserActions.getuserdata(useLoaderData()));

  return (
    <PortalShell
      roleTitle="Institution Event Portal"
      sections={SECTIONS}
    >
      <Outlet />
    </PortalShell>
  );
}
