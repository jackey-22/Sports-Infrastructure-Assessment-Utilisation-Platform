import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  FileText,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { adminService } from "../../../services/admin/adminService";
import { useAdminQuery } from "../../../hooks/admin/useAdminQuery";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../../utils/admin/adminUtils";
import {
  Button,
  Card,
  DemoBanner,
  EmptyState,
  ErrorState,
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  ProgressBar,
  SectionHeader,
  StatusPill,
  TableSkeleton,
} from "../Common/AdminUI";
import VerificationReview from "./VerificationReview";

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-xs text-slate-700">{children}</dd>
    </div>
  );
}

export default function GrantDetail() {
  const { grantId } = useParams();
  const { data, loading, error, reload } = useAdminQuery(
    () => adminService.getGrant(grantId),
    [grantId]
  );
  const [grant, setGrant] = useState(null);
  const [reviewId, setReviewId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (data) setGrant(data);
  }, [data]);

  const proofInReview = useMemo(() => {
    if (!grant || !reviewId) return null;
    const proof = grant.proofs.find((row) => row.id === reviewId);
    return proof
      ? {
          ...proof,
          grantId: grant.id,
          facilityName: grant.facilityName,
          district: grant.district,
          purpose: grant.purpose,
          allocated: grant.allocated,
          released: grant.released,
          utilised: grant.utilised,
        }
      : null;
  }, [grant, reviewId]);

  async function applyDecision(decision, note) {
    if (!proofInReview) return;
    setBusy(true);
    try {
      await adminService.reviewUtilisationProof({
        grantId: grant.id,
        proofId: proofInReview.id,
        decision,
        note,
      });
      reload();
      setNotice(
        `${proofInReview.id} was marked “${decision}”. The Facility Manager sees the same status.`
      );
    } finally {
      setBusy(false);
      setReviewId(null);
    }
  }

  if (loading && !grant) {
    return (
      <PageShell>
        <Card>
          <TableSkeleton rows={8} columns={4} />
        </Card>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <Card>
          <ErrorState message={error.message} onRetry={reload} />
        </Card>
      </PageShell>
    );
  }

  if (!grant) {
    return (
      <PageShell>
        <Card>
          <EmptyState
            title="Grant not found"
            description={`No grant matches ${grantId}.`}
            action={
              <Button as={Link} to="/admin/insights/grants">
                Back to grants
              </Button>
            }
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin · Grants"
        title={grant.id}
        description={`${grant.facilityName} · ${grant.district} · ${grant.purpose}`}
        actions={
          <>
            <Button as={Link} to="/admin/insights/grants" variant="secondary">
              <ArrowLeft className="h-4 w-4" /> All grants
            </Button>
            <Button as={Link} to="/admin/insights/grants/allocate">
              <Wallet className="h-4 w-4" /> Allocate grant
            </Button>
          </>
        }
      />

      <DemoBanner>
        Provisional grant record. Release history, proofs and verification decisions
        are demo data held in the shared demo store, so the Facility Manager sees the
        same status; no grant policy or approval hierarchy is implemented.
      </DemoBanner>

      {notice ? (
        <Notice tone="success" title="Utilisation decision recorded" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={grant.status} />
        <span className="text-[11px] text-slate-400">
          Applied {formatDate(grant.applicationDate)} · Coordination: {grant.coordination.manager}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Allocated"
          value={formatCurrency(grant.allocated, { compact: true })}
          caption="Provisional allocation"
          icon={Landmark}
          tone="green"
        />
        <KpiCard
          label="Released"
          value={formatCurrency(grant.released, { compact: true })}
          caption={`${grant.releases.length} instalment(s) recorded`}
          icon={ReceiptText}
          tone="blue"
        />
        <KpiCard
          label="Verified utilisation"
          value={formatCurrency(grant.utilised, { compact: true })}
          caption={`${formatCurrency(grant.pendingVerification, { compact: true })} awaiting verification`}
          icon={FileText}
          tone="amber"
        />
        <KpiCard
          label="Remaining"
          value={formatCurrency(grant.remaining, { compact: true })}
          caption="Allocated minus released"
          icon={Wallet}
          tone="slate"
        />
      </div>

      <Card className="mb-4">
        <SectionHeader
          title="Release versus utilisation"
          description="Released amount is the funding ceiling for verified utilisation in this provisional model."
        />
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <ProgressBar
            label="Released against allocation"
            value={grant.released}
            max={grant.allocated}
            tone="blue"
          />
          <ProgressBar
            label="Verified utilisation against released"
            value={grant.utilised}
            max={grant.released || 1}
            tone="green"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Allocation information" />
          <dl className="divide-y divide-slate-100/70 px-4 pb-3 sm:px-5">
            <DetailRow label="Grant reference">{grant.id}</DetailRow>
            <DetailRow label="Recipient">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                {grant.facilityName}
              </span>
            </DetailRow>
            <DetailRow label="District">{grant.district}</DetailRow>
            <DetailRow label="Purpose">{grant.purpose}</DetailRow>
            <DetailRow label="Application date">{formatDate(grant.applicationDate)}</DetailRow>
            <DetailRow label="Coordinating contact">
              {grant.coordination.manager} · {grant.coordination.contact}
            </DetailRow>
          </dl>
        </Card>

        <Card>
          <SectionHeader
            title="Payment / release history"
            description="Provisional instalments recorded against this grant."
          />
          {grant.releases.length === 0 ? (
            <EmptyState title="No release recorded yet" description="This grant has no instalment yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-bold">Release</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Date</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Reference</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {grant.releases.map((release) => (
                    <tr key={release.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-[11px] text-slate-700">{release.id}</p>
                        <p className="text-[11px] text-slate-500">{release.mode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">{formatDate(release.date)}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                        {release.reference}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand-dark">
                        {formatCurrency(release.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <SectionHeader
            title="Utilisation proofs"
            description="Submitted expenditure evidence."
          />
          {grant.proofs.length === 0 ? (
            <EmptyState title="No utilisation proof submitted" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-bold">Proof</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Submitted</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Claimed</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Reviewed</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {grant.proofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-[11px] text-slate-700">{proof.id}</p>
                        <p className="text-[11px] text-slate-500">{proof.proofFile}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {formatDate(proof.submittedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand-dark">
                        {formatCurrency(proof.claimed)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={proof.status} />
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">
                        {proof.reviewedAt ? (
                          <>
                            {formatDate(proof.reviewedAt)}
                            <span className="block text-[10px] text-slate-500">
                              {proof.reviewedBy}
                            </span>
                          </>
                        ) : (
                          "Pending"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {proof.status === "Submitted" ? (
                          <Button size="sm" onClick={() => setReviewId(proof.id)}>
                            Review
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled>
                            Reviewed
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <SectionHeader title="Verification & allocation history" />
          <ol className="space-y-3 px-4 py-4 sm:px-5">
            {grant.history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="border-l border-slate-200 pl-4">
                <p className="text-xs font-bold text-brand-dark">{entry.action}</p>
                <p className="text-[11px] text-slate-400">{entry.actor}</p>
                <p className="text-[11px] text-slate-500">
                  {entry.at.length === 10 ? formatDate(entry.at) : formatDateTime(entry.at)} ·{" "}
                  {entry.note}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <VerificationReview
        key={proofInReview ? proofInReview.id : "closed"}
        proof={proofInReview}
        busy={busy}
        onClose={() => setReviewId(null)}
        onDecision={applyDecision}
      />
    </PageShell>
  );
}
