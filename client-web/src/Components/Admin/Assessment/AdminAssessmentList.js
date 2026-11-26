import React, { useState } from "react";
import { api } from "../../../API/client";
import { useAdminQuery } from "../../../hooks/admin/useAdminQuery";
import VisionFindings from "../../Assessment/VisionFindings";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  StatusPill,
  TableSkeleton,
} from "../Common/AdminUI";

export function AssessmentRecords({ endpoint }) {
  const [openId, setOpenId] = useState("");
  const { data: rows, loading, error, reload } = useAdminQuery(async () => {
    const data = await api.get(endpoint);
    return data.assessments || [];
  }, [endpoint]);

  return (
    <Card className="overflow-hidden">
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !rows?.length ? (
        <EmptyState
          title="No saved assessments"
          description="Assessments appear here after managers save them in the app."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-bold">Facility</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Sport</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Date</th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">Visual index</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const open = openId === row.id;
                const ai = row.ai?.status === "completed" ? row.ai : null;
                return (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-800">{row.facilityName}</p>
                        <p className="text-[11px] text-slate-500">{row.district}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{row.sportName || "Facility-wide record"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.date || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                        {ai?.visualConditionIndex == null ? "—" : `${ai.visualConditionIndex} / 100`}
                      </td>
                      <td className="px-4 py-2.5"><StatusPill status={row.status} /></td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setOpenId(open ? "" : row.id)}
                          className="rounded px-2 py-1 font-bold text-brand-primary hover:bg-brand-soft focus-visible:outline focus-visible:outline-2"
                        >
                          {open ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} className="space-y-3 bg-slate-50 px-4 py-4 text-slate-700">
                          {row.inspector && <p>Inspector · {row.inspector}</p>}
                          {row.score != null && <p>Recorded score · {row.score} / 100 · {row.grade}</p>}
                          {row.summary && <p>{row.summary}</p>}
                          {!!row.photos?.length && <p>Photo filenames · {row.photos.join(", ")}</p>}
                          {ai ? <VisionFindings analysis={ai} /> : <p>No photo analysis recorded.</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function AdminAssessmentList() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin · Facility assessments"
        title="Condition assessment records"
        description="View saved photo analyses by sport and facility."
      />
      <AssessmentRecords endpoint="/api/admin/assessments" />
    </PageShell>
  );
}
