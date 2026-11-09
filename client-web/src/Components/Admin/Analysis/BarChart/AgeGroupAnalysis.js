import React, { useEffect, useState } from "react";
import { BarChart } from "../../Common/AdminCharts";
import {
  DEMO_AGE_GROUP,
  demoAgeGroupValues,
} from "../../../../data/authority/authorityDemoData";

const AgeGroupAnalysis = ({ selectedOption, minAge, maxAge }) => {
  const [categories, setCategories] = useState(DEMO_AGE_GROUP.categories);
  const [series, setSeries] = useState([
    { name: "Athletes", data: demoAgeGroupValues(minAge, maxAge) },
  ]);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    function applyDemo() {
      setCategories(DEMO_AGE_GROUP.categories);
      setSeries([
        { name: "Athletes", data: demoAgeGroupValues(minAge, maxAge) },
      ]);
    }

    fetch(
      `http://localhost:9999/agewiseSportCount?minage=${minAge}&maxage=${maxAge}&sportsComplexId=${selectedOption}`,
      { method: "GET", redirect: "follow" }
    )
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        if (!Array.isArray(result.value) || result.value.length === 0) {
          applyDemo();
          return;
        }
        setCategories(Array.isArray(result.name) ? result.name : []);
        setSeries([{ name: "Athletes", data: result.value }]);
      })
      .catch((error) => {
        if (active) applyDemo();
        console.log("error", error);
      });

    return () => {
      active = false;
    };
  }, [selectedOption, minAge, maxAge]);

  return (
    <BarChart
      series={series}
      categories={categories}
      colors={["#007D40"]}
      height={300}
    />
  );
};

export default AgeGroupAnalysis;
