import React from "react";
import { Link } from "react-router-dom";
import SupervisorDataTable from "./SupervisorDataTable";
import { Button, Card, PageHeader, PageShell } from "../Common/ManagerUI";

const AllSupervisor = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager"
        title="Supervisors"
        description="Staff who receive complaints and attendance at this complex."
        actions={
          <Button as={Link} to="/manager/addsupervisor">
            Add supervisor
          </Button>
        }
      />
      <Card>
        <div className="overflow-x-auto p-2 sm:p-4">
          <SupervisorDataTable />
        </div>
      </Card>
    </PageShell>
  );
};

export default AllSupervisor;
