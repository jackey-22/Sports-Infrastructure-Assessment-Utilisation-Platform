import React from "react";
import { Link } from "react-router-dom";
import ComplexDataTable from "./ComplexNewsDataTable";
import { Button, Card, PageHeader, PageShell } from "../Common/ManagerUI";

const ComplexNews = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager"
        title="Facility updates"
        description="Notices and events published for athletes at this complex."
        actions={
          <Button as={Link} to="/manager/addcomplexevent">
            Add update
          </Button>
        }
      />
      <Card>
        <div className="overflow-x-auto p-2 sm:p-4">
          <ComplexDataTable />
        </div>
      </Card>
    </PageShell>
  );
};

export default ComplexNews;
