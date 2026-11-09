import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../../API/client";
import { demoStore } from "../../../data/demoStore";
import VisionFindings from "../../Assessment/VisionFindings";
import {
  Card,
  EmptyState,
  PageHeader,
  PageShell,
  StatusPill,
  TableSkeleton,
} from "../Common/AdminUI";

export default function AdminAssessmentList() {
  const [rows, setRows] = useState(null);
  const [openId, setOpenId] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/admin/assessments")
      .then((data) => {
        if (!cancelled) setRows(data.assessments || []);
      })
      .catch(() => {
        if (cancelled) return;
        const saved = demoStore
          .listAssessments()
          .filter((row) => row.status !== "Draft");
        setRows(saved);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin · Facility assessments"
        title="Submitted condition assessments"
        description="Questionnaire scores are manager-entered. AI findings come only from photographs analysed by the server."
      />

      <Card className="overflow-hidden">
        {!rows ? (
          <TableSkeleton rows={5} columns={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No saved assessments"
            description="Facility manager submissions appear here after they are stored."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Facility</th>
                  <th className="px-4 py-2.5 font-bold">Date</th>
                  <th className="px-4 py-2.5 text-right font-bold">Questionnaire</th>
                  <th className="px-4 py-2.5 text-right font-bold">Visual index</th>
                  <th className="px-4 py-2.5 font-bold">AI</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const open = openId === row.id;
                  const aiDone = row.ai && row.ai.status === "completed";
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setOpenId(open ? "" : row.id)}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800">{row.facilityName}</p>
                          <p className="text-[11px] text-slate-500">{row.district}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{row.date || "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-brand-dark">
                          {row.score == null ? "—" : `${row.score} / 100`}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                          {aiDone && row.ai.visualConditionIndex != null
                            ? row.ai.visualConditionIndex
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {aiDone ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              {row.ai.model}
                            </span>
                          ) : (
                            "Not requested"
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={row.status} />
                        </td>
                      </tr>
                      {open ? (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 px-4 py-4">
                            <p className="mb-3 text-xs text-slate-700">
                              <span className="font-bold">Manager observations: </span>
                              {row.summary || "None recorded."}
                            </p>
                            {aiDone ? (
                              <VisionFindings analysis={row.ai} />
                            ) : (
                              <p className="text-xs text-slate-600">
                                This record has a questionnaire score only. No vision model analysed photographs for it.
                              </p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
