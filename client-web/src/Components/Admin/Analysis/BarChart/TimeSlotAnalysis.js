import React, { useEffect, useState } from "react";
import { BarChart } from "../../Common/AdminCharts";
import { DEMO_TIME_SLOT_ATTENDANCE } from "../../../../data/authority/authorityDemoData";

const TIME_SLOTS = [
  "7 – 8 AM",
  "8 – 9 AM",
  "9 – 10 AM",
  "10 – 11 AM",
  "11 AM – 12 PM",
  "12 – 1 PM",
  "1 – 2 PM",
  "2 – 3 PM",
  "3 – 4 PM",
  "4 – 5 PM",
  "5 – 6 PM",
  "6 – 7 PM",
];

const TimewiseAnalysis = ({ selectedOption }) => {
  const [series, setSeries] = useState([
    { name: "Athletes", data: DEMO_TIME_SLOT_ATTENDANCE },
  ]);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    fetch(
      `http://localhost:9999/timeSlotUtilization?sportsComplexId=${selectedOption}`,
      { method: "GET", redirect: "follow" }
    )
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        const values =
          Array.isArray(result.slotcount) && result.slotcount.length > 0
            ? result.slotcount
            : DEMO_TIME_SLOT_ATTENDANCE;
        setSeries([{ name: "Athletes", data: values }]);
      })
      .catch((error) => {
        if (active) setSeries([{ name: "Athletes", data: DEMO_TIME_SLOT_ATTENDANCE }]);
        console.log("error", error);
      });

    return () => {
      active = false;
    };
  }, [selectedOption]);

  return (
    <BarChart
      series={series}
      categories={TIME_SLOTS}
      colors={["#007D40"]}
      height={300}
    />
  );
};

export default TimewiseAnalysis;
