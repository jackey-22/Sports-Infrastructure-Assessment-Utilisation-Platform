import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RotateCcw } from "lucide-react";
import TimewiseAnalysis from "../../Admin/Analysis/BarChart/TimeSlotAnalysis";
import CapacityAnalysis from "../../Admin/Analysis/BarChart/CapacityAnalysis";
import ComplaintAnalysis from "../../Admin/Analysis/BarChart/ComplaintAnalysis";
import EnrollAnalysis from "../../Admin/Analysis/BarChart/EnrollAnalysis";
import AgeGroupAnalysis from "../../Admin/Analysis/BarChart/AgeGroupAnalysis";
import AgeGroupwiseCount from "../../Admin/Analysis/BarChart/AgeGroupCount";
import AttendanceAnalysis from "../../Admin/Analysis/BarChart/Attendance";
import DistrictChart from "./DistrictChart";
import {
  DEMO_AUTHORITY_COMPLEXES,
  DEMO_AUTHORITY_SPORTS,
} from "../../../data/authority/authorityDemoData";
import { ChartCard } from "../../Admin/Common/AdminCharts";
import {
  Button,
  Card,
  Field,
  Notice,
  SectionHeader,
  selectClass,
} from "../../Admin/Common/AdminUI";

const API = "http://localhost:9999";
const AGE_GROUPS = [
  { value: "0-100", label: "All ages" },
  { value: "10-20", label: "10 to 20 years" },
  { value: "20-25", label: "20 to 25 years" },
  { value: "25-30", label: "25 to 30 years" },
  { value: "30-40", label: "30 to 40 years" },
  { value: "40-50", label: "40 to 50 years" },
  { value: "50-100", label: "Over 50 years" },
];
const YEARS = Array.from({ length: 6 }, (_, index) =>
  String(new Date().getFullYear() - index)
);
const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 29 * 86400000)
  .toISOString()
  .slice(0, 10);

function ChartGroup({ title, description, children }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-brand-dark">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

const AuthorityBarChartAnalysis = () => {
  const { DistrictId } = useSelector((state) => state.user.user);
  const [complexes, setComplexes] = useState(DEMO_AUTHORITY_COMPLEXES);
  const [sports, setSports] = useState(DEMO_AUTHORITY_SPORTS);
  const [selectedOption, setSelectedOption] = useState("");
  const [sportId, setSportId] = useState("");
  const [ageGroup, setAgeGroup] = useState("0-100");
  const [year, setYear] = useState("");
  const [fromDate, setFromDate] = useState(THIRTY_DAYS_AGO);
  const [toDate, setToDate] = useState(TODAY);
  const [dateError, setDateError] = useState("");

  const [minAge, maxAge] = ageGroup.split("-").map(Number);

  useEffect(() => {
    let active = true;
    const requestOptions = { method: "GET", redirect: "follow" };

    fetch(`${API}/getSportsComplex?district=${DistrictId}`, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        if (active && Array.isArray(result.data) && result.data.length > 0) {
          setComplexes(result.data);
        }
      })
      .catch((error) => console.log("error", error));

    fetch(`${API}/getSports`, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        if (active && Array.isArray(result.data) && result.data.length > 0) {
          setSports(result.data);
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

  const handleToDate = (event) => {
    const value = event.target.value;
    setToDate(value);
    if (fromDate && value && new Date(fromDate) > new Date(value)) {
      setDateError("End date must be the same as or after the start date.");
      setToDate("");
    } else {
      setDateError("");
    }
  };

  const handleFromDate = (event) => {
    const value = event.target.value;
    setFromDate(value);
    if (toDate && value && new Date(value) > new Date(toDate)) {
      setDateError("End date must be the same as or after the start date.");
      setToDate("");
    } else {
      setDateError("");
    }
  };

  const resetFilters = () => {
    setSportId("");
    setAgeGroup("0-100");
    setYear("");
    setFromDate(THIRTY_DAYS_AGO);
    setToDate(TODAY);
    setDateError("");
  };

  const isFiltered =
    Boolean(sportId || year) ||
    ageGroup !== "0-100" ||
    fromDate !== THIRTY_DAYS_AGO ||
    toDate !== TODAY;

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader
          title="Filters"
          description="The sports complex applies to every chart. The remaining filters narrow specific sections below."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={resetFilters}
              disabled={!isFiltered}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <Field
            label="Sports complex"
            htmlFor="analysis-complex"
            className="sm:col-span-2"
          >
            <select
              id="analysis-complex"
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

          <Field label="Sport" htmlFor="analysis-sport">
            <select
              id="analysis-sport"
              className={selectClass}
              onChange={(event) => setSportId(event.target.value)}
              value={sportId}
            >
              <option value="">All sports</option>
              {sports.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.SportName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Age group" htmlFor="analysis-age">
            <select
              id="analysis-age"
              className={selectClass}
              onChange={(event) => setAgeGroup(event.target.value)}
              value={ageGroup}
            >
              {AGE_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year" htmlFor="analysis-year">
            <select
              id="analysis-year"
              className={selectClass}
              onChange={(event) => setYear(event.target.value)}
              value={year}
            >
              <option value="">All years</option>
              {YEARS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="From date" htmlFor="analysis-from">
            <input
              id="analysis-from"
              type="date"
              className={selectClass}
              value={fromDate}
              onChange={handleFromDate}
            />
          </Field>

          <Field label="To date" htmlFor="analysis-to">
            <input
              id="analysis-to"
              type="date"
              className={selectClass}
              value={toDate}
              min={fromDate || undefined}
              onChange={handleToDate}
            />
          </Field>
        </div>
        {dateError ? (
          <div className="px-4 pb-4 sm:px-5">
            <Notice tone="error" title="Check the date range">
              {dateError}
            </Notice>
          </div>
        ) : null}
      </Card>

      <ChartGroup
        title="Utilisation and capacity"
        description="When athletes use the complex and how enrolments compare with available capacity."
      >
        <ChartCard
          title="Athletes by time slot"
          description="Sessions attended at this complex across the day."
        >
          <TimewiseAnalysis selectedOption={selectedOption} />
        </ChartCard>
        <ChartCard
          title="Capacity vs enrolment"
          description="Available capacity and enrolled athletes for each sport."
        >
          <CapacityAnalysis selectedOption={selectedOption} />
        </ChartCard>
      </ChartGroup>

      <ChartGroup
        title="Athlete participation"
        description="Enrolment through the year and the age profile of athletes at this complex."
      >
        <ChartCard
          title="Monthly enrolment"
          description="Athletes enrolled each month for the selected sport."
        >
          <EnrollAnalysis selectedOption={selectedOption} sportId={sportId} />
        </ChartCard>
        <ChartCard
          title="Athletes by age group"
          description="Athletes within the selected age group at this complex."
        >
          <AgeGroupAnalysis
            minAge={minAge}
            maxAge={maxAge}
            selectedOption={selectedOption}
          />
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="Age profile by year"
          description="Age-group distribution for the selected year and sport."
        >
          <AgeGroupwiseCount
            selectedOption={selectedOption}
            year={year}
            sport={sportId}
          />
        </ChartCard>
      </ChartGroup>

      <ChartGroup
        title="Attendance and grievances"
        description="Attendance recorded in the selected date range and complaints raised by type."
      >
        <ChartCard
          title="Attendance by sport"
          description="Attendance records between the selected dates."
        >
          <AttendanceAnalysis
            selectedOption={selectedOption}
            fromdate={fromDate}
            todate={toDate}
          />
        </ChartCard>
        <ChartCard
          title="Complaints by type"
          description="Complaint volume and resolution status for this complex."
        >
          <ComplaintAnalysis selectedOption={selectedOption} />
        </ChartCard>
      </ChartGroup>

      <ChartGroup
        title="District facilities"
        description="How many sports complexes in the district offer each sport."
      >
        <ChartCard
          className="xl:col-span-2"
          title="Sports complexes by sport"
          description="Facilities available across the district."
        >
          <DistrictChart />
        </ChartCard>
      </ChartGroup>
    </div>
  );
};

export default AuthorityBarChartAnalysis;
