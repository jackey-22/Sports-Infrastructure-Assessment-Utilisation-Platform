import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";import { CITIZEN } from "../../../data/citizen/citizenDemoData";
import {
  Button,
  Card,
  DemoBanner,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
} from "../Common/CitizenUI";

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-xs text-slate-700">{children}</dd>
    </div>
  );
}

export default function CitizenProfile() {
  const citizen = CITIZEN;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen Console · Profile"
        title="My profile"
        description="Your citizen profile and assigned facility."
        actions={
          <Button as={Link} to="/citizen/dashboard" variant="secondary">
            <ArrowLeft className="h-3 w-3" /> Back to dashboard
          </Button>
        }
      />

      <DemoBanner>
        Profile data is fictional and scoped to this citizen. No profile data is
        sent to the server.
      </DemoBanner>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={citizen.role} />
        <span className="text-[11px] text-slate-400">
          Member ID: {citizen.memberId}
        </span>
      </div>

      <Card>
        <SectionHeader title="Personal information" />
        <dl className="divide-y divide-slate-100/70 px-4 pb-3 sm:px-5">
          <DetailRow label="Citizen ID">{citizen.id}</DetailRow>
          <DetailRow label="Name">{citizen.name}</DetailRow>
          <DetailRow label="Role">{citizen.role}</DetailRow>
          <DetailRow label="Email">{citizen.email}</DetailRow>
          <DetailRow label="Contact">{citizen.contact}</DetailRow>
          <DetailRow label="Member ID">{citizen.memberId}</DetailRow>
          <DetailRow label="Joined">{citizen.joinedAt}</DetailRow>
        </dl>
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Assigned facility" />
        <div className="px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary text-white">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-brand-dark">{CITIZEN.facilityName}</p>
              <p className="text-[11px] text-slate-400">{CITIZEN.district}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            This is the sports complex your attendance, feedback and complaints
            are associated with.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <SectionHeader title="Quick actions" />
          <div className="px-4 py-4 sm:px-5 space-y-2">
            <Button as={Link} to="/citizen/attendance" className="w-full text-left">
              <ShieldCheck className="h-4 w-4 mr-2" /> Record attendance
            </Button>
            <Button as={Link} to="/citizen/feedback" className="w-full text-left">
              <FileText className="h-4 w-4 mr-2" /> Submit feedback
            </Button>
            <Button as={Link} to="/citizen/complaints" className="w-full text-left">
              <FileText className="h-4 w-4 mr-2" /> File / track complaint
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}



