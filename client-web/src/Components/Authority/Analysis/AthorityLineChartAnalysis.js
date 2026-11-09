import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import EnrollLineAnalysis from "../../Admin/Analysis/Line/EnrollLineAnalysis";
import EventAnalysis from "../../Admin/Analysis/Line/EventAnalysis";
import ComplaintLineAnalysis from "../../Admin/Analysis/Line/ComplaintLine";
import { ChartCard } from "../../Admin/Common/AdminCharts";
import { DEMO_AUTHORITY_COMPLEXES } from "../../../data/authority/authorityDemoData";
import { Card, Field, SectionHeader, selectClass } from "../../Admin/Common/AdminUI";

const AuthorityLineChartAnalysis = () => {
  const { DistrictId } = useSelector((state) => state.user.user);
  const [complexes, setComplexes] = useState(DEMO_AUTHORITY_COMPLEXES);
  const [selectedOption, setSelectedOption] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`http://localhost:9999/getSportsComplex?district=${DistrictId}`, {
      method: "GET",
      redirect: "follow",
    })
      .then((response) => response.json())
      .then((result) => {
        if (active && Array.isArray(result.data) && result.data.length > 0) {
          setComplexes(result.data);
        }
      })
      .catch((error) => console.log("error", error));

    return () => {
      active = false;
    };
  }, [DistrictId]);

  useEffect(() => {
    if (complexes.length > 0) setSelectedOption(complexes[0]._id);
  }, [complexes]);

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader
          title="Filters"
          description="Choose the sports complex to plot monthly trends for."
        />
        <div className="p-4 sm:p-5">
          <Field label="Sports complex" htmlFor="line-complex">
            <select
              id="line-complex"
              className={selectClass}
              onChange={(event) => setSelectedOption(event.target.value)}
              value={selectedOption}
            >
              {complexes.length === 0 ? (
                <option value="">Loading sports complexes…</option>
              ) : null}
              {complexes.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Monthly enrolment"
          description="Athletes enrolled at this complex each month."
        >
          <EnrollLineAnalysis selectedOption={selectedOption} />
        </ChartCard>
        <ChartCard
          title="Monthly events"
          description="Events hosted at this complex each month."
        >
          <EventAnalysis selectedOption={selectedOption} />
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="Monthly complaints"
          description="Complaints raised at this complex each month."
        >
          <ComplaintLineAnalysis selectedOption={selectedOption} />
        </ChartCard>
      </div>
    </div>
  );
};

export default AuthorityLineChartAnalysis;
