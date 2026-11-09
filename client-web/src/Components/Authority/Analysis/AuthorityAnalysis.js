import React, { useState } from "react";
import AuthorityBarChartAnalysis from "./AuthorityBarChartAnalysis";
import AuthorityLineChartAnalysis from "./AthorityLineChartAnalysis";
import { PageHeader, PageShell, Tabs } from "../../Admin/Common/AdminUI";

const CHART_TABS = [
  { id: "bar", label: "Bar charts" },
  { id: "line", label: "Line charts" },
];

const AuthorityAnalysis = () => {
  const [chart, setChart] = useState("bar");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · District Authority"
        title="District analysis"
        description="Utilisation, enrolment, complaints and attendance across the sports complexes in your district."
        actions={
          <Tabs
            tabs={CHART_TABS}
            active={chart}
            onChange={setChart}
            label="Chart type"
          />
        }
      />
      {chart === "bar" ? <AuthorityBarChartAnalysis /> : null}
      {chart === "line" ? <AuthorityLineChartAnalysis /> : null}
    </PageShell>
  );
};

export default AuthorityAnalysis;
