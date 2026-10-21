import React from 'react';
import {
  FileText,
  CheckSquare,
  Boxes,
  ServerOff,
  ArrowLeft,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { getRuntimeConfig } from '../lib/config';

interface EmptyStatePageProps {
  page: 'requests' | 'approvals' | 'resources';
  onBackToCatalog: () => void;
}

const PAGE_METADATA = {
  requests: {
    badge: 'GATE 1 • REQUESTED (idp.request)',
    title: 'My Provisioning Requests',
    subtitle:
      'Track submitted infrastructure requests through the SPP four-gate lifecycle (Requested → Approved → Expected → Observed).',
    emptyTitle: 'No Provisioning Requests Recorded',
    emptyDescription:
      'The SPP Control Plane API (ssp-cp) is not deployed yet, and no provisioning requests have been persisted in AlloyDB (idp.request). No mock or synthetic request rows are shown.',
    endpoint: 'GET /api/v1/requests',
    tableRef: 'idp.submission / idp.request',
    icon: FileText,
  },
  approvals: {
    badge: 'GATE 2 • APPROVED (idp.approval)',
    title: 'Governance & Owner Approvals',
    subtitle:
      'Review and decide pending approval gates (gcs_bucket_owner, spanner_data_owner) with full OPA guardrail trace visibility.',
    emptyTitle: 'No Pending or Historical Approvals',
    emptyDescription:
      'The SPP Control Plane API (ssp-cp) and Temporal ApprovalGateWorkflow are not deployed yet. No fake approval queues or mock decisions are displayed.',
    endpoint: 'GET /api/v1/approvals',
    tableRef: 'idp.approval / idp.approval_decision',
    icon: CheckSquare,
  },
  resources: {
    badge: 'GATES 3 & 4 • EXPECTED & OBSERVED (idp.resource)',
    title: 'Managed Cloud Resources & Drift Status',
    subtitle:
      'Inspect provisioned GCP resources, composed terraform.tfvars.json revisions in gs://microdrive-dev-spp-tfstate, and alert-only drift findings.',
    emptyTitle: 'No Managed GCP Resources Observed',
    emptyDescription:
      'The SPP Control Plane API (ssp-cp) and StateUnitReconcilerWorkflow (ssp-workers) are not deployed yet. No synthetic cloud inventory or mock drift rows are displayed.',
    endpoint: 'GET /api/v1/resources',
    tableRef: 'idp.resource / idp.resource_observed / idp.drift_finding',
    icon: Boxes,
  },
} as const;

export const EmptyStatePage: React.FC<EmptyStatePageProps> = ({
  page,
  onBackToCatalog,
}) => {
  const meta = PAGE_METADATA[page];
  const Icon = meta.icon;
  const cfg = getRuntimeConfig();
  const baseDisplay = cfg.API_BASE_URL || '(same-origin /api/v1)';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6" data-testid={`empty-page-${page}`}>
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#008060]">
            {meta.badge}
          </span>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {meta.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {meta.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-10 shadow-sm text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#008060]/10 text-[#008060] flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <ServerOff className="w-3.5 h-3.5" />
            <span>Control plane not deployed yet</span>
          </div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {meta.emptyTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {meta.emptyDescription}
          </p>
        </div>

        <div className="max-w-lg mx-auto rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] p-4 text-left space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#008060]" />
              <span>Control Plane Endpoint:</span>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {meta.endpoint}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Configured API Base:</span>
            <span className="text-slate-600 dark:text-slate-300">{baseDisplay}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">AlloyDB Schema Target:</span>
            <span className="text-[#008060] font-semibold">{meta.tableRef}</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="px-5 py-2.5 rounded-xl bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span>Browse Service Catalog</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#008060]" />
          <span>
            Zero mock backend • Zero fake data • Strict adherence to ADR-GLB-003 & ADR-SVC-001
          </span>
        </div>
      </div>
    </div>
  );
};
