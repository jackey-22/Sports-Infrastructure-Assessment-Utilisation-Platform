import React, { useEffect, useState } from "react";
import { BarChart } from "../../Common/AdminCharts";
import { DEMO_COMPLAINTS } from "../../../../data/authority/authorityDemoData";

const SERIES_NAMES = [
  "Total complaints",
  "Resolved",
  "Unresolved",
  "Resolved – satisfied",
  "Resolved – unsatisfied",
];

function demoSeries() {
  return [
    { name: SERIES_NAMES[0], data: DEMO_COMPLAINTS.total },
    { name: SERIES_NAMES[1], data: DEMO_COMPLAINTS.resolved },
    { name: SERIES_NAMES[2], data: DEMO_COMPLAINTS.unresolved },
    { name: SERIES_NAMES[3], data: DEMO_COMPLAINTS.satisfied },
    { name: SERIES_NAMES[4], data: DEMO_COMPLAINTS.unsatisfied },
  ];
}

const ComplaintAnalysis = ({ selectedOption }) => {
  const [categories, setCategories] = useState(DEMO_COMPLAINTS.categories);
  const [series, setSeries] = useState(demoSeries);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    function applyDemo() {
      setCategories(DEMO_COMPLAINTS.categories);
      setSeries(demoSeries());
    }

    fetch(
      `http://localhost:9999/ComplaintsAnalysis?sportsComplexId=${selectedOption}`,
      { method: "GET", redirect: "follow" }
    )
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        const rows = Array.isArray(result.data) ? result.data : [];
        if (rows.length === 0) {
          applyDemo();
          return;
        }
        setCategories(rows.map((row) => row.type));
        setSeries([
          {
            name: SERIES_NAMES[0],
            data: rows.map((row) => (row.solved || 0) + (row.unsolved || 0)),
          },
          { name: SERIES_NAMES[1], data: rows.map((row) => row.solved || 0) },
          { name: SERIES_NAMES[2], data: rows.map((row) => row.unsolved || 0) },
          {
            name: SERIES_NAMES[3],
            data: rows.map((row) => row.solvedsatisfied || 0),
          },
          {
            name: SERIES_NAMES[4],
            data: rows.map((row) => row.solvednotsatisfied || 0),
          },
        ]);
      })
      .catch((error) => {
        if (active) applyDemo();
        console.log("error", error);
      });

    return () => {
      active = false;
    };
  }, [selectedOption]);

  return (
    <BarChart
      series={series}
      categories={categories}
      colors={["#0f172a", "#007D40", "#f59e0b", "#0ea5e9", "#ef4444"]}
      height={300}
    />
  );
};

export default ComplaintAnalysis;
