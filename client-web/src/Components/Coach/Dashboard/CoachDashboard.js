import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Clock3, IndianRupee, RefreshCw, Star, Trophy, Users } from "lucide-react";
import { api } from "../../../API/client";
import { BarChart } from "../../Admin/Common/AdminCharts";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, TableSkeleton } from "../Common/CoachUI";

const number = new Intl.NumberFormat("en-IN");
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function Status({ children }) {
  const success = children === "Paid" || children === "Confirmed";
  const failed = children === "Failed" || children === "Cancelled" || children === "Refunded";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        success ? "bg-emerald-50 text-emerald-700" : failed ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {children || "Pending"}
    </span>
  );
}

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
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <Card>
          <TableSkeleton rows={6} columns={5} />
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
  const trendValues = (data.trend || []).map((row) => row.bookings || 0);

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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="My Bookings" value={number.format(kpis.bookings)} caption={`${kpis.confirmedBookings} confirmed`} icon={CalendarCheck} tone="green" />
        <KpiCard label="Upcoming" value={number.format(kpis.upcomingBookings)} caption={`${kpis.todayBookings} scheduled today`} icon={Clock3} tone="amber" />
        <KpiCard label="Booked Athletes" value={number.format(kpis.uniqueAthletes)} caption="Unique confirmed bookers" icon={Users} tone="violet" to="/coach/athletes" />
        <KpiCard label="Collected" value={money.format(kpis.revenue)} caption={`${kpis.paidBookings} paid · ${kpis.pendingPayments} pending`} icon={IndianRupee} tone="green" to="/coach/bookings" />
        <KpiCard label="Assigned Slots" value={number.format(kpis.coachingSlots)} caption="Active facility coaching slots" icon={Clock3} tone="blue" />
        <KpiCard label="Evaluations & Ratings" value={number.format(kpis.ratingsGiven)} caption={kpis.ratingsGiven ? `${kpis.averageRatingGiven} avg given` : "No ratings yet"} icon={Star} tone="amber" to="/coach/athletes" />
        <KpiCard label="Citizen Feedback" value={number.format(kpis.ratingsReceived)} caption={kpis.ratingsReceived ? `${kpis.averageRatingReceived} / 5 avg` : "No coach ratings yet"} icon={Star} tone="amber" />
        <KpiCard label="Coach Status" value={coach.status} caption={coach.qualification || "Qualification not added"} icon={Trophy} tone="slate" to="/coach/achievements" />
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-3">
        <Section
          title="Coaching Booking Activity"
          description="Confirmed bookings assigned to your coaching slots over the last 6 months."
          className="xl:col-span-2"
        >
          <div className="px-2 pb-2 pt-3">
            <BarChart
              series={[{ name: "Bookings", data: trendValues }]}
              categories={trendCategories}
              colors={["#007D40"]}
              height={260}
              formatValue={(val) => `${Math.round(val)}`}
            />
          </div>
        </Section>

        <Section
          title="Assigned Coaching Slots"
          description="Slots mapped to you by the Facility Manager."
          action={
            <Link to="/coach/bookings" className="text-xs font-bold text-brand-primary hover:underline">
              View bookings
            </Link>
          }
        >
          {data.assignedSlots.length ? (
            <div className="divide-y divide-slate-100">
              {data.assignedSlots.map((slot) => (
                <div key={slot.id} className="px-5 py-4">
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
        description="Latest athletes and citizens who booked a coaching slot under you."
        action={
          <div className="flex items-center gap-4">
            <Link to="/coach/athletes" className="text-xs font-bold text-amber-700 hover:underline">
              Athletes &amp; evaluations
            </Link>
            <Link to="/coach/bookings" className="text-xs font-bold text-brand-primary hover:underline">
              Full report
            </Link>
          </div>
        }
      >
        {data.recentBookings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Athlete</th>
                  <th className="px-5 py-3">Sport / Slot</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Payment</th>
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
                    <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">
                      {money.format(row.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <Status>{row.bookingStatus}</Status>
                    </td>
                    <td className="px-5 py-3">
                      <Status>{row.paymentStatus}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No bookings yet"
            description="Bookings assigned to your coaching slots will appear here."
          />
        )}
      </Section>
    </PageShell>
  );
}
