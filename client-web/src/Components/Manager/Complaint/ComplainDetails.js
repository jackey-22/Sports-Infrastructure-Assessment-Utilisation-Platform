import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ComplaintDataTable from "./ComplaintDataTable";
import { Button, Card, PageHeader, PageShell } from "../Common/ManagerUI";

const ComplaintDetails = () => {
  const [params] = useSearchParams();
  const [scope, setScope] = useState(params.get("tab") === "mine" ? "mine" : "incoming");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager"
        title="Grievances"
        description="Complaints waiting at this complex, and the ones you have sent upward."
        actions={
          <Button as={Link} to="/manager/addcomplaint">
            Submit grievance
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope("incoming")}
          className={`min-h-11 rounded-lg px-4 text-sm font-bold ${
            scope === "incoming"
              ? "bg-brand-primary text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Complaints to resolve
        </button>
        <button
          type="button"
          onClick={() => setScope("mine")}
          className={`min-h-11 rounded-lg px-4 text-sm font-bold ${
            scope === "mine"
              ? "bg-brand-primary text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          My submissions
        </button>
      </div>
      <Card>
        <div className="overflow-x-auto p-2 sm:p-4">
          <ComplaintDataTable scope={scope} />
        </div>
      </Card>
    </PageShell>
  );
};

export default ComplaintDetails;
