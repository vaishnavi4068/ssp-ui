import React from 'react';
import {
  Database,
  HardDrive,
  ShieldCheck,
  Lock,
  ArrowRight,
  Clock,
  CheckCircle2,
  GitBranch,
  FileCode2,
  Sparkles,
} from 'lucide-react';
import { RESOURCE_KIND_REGISTRY, type ResourceKindRegistryEntry } from '../lib/kindRegistry';

interface ServiceCatalogProps {
  onSelectKind: (kind: ResourceKindRegistryEntry['kind']) => void;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({ onSelectKind }) => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Hero Banner matching 17-shopify-polar-commerce */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#008060]/15 text-[#008060] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SPP Authorized Infrastructure Storefront • GCP (us-east1)</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Self-Service Cloud Infrastructure Catalog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Provision governed Google Cloud Platform resources backed by the SPP four-gate state model (
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
              Requested → Approved → Expected → Observed
            </span>
            ). Every resource is registered in{' '}
            <code className="font-mono text-[#008060]">idp.resource_kind</code> (ADR-GLB-009) with
            enforced OPA guardrails, mandatory CMEK encryption in{' '}
            <code className="font-mono">us-east1</code>, and 8 canonical governance labels (ADR-GLB-008).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectKind('gcs_bucket')}
            className="px-4 py-2.5 rounded-xl bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Request GCS Bucket</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Platform Scope & Guardrails Summary Strip */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[11px] font-semibold text-[#008060] uppercase tracking-wider">
              Platform Governance Baseline
            </span>
            <h2
              className="text-base font-bold"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Active SPP Guardrails & Constraints
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#F1F2F4] dark:bg-[#0B0D0E] border border-slate-200 dark:border-neutral-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            State Bucket: gs://microdrive-dev-spp-tfstate
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#008060] font-semibold">
              <span>CLOUD & REGION</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
              GCP • us-east1 Only
            </div>
            <p className="text-[11px] text-slate-500">
              Single region us-east1 enforced across nonprod and prod (no multi-region US or nam3).
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#008060] font-semibold">
              <span>ENVIRONMENTS</span>
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
              nonprod | prod
            </div>
            <p className="text-[11px] text-slate-500">
              Normalized token nonprod (no hyphen). Legacy dev/qa/test/stage map to nonprod; no environmentsubtype.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#008060] font-semibold">
              <span>NAMING STANDARD</span>
              <FileCode2 className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-sm font-mono truncate">
              {'{lob}-{env}-{app}-{purpose}-{suffix}'}
            </div>
            <p className="text-[11px] text-slate-500">
              Deterministic token naming per ADR-GLB-006 (specs/naming/naming-spec.json).
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#008060] font-semibold">
              <span>LABEL STANDARD</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
              8 Mandatory Labels (LBL-001)
            </div>
            <p className="text-[11px] text-slate-500">
              sppappid, costcenter, environmenttype, primarylob, datasensitivity, owner, provisionedby, idp_resource_id.
            </p>
          </div>
        </div>
      </div>

      {/* Resource Kind Registry Cards (ADR-GLB-009) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#008060]">
              ADR-GLB-009 Resource Kind Registry (idp.resource_kind)
            </span>
            <h2
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Registered GCP Resource Kinds ({RESOURCE_KIND_REGISTRY.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            1 Enabled • 2 Coming Soon
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {RESOURCE_KIND_REGISTRY.map((item) => {
            const isStorage = item.category === 'Storage';
            return (
              <div
                key={item.kind}
                data-testid={`catalog-card-${item.kind}`}
                className={`rounded-2xl border bg-white dark:bg-[#141719] p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                  item.enabled
                    ? 'border-[#008060]/40 hover:border-[#008060] hover:shadow-md'
                    : 'border-slate-200 dark:border-neutral-800 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#008060]/15 text-[#008060] uppercase">
                      {item.cloud} • {item.category}
                    </span>
                    {item.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-[#008060]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span>Coming soon</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.enabled
                          ? 'bg-[#008060] text-white'
                          : 'bg-[#F1F2F4] dark:bg-[#1C2023] text-slate-500'
                      }`}
                    >
                      {isStorage ? (
                        <HardDrive className="w-5 h-5" />
                      ) : (
                        <Database className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold leading-tight"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        {item.display_name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        kind: <span className="text-slate-600 dark:text-slate-300 font-semibold">{item.kind}</span>
                        {item.parent_kind && (
                          <span> • parent: {item.parent_kind}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Registry Metadata Box */}
                  <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#1C2023] border border-slate-200/80 dark:border-neutral-800 p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">tfvars_collection:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {item.tfvars_collection}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">tf_address:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200 truncate">
                        {item.tf_address_template}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">opa_package:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {item.opa_package}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">approval_gate_key:</span>
                      <span className="font-mono text-[#008060] font-semibold">
                        {item.approval_gate_key}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">location:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {item.location_constraint}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/60 dark:border-neutral-700 flex items-center gap-1.5 text-[10px] font-mono text-slate-500 truncate">
                      <GitBranch className="w-3 h-3 shrink-0 text-[#008060]" />
                      <span className="truncate">{item.tf_module_source}</span>
                    </div>
                  </div>

                  <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5">
                        <span className="text-[#008060] font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Schema {item.schema_version}</span>
                    <span className="text-[11px] font-semibold text-[#008060]">
                      {item.schema_uri}
                    </span>
                  </div>

                  {item.enabled ? (
                    <button
                      type="button"
                      data-testid={`request-btn-${item.kind}`}
                      onClick={() => onSelectKind(item.kind)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Configure & Request GCS Bucket</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      data-testid={`request-btn-${item.kind}`}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Coming Soon (ADR-SVC-002 Phase 6)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
