import React, { useEffect, useState } from "react";
import { BarChart } from "../../Common/AdminCharts";
import { DEMO_AGE_PROFILE } from "../../../../data/authority/authorityDemoData";

const AgeGroupwiseCount = ({ selectedOption, year, sport }) => {
  const [categories, setCategories] = useState(DEMO_AGE_PROFILE.categories);
  const [series, setSeries] = useState([
    { name: "Athletes", data: DEMO_AGE_PROFILE.values },
  ]);

  useEffect(() => {
    if (!selectedOption) return undefined;
    let active = true;

    function applyDemo() {
      setCategories(DEMO_AGE_PROFILE.categories);
      setSeries([{ name: "Athletes", data: DEMO_AGE_PROFILE.values }]);
    }

    fetch(
      `http://localhost:9999/agegrpCount?year=${year}&sports=${sport}&sportsComplexId=${selectedOption}`,
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
  }, [selectedOption, year, sport]);

  return (
    <BarChart
      series={series}
      categories={categories}
      colors={["#007D40"]}
      height={300}
    />
  );
};

export default AgeGroupwiseCount;
