import React from "react";
import AthelteDataTable from "./AthelteDataTable";
import { PageHeader, PageShell } from "../Common/ManagerUI";

const Athelte = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Athletes"
        title="Enrolled athletes"
        description="Athletes enrolled at this complex and the sports they train in."
      />
      <AthelteDataTable />
    </PageShell>
  );
};

export default Athelte;

