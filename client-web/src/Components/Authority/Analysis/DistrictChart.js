import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BarChart } from "../../Admin/Common/AdminCharts";
import { DEMO_DISTRICT_FACILITIES } from "../../../data/authority/authorityDemoData";

const DistrictChart = () => {
  const { DistrictId } = useSelector((state) => state.user.user);
  const [categories, setCategories] = useState(
    DEMO_DISTRICT_FACILITIES.categories
  );
  const [series, setSeries] = useState([
    { name: "Sports complexes", data: DEMO_DISTRICT_FACILITIES.values },
  ]);

  useEffect(() => {
    let active = true;

    function applyDemo() {
      setCategories(DEMO_DISTRICT_FACILITIES.categories);
      setSeries([
        { name: "Sports complexes", data: DEMO_DISTRICT_FACILITIES.values },
      ]);
    }

    fetch(`http://localhost:9999/getSportsCount?districtId=${DistrictId}`, {
      method: "GET",
      redirect: "follow",
    })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        if (!Array.isArray(result.sportsCount) || result.sportsCount.length === 0) {
          applyDemo();
          return;
        }
        setCategories(result.sportsCount.map((sport) => sport._id));
        setSeries([
          {
            name: "Sports complexes",
            data: result.sportsCount.map((sport) => sport.sportComplexCount),
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
  }, [DistrictId]);

  return (
    <BarChart
      series={series}
      categories={categories}
      colors={["#007D40"]}
      height={Math.max(280, categories.length * 34 + 80)}
      horizontal
    />
  );
};

export default DistrictChart;
