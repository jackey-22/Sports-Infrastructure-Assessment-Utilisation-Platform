import React from "react";
import { Link } from "react-router-dom";
import InstructorDataTable from "./InstructorDataTable";
import { Button, PageHeader, PageShell } from "../Common/ManagerUI";

const AllInstructor = () => {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Instructors"
        title="Instructors"
        description="Coaches assigned to sports at this complex, with their experience and weekly coaching time slots."
        actions={
          <Button as={Link} to="/manager/addinstructor">
            Add instructor
          </Button>
        }
      />
      <InstructorDataTable />
    </PageShell>
  );
};

export default AllInstructor;
