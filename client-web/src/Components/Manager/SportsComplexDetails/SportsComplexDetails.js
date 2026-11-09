import React from "react";
import { Link } from "react-router-dom";
import FacilityDataTable from "./FacilityDataTable";
import { Button, Card, PageHeader, PageShell } from "../Common/ManagerUI";

const SportsComplexDetails = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager"
        title="Facility details"
        description="Courts, contact details and the record for this sports complex."
        actions={
          <Button as={Link} to="/manager/editfacility">
            Edit facility
          </Button>
        }
      />
      <Card>
        <div className="overflow-x-auto p-2 sm:p-4">
          <FacilityDataTable />
        </div>
      </Card>
    </PageShell>
  );
};

export default SportsComplexDetails;
