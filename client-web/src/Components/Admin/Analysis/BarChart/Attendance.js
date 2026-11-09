import React, { useEffect, useState } from "react";
import { BarChart } from "../../Common/AdminCharts";
import { DEMO_ATTENDANCE_BY_SPORT } from "../../../../data/authority/authorityDemoData";

const AttendanceAnalysis = ({ selectedOption, fromdate, todate }) => {
  const [categories, setCategories] = useState(
    DEMO_ATTENDANCE_BY_SPORT.categories
  );
  const [series, setSeries] = useState([
    { name: "Attendance", data: DEMO_ATTENDANCE_BY_SPORT.values },
  ]);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    function applyDemo() {
      setCategories(DEMO_ATTENDANCE_BY_SPORT.categories);
      setSeries([
        { name: "Attendance", data: DEMO_ATTENDANCE_BY_SPORT.values },
      ]);
    }

    fetch(
      `http://localhost:9999/attendanceSportWise?sportscomplex=${selectedOption}&from=${fromdate}&to=${todate}`,
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
        setCategories(rows.map((item) => item.sportName));
        setSeries([
          { name: "Attendance", data: rows.map((item) => item.totalCount) },
        ]);
      })
      .catch((error) => {
        if (active) applyDemo();
        console.log("error", error);
      });

    return () => {
      active = false;
    };
  }, [selectedOption, fromdate, todate]);

  return (
    <BarChart
      series={series}
      categories={categories}
      colors={["#0ea5e9"]}
      height={300}
    />
  );
};

export default AttendanceAnalysis;
