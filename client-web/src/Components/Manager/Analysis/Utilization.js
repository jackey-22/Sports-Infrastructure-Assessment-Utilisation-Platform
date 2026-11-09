import React, { useMemo } from "react";
import {
  MANAGER_FACILITY,
  MANAGER_GRIEVANCES,
} from "../../../data/manager/managerDemoData";
import { DEMO_MONTH_LABELS } from "../../../data/admin/adminDemoData";
import { formatNumber } from "../../../utils/manager/managerUtils";
import {
  BarChart,
  ChartCard,
  DonutChart,
  TrendChart,
} from "../Common/ManagerUI";
import { KpiCard, PageHeader, PageShell } from "../Common/ManagerUI";
import { Activity, Clock3, Dumbbell, MessageSquareWarning } from "lucide-react";

const SLOTS = [
  "6–7",
  "7–8",
  "8–9",
  "9–10",
  "10–11",
  "11–12",
  "12–1",
  "1–2",
  "2–3",
  "3–4",
  "4–5",
  "5–6",
  "6–7",
  "7–8",
];
const SLOT_ATTENDANCE = [42, 68, 74, 51, 36, 28, 22, 18, 24, 33, 58, 81, 76, 49];

function sportLoad(names) {
  return (names || []).slice(0, 6).map((name, index) => {
    const capacity = 18 + ((index * 7 + String(name).length) % 22);
    const enrolled = Math.max(8, Math.round(capacity * (0.58 + (index % 4) * 0.09)));
    return { name, capacity, enrolled };
  });
}

export default function Utilization() {
  const sports = useMemo(() => sportLoad(MANAGER_FACILITY.sports), []);
  const pending = MANAGER_GRIEVANCES.filter((row) => row.status === "Pending").length;
  const resolved = MANAGER_GRIEVANCES.filter((row) => row.status === "Resolved").length;
  const peak = Math.max(...SLOT_ATTENDANCE);
  const peakLabel = SLOTS[SLOT_ATTENDANCE.indexOf(peak)];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Facility Manager"
        title="Facility analysis"
        description={`${MANAGER_FACILITY.name}. Court load, time-slot attendance and monthly utilisation for this complex.`}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Peak attendance"
          value={formatNumber(peak)}
          caption={`${peakLabel} is the busiest hour`}
          icon={Clock3}
          tone="green"
        />
        <KpiCard
          label="Daily utilisation"
          value={`${MANAGER_FACILITY.utilisation}%`}
          caption={`${formatNumber(MANAGER_FACILITY.capacity)} daily capacity`}
          icon={Activity}
          tone="blue"
        />
        <KpiCard
          label="Sports on site"
          value={formatNumber(sports.length)}
          caption="Courts included in this view"
          icon={Dumbbell}
          tone="violet"
        />
        <KpiCard
          label="Open grievances"
          value={formatNumber(pending)}
          caption={`${formatNumber(resolved)} resolved`}
          icon={MessageSquareWarning}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Attendance by time slot"
          description="Athletes on site through a typical operating day."
        >
          <BarChart
            categories={SLOTS}
            series={[{ name: "Athletes", data: SLOT_ATTENDANCE }]}
            colors={["#007D40"]}
            height={300}
            formatValue={(value) => formatNumber(value)}
          />
        </ChartCard>

        <ChartCard
          title="Court capacity and enrolment"
          description="Available places against athletes enrolled in each sport."
        >
          <BarChart
            categories={sports.map((row) => row.name)}
            series={[
              { name: "Capacity", data: sports.map((row) => row.capacity) },
              { name: "Enrolled", data: sports.map((row) => row.enrolled) },
            ]}
            colors={["#007D40", "#f59e0b"]}
            height={300}
            formatValue={(value) => formatNumber(value)}
          />
        </ChartCard>

        <ChartCard
          title="Monthly utilisation"
          description="Share of daily capacity used across the last six months."
        >
          <TrendChart
            area
            categories={DEMO_MONTH_LABELS}
            series={[{ name: "Utilisation %", data: MANAGER_FACILITY.utilisationTrend }]}
            colors={["#007D40"]}
            height={280}
            formatValue={(value) => `${value}%`}
          />
        </ChartCard>

        <ChartCard
          title="Grievance status"
          description="Pending and resolved complaints for this facility."
        >
          <DonutChart
            labels={["Pending", "Resolved"]}
            series={[pending, resolved]}
            colors={["#f59e0b", "#007D40"]}
            height={280}
            formatValue={(value) => formatNumber(value)}
          />
        </ChartCard>
      </div>
    </PageShell>
  );
}
