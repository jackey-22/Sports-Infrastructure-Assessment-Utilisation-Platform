import React, { useEffect, useState } from "react";
import { TrendChart } from "../../Common/AdminCharts";
import { DEMO_MONTHLY_EVENTS } from "../../../../data/authority/authorityDemoData";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EventAnalysis = ({ selectedOption }) => {
  const [series, setSeries] = useState([
    { name: "Events", data: DEMO_MONTHLY_EVENTS },
  ]);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    fetch(
      `http://localhost:9999/monthWiseEventCount?sportsComplexId=${selectedOption}`,
      { method: "GET", redirect: "follow" }
    )
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        const rows = Array.isArray(result.data) ? result.data : [];
        if (rows.length === 0) {
          setSeries([{ name: "Events", data: DEMO_MONTHLY_EVENTS }]);
          return;
        }
        const counts = new Array(12).fill(0);
        rows.forEach((entry) => {
          const month = Number(entry._id && entry._id.month);
          if (month >= 1 && month <= 12) counts[month - 1] = entry.totalAthelete;
        });
        setSeries([{ name: "Events", data: counts }]);
      })
      .catch((error) => {
        if (active) {
          setSeries([{ name: "Events", data: DEMO_MONTHLY_EVENTS }]);
        }
        console.log("error", error);
      });

    return () => {
      active = false;
    };
  }, [selectedOption]);

  return (
    <TrendChart
      series={series}
      categories={MONTHS}
      colors={["#007D40"]}
      height={300}
      area
    />
  );
};

export default EventAnalysis;
