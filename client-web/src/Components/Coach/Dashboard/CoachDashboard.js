import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, ClipboardCheck, Clock3, RefreshCw, Users } from "lucide-react";
import { api } from "../../../API/client";
import { BarChart, DonutChart } from "../../Admin/Common/AdminCharts";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, TableSkeleton } from "../Common/CoachUI";

const number = new Intl.NumberFormat("en-IN");
const date = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function Section({ title, description, action, children, className = "" }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default function CoachDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/dashboard/coach");
      setData(response.data);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <PageShell>
        <div className="mb-5 h-24 animate-pulse rounded-2xl bg-slate-200" />
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <Card>
          <TableSkeleton rows={6} columns={4} />
        </Card>
      </PageShell>
    );
  }

  if (error && !data) {
    return (
      <PageShell>
        <Card>
          <ErrorState message={error.message} onRetry={load} />
        </Card>
      </PageShell>
    );
  }

  const { coach, facility, kpis } = data;
  const trendCategories = (data.trend || []).map((row) => row.label);
  const trendBookings = (data.trend || []).map((row) => row.bookings || 0);
  const trendEvaluations = (data.trend || []).map((row) => row.evaluations || 0);
  const breakdown = data.evaluationBreakdown || { evaluated: 0, readyToEvaluate: 0, upcoming: 0 };
  const breakdownSeries = [breakdown.evaluated || 0, breakdown.readyToEvaluate || 0, breakdown.upcoming || 0];
  const hasBreakdownData = breakdownSeries.some((v) => v > 0);
  const sportStats = Array.isArray(data.sportStats) ? data.sportStats : [];
  const maxSportBookings = Math.max(1, ...sportStats.map((s) => s.bookings || 0));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coach Console · Operational Overview"
        title={`${coach.name} — Dashboard`}
        description={`${facility?.name || "No facility assigned"}${facility?.district ? ` · ${facility.district}` : ""}${coach.sports.length ? ` · ${coach.sports.join(", ")}` : ""}`}
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Coaching Bookings"
          value={number.format(kpis.bookings || 0)}
          caption="Confirmed sessions under you"
          icon={CalendarCheck}
          tone="green"
          to="/coach/bookings"
        />
        <KpiCard
          label="Upcoming Sessions"
          value={number.format(kpis.upcomingBookings || 0)}
          caption={`${kpis.todayBookings || 0} scheduled today`}
          icon={Clock3}
          tone="amber"
          to="/coach/bookings"
        />
        <KpiCard
          label="Coaching Athletes"
          value={number.format(kpis.uniqueAthletes || 0)}
          caption="Confirmed athletes under you"
          icon={Users}
          tone="violet"
          to="/coach/athletes"
        />
        <KpiCard
          label="Evaluations"
          value={number.format(kpis.evaluationsCount || 0)}
          caption="Performance evaluations submitted"
          icon={ClipboardCheck}
          tone="amber"
          to="/coach/athletes"
        />
        <KpiCard
          label="Assigned Slots"
          value={number.format(kpis.coachingSlots || 0)}
          caption="Active facility coaching slots"
          icon={Clock3}
          tone="blue"
          to="/coach/bookings"
        />
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-3">
        <Section
          title="Coaching Bookings & Evaluations"
          description="Monthly confirmed bookings under your slots vs submitted athlete evaluations."
          className="xl:col-span-2"
        >
          <div className="px-2 pb-2 pt-3">
            <BarChart
              series={[
                { name: "Confirmed Bookings", data: trendBookings },
                { name: "Evaluations", data: trendEvaluations },
              ]}
              categories={trendCategories}
              colors={["#007D40", "#F59E0B"]}
              height={265}
              formatValue={(val) => `${Math.round(val)}`}
            />
          </div>
        </Section>

        <Section
          title="Session Evaluation Status"
          description="Share of confirmed sessions evaluated, ready for scoring, or upcoming."
        >
          <div className="px-3 pb-3 pt-2">
            {hasBreakdownData ? (
              <DonutChart
                series={breakdownSeries}
                labels={["Evaluated", "Ready to Evaluate", "Upcoming"]}
                colors={["#007D40", "#F59E0B", "#0EA5E9"]}
                height={265}
                formatValue={(val) => `${Math.round(val)}`}
              />
            ) : (
              <EmptyState
                title="No confirmed sessions yet"
                description="Session evaluation breakdown appears once coaching bookings are confirmed."
              />
            )}
          </div>
        </Section>
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-3">
        <Section
          title="Bookings by Sport"
          description="Confirmed coaching bookings distributed across your assigned sports."
        >
          {sportStats.length ? (
            <div className="space-y-4 p-5">
              {sportStats.map((item) => {
                const width = Math.round(((item.bookings || 0) / maxSportBookings) * 100);
                return (
                  <div key={item.sport}>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{item.sport}</span>
                      <span className="tabular-nums text-emerald-700">
                        {item.bookings} total · {item.upcoming} upcoming
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${Math.max(8, width)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No sport activity yet"
              description="Confirmed coaching bookings by sport will show up here."
            />
          )}
        </Section>

        <Section
          title="Assigned Coaching Slots"
          description="Slots mapped to you by the Facility Manager."
          className="xl:col-span-2"
          action={
            <Link to="/coach/bookings" className="text-xs font-bold text-brand-primary hover:underline">
              View bookings
            </Link>
          }
        >
          {data.assignedSlots.length ? (
            <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {data.assignedSlots.map((slot) => (
                <div key={slot.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-900">{slot.sport}</p>
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-brand-primary tabular-nums">
                      {slot.startTime}–{slot.endTime}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {slot.label} · Capacity {slot.capacity}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {slot.days.join(", ") || "Days not configured"} · {slot.audience}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No coaching slots assigned"
              description="Ask the Facility Manager to map you to a coaching slot."
            />
          )}
        </Section>
      </div>

      <Section
        title="Recent Coaching Bookings"
        description="Confirmed athletes and sessions scheduled under your coaching slots."
        action={
          <div className="flex items-center gap-4">
            <Link to="/coach/athletes" className="text-xs font-bold text-amber-700 hover:underline">
              Athletes &amp; evaluations
            </Link>
            <Link to="/coach/bookings" className="text-xs font-bold text-brand-primary hover:underline">
              Full schedule
            </Link>
          </div>
        }
      >
        {data.recentBookings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Athlete</th>
                  <th className="px-5 py-3">Sport &amp; Slot</th>
                  <th className="px-5 py-3">Session Date</th>
                  <th className="px-5 py-3 text-right">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentBookings.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">
                      {row.reference || row.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-900">{row.athlete}</p>
                      <p className="text-xs text-slate-500">{row.email || row.phone}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{row.sport}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {row.time?.from || "—"}–{row.time?.to || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 tabular-nums">{date(row.date)}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-700 tabular-nums">
                      {row.members || 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No confirmed coaching bookings yet"
            description="Confirmed coaching bookings assigned to your slots will appear here."
          />
        )}
      </Section>
    </PageShell>
  );
}
