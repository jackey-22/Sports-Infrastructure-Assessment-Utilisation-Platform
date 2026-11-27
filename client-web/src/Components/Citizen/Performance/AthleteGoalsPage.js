import React, { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../../../API/client";
import { Button, PageHeader, PageShell } from "../Common/CitizenUI";
import GoalsBadgesSection from "./GoalsBadgesSection";

export default function AthleteGoalsPage() {
  const [sports, setSports] = useState([]);
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api
      .get("/getSports")
      .then((res) => setSports(res.data || []))
      .catch((err) => setNotice(err.message));
  }, []);

  const uniqueSports = useMemo(() => {
    const seen = new Map();
    sports.forEach((sp) => {
      const key = String(sp?.SportName || "").trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, sp);
    });
    return [...seen.values()];
  }, [sports]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Athlete goals & badges"
        title="Goals & Badges"
        description="Track sport-wise attendance, evaluation targets, and training milestones to earn XP and rank badges."
        actions={
          <Button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={showForm ? "bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-none border-0" : ""}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close Form" : "Set Goal"}
          </Button>
        }
      />
      {notice ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}
      <GoalsBadgesSection
        sports={uniqueSports}
        onNotify={setNotice}
        showForm={showForm}
        setShowForm={setShowForm}
      />
    </PageShell>
  );
}
