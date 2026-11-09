import React, { useEffect, useState } from "react";
import { BarChart } from "../../Common/AdminCharts";
import { DEMO_CAPACITY } from "../../../../data/authority/authorityDemoData";

const CapacityAnalysis = ({ selectedOption }) => {
  const [categories, setCategories] = useState(DEMO_CAPACITY.categories);
  const [series, setSeries] = useState([
    { name: "Capacity", data: DEMO_CAPACITY.capacity },
    { name: "Enrolled athletes", data: DEMO_CAPACITY.enrolled },
  ]);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    function applyDemo() {
      setCategories(DEMO_CAPACITY.categories);
      setSeries([
        { name: "Capacity", data: DEMO_CAPACITY.capacity },
        { name: "Enrolled athletes", data: DEMO_CAPACITY.enrolled },
      ]);
    }

    fetch(
      `http://localhost:9999/sportCapacityUtilization?sportsComplexId=${selectedOption}`,
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
        setCategories(rows.map((sport) => sport.sport));
        setSeries([
          {
            name: "Capacity",
            data: rows.map((sport) => Number(sport.capacity) || 0),
          },
          {
            name: "Enrolled athletes",
            data: rows.map((sport) => Number(sport.totalAthelete) || 0),
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
      colors={["#007D40", "#f59e0b"]}
      height={300}
    />
  );
};

export default CapacityAnalysis;
