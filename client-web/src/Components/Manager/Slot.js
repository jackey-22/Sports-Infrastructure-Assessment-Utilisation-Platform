import React from "react";
import SlotDataTable from "./SlotDataTable";
import { PageHeader, PageShell } from "./Common/ManagerUI";

const Slot = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Time slots"
        title="Guest time slots"
        description="Guest bookings made against the courts at this complex, including the sport, time slot and booking period."
      />
      <SlotDataTable />
    </PageShell>
  );
};

export default Slot;
