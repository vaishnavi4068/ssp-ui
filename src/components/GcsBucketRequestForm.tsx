import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ServerOff,
  Copy,
  Check,
  Code2,
  Send,
  RotateCcw,
  KeyRound,
  Tags,
  Layers,
  Users,
  Clock,
} from 'lucide-react';
import {
  NAMING_SPEC,
  normalizeEnvironment,
  normalizeApmId,
  formatApmIdDisplay,
  normalizeLob,
  normalizeDataSensitivity,
  normalizeDataClassification,
  generateRandomSuffix,
  buildGcsBucketName,
  buildRequestedDocument,
  buildApprovedGuardrailPreview,
  validateGcsBucketRequest,
  type GcsBucketFormState,
  type LifecycleRuleUI,
} from '../lib/gcsSpec';
import { submitProvisioningRequest, type SubmitRequestOutcome } from '../lib/apiClient';
import { getRuntimeConfig } from '../lib/config';

interface GcsBucketRequestFormProps {
  onBack: () => void;
}

const DEFAULT_FORM_STATE: GcsBucketFormState = {
  apmId: 'APM12345',
  appAlias: 'orders',
  projectId: 'spp-nonprod-orders-svc',
  environment: 'nonprod',
  lob: 'spp',
  purposeToken: 'landing',
  suffix: 'a1b2',
  purposeDescription: 'Landing zone for order events',
  dataSensitivity: 'restricted',
  dataClassification: 'proprietary',
  owner: 'bucket.owner@example.com',
  sharedMailbox: 'spp-orders-team@example.com',
  requestedBy: 'requester@example.com',
  costCenter: '000000',
  tenancy: 'dedicated',
  location: 'us-east1',
  storageClass: 'STANDARD',
  versioning: false,
  retentionDays: 90,
  recordsManagementFlag: false,
  retentionLocked: false,
  cmekKeyOverride: '',
  userLabels: [{ key: 'app', value: 'orders' }],
  extensionsJson: JSON.stringify({ spp: { sppml_version: '1.5' } }, null, 2),
  lifecycleRules: [],
  accessBindings: [
    {
      role: 'roles/storage.objectAdmin',
      members: ['serviceAccount:orders-pipeline@spp-nonprod-orders-svc.iam.gserviceaccount.com'],
    },
    {
      role: 'roles/storage.objectViewer',
      members: ['group:gcp-spp-nonprod-orders-read@example.com'],
    },
  ],
  resourceIdPreview: '9478bcfc-c2cf-583b-8bd8-096476647840',
};

export const GcsBucketRequestForm: React.FC<GcsBucketRequestFormProps> = ({ onBack }) => {
  const [formState, setFormState] = useState<GcsBucketFormState>(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitOutcome, setSubmitOutcome] = useState<SubmitRequestOutcome | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [previewTab, setPreviewTab] = useState<'requested' | 'guardrails'>('requested');

  const requestedDoc = useMemo(() => buildRequestedDocument(formState), [formState]);
  const guardrailPreview = useMemo(
    () => buildApprovedGuardrailPreview(formState, requestedDoc),
    [formState, requestedDoc]
  );
  const violations = useMemo(() => validateGcsBucketRequest(formState), [formState]);

  const normalizedEnv = normalizeEnvironment(formState.environment);
  const normalizedLob = normalizeLob(formState.lob);
  const normalizedApm = normalizeApmId(formState.apmId);
  const normalizedSens = normalizeDataSensitivity(formState.dataSensitivity);
  const normalizedClass = normalizeDataClassification(formState.dataClassification);
  const liveBucketName = buildGcsBucketName({
    lob: normalizedLob,
    env: normalizedEnv,
    app: formState.appAlias,
    purpose: formState.purposeToken,
    suffix: formState.suffix,
  });

  const requestedJsonString = useMemo(
    () => JSON.stringify(requestedDoc, null, 2),
    [requestedDoc]
  );

  const handleFieldChange = <K extends keyof GcsBucketFormState>(
    key: K,
    value: GcsBucketFormState[K]
  ) => {
    setFormState((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'apmId') {
        const upperApm = formatApmIdDisplay(String(value));
        next.apmId = upperApm;
        const cleanApm = normalizeApmId(upperApm);
        if (NAMING_SPEC.apmAliasFixtures[cleanApm]) {
          next.appAlias = NAMING_SPEC.apmAliasFixtures[cleanApm];
        }
      }
      if (key === 'recordsManagementFlag' && !value) {
        next.retentionLocked = false;
      }
      if (key === 'versioning' && value === true) {
        next.retentionDays = 0;
      }
      if (key === 'versioning' && value === false && next.retentionDays === 0) {
        next.retentionDays = 90;
      }
      return next;
    });
  };

  const addLifecycleRule = (kind: LifecycleRuleUI['kind']) => {
    const id = `lcy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let newRule: LifecycleRuleUI;
    if (kind === 'Delete') {
      newRule = {
        id,
        kind: 'Delete',
        age_days: Math.max(90, formState.retentionDays || 90),
        with_state: 'ANY',
      };
    } else if (kind === 'SetStorageClass') {
      newRule = {
        id,
        kind: 'SetStorageClass',
        storage_class: 'NEARLINE',
        age_days: 30,
      };
    } else {
      newRule = {
        id,
        kind: 'DeleteNoncurrent',
        days_since_noncurrent_time: 30,
        num_newer_versions: 3,
      };
    }
    setFormState((prev) => ({
      ...prev,
      lifecycleRules: [...prev.lifecycleRules, newRule],
    }));
  };

  const updateLifecycleRule = (index: number, updated: LifecycleRuleUI) => {
    setFormState((prev) => ({
      ...prev,
      lifecycleRules: prev.lifecycleRules.map((r, i) => (i === index ? updated : r)),
    }));
  };

  const removeLifecycleRule = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      lifecycleRules: prev.lifecycleRules.filter((_, i) => i !== index),
    }));
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(requestedJsonString);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (violations.length > 0) {
      return;
    }
    setSubmitting(true);
    const outcome = await submitProvisioningRequest(requestedDoc);
    setSubmitOutcome(outcome);
    setSubmitting(false);
  };

  const runtimeCfg = getRuntimeConfig();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" data-testid="gcs-request-form">
      {/* Top Checkout Header Card matching 17-shopify-polar-commerce */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Back to Service Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#008060]/15 text-[#008060]">
                KIND: GCS_BUCKET • GCP (us-east1)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300">
                ADR-SVC-001 • Gate: gcs_bucket_owner
              </span>
            </div>
            <h1
              className="text-2xl font-bold mt-1"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Configure & Request: Cloud Storage Bucket
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormState(DEFAULT_FORM_STATE);
              setSubmitOutcome(null);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Spec Example</span>
          </button>
        </div>
      </div>

      {/* Control plane submission outcome banner */}
      {submitOutcome && (
        <div
          data-testid="submit-outcome-banner"
          className={`rounded-2xl border-2 p-5 shadow-sm space-y-2 ${
            submitOutcome.status === 'control_plane_unavailable'
              ? 'border-amber-500/70 bg-amber-50/90 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
              : submitOutcome.status === 'submitted'
              ? 'border-[#008060] bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
              : 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {submitOutcome.status === 'control_plane_unavailable' ? (
                <ServerOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : submitOutcome.status === 'submitted' ? (
                <CheckCircle2 className="w-5 h-5 text-[#008060] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h3
                  className="text-base font-bold"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {submitOutcome.status === 'control_plane_unavailable'
                    ? 'Control plane not deployed yet'
                    : submitOutcome.status === 'submitted'
                    ? 'Request Submitted to SPP Control Plane (ssp-cp)'
                    : 'Control Plane Rejected Request'}
                </h3>
                <p className="text-xs leading-relaxed">
                  {submitOutcome.status === 'control_plane_unavailable' ? (
                    <>
                      Attempted <code className="font-mono font-semibold">POST {submitOutcome.endpoint}</code>.{' '}
                      {submitOutcome.errorDetail} Your validated{' '}
                      <code className="font-mono font-semibold">requested</code> JSON payload is preserved
                      below and in the right-hand preview panel for inspection or CLI submission once{' '}
                      <code className="font-mono">ssp-cp</code> is online.
                    </>
                  ) : submitOutcome.status === 'submitted' ? (
                    <>
                      Successfully posted to{' '}
                      <code className="font-mono font-semibold">{submitOutcome.endpoint}</code> (HTTP{' '}
                      {submitOutcome.statusCode}).
                    </>
                  ) : (
                    <>{submitOutcome.errorDetail}</>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#141719] border border-slate-300 dark:border-neutral-700 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-[#008060]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Copied JSON' : 'Copy Requested JSON'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Checkout Layout matching 17-shopify-polar-commerce (7 cols left form, 5 cols sticky right summary & JSON preview) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: Naming & Identity (ADR-GLB-006 / naming-spec.json) */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#008060]">
                  Section 1 • ADR-GLB-006 Naming Specification
                </span>
                <h2
                  className="text-lg font-bold mt-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Deterministic Bucket Name & Target Project
                </h2>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#F1F2F4] dark:bg-[#0B0D0E] text-[#008060] font-semibold">
                {'{lob}-{env}-{app}-{purpose}-{suffix}'}
              </span>
            </div>

            {/* Live Bucket Name Banner */}
            <div className="p-4 rounded-xl border-2 border-[#008060]/40 bg-[#008060]/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-[#008060]">
                  Live Generated Bucket Name (spec.name)
                </span>
                <span className="font-mono text-slate-500">
                  {liveBucketName.length} / 63 chars
                </span>
              </div>
              <div
                data-testid="live-bucket-name"
                className="font-mono text-base sm:text-lg font-bold text-[#1A1C1D] dark:text-white break-all"
              >
                {liveBucketName}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>tf_address: module.gcs_bucket["{liveBucketName}"]</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* LOB */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.1 Line of Business (metadata.lob) *</span>
                  <span className="font-mono text-[10px] text-slate-400">normalized: {normalizedLob}</span>
                </label>
                <input
                  type="text"
                  data-testid="input-lob"
                  value={formState.lob}
                  onChange={(e) => handleFieldChange('lob', e.target.value)}
                  placeholder="spp"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
                <p className="text-[11px] text-slate-500">
                  2–6 lowercase alphanumeric chars (^[a-z][a-z0-9]&#123;1,5&#125;$). Uppercase inputs auto-normalize.
                </p>
              </div>

              {/* Environment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.2 Environment (metadata.environment) *</span>
                  <span className="font-mono text-[10px] text-[#008060] font-semibold">
                    token: {normalizedEnv}
                  </span>
                </label>
                <select
                  data-testid="select-environment"
                  value={formState.environment}
                  onChange={(e) => handleFieldChange('environment', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                >
                  <option value="nonprod">nonprod (Non-Production)</option>
                  <option value="prod">prod (Production)</option>
                  <option value="dev">dev (normalizes → nonprod)</option>
                  <option value="qa">qa (normalizes → nonprod)</option>
                  <option value="sandbox">sandbox (normalizes → nonprod)</option>
                  <option value="preprod">preprod (normalizes → nonprod)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Only <code className="font-mono">nonprod</code> (no hyphen) and{' '}
                  <code className="font-mono">prod</code> exist in SPP.
                </p>
              </div>

              {/* APM ID */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.3 Application ID (metadata.apm_id) *</span>
                  <span className="font-mono text-[10px] text-[#008060] font-semibold">
                    label/preview: {normalizedApm}
                  </span>
                </label>
                <input
                  type="text"
                  data-testid="input-apm-id"
                  value={formatApmIdDisplay(formState.apmId)}
                  onChange={(e) => handleFieldChange('apmId', e.target.value.toUpperCase())}
                  placeholder="APM12345"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono uppercase focus:outline-none focus:border-[#008060]"
                />
                <p className="text-[11px] text-slate-500">
                  Hint: <span className="font-semibold">APM + 5 digits</span> (<code className="font-mono">^APM\d&#123;5&#125;$</code>, e.g.{' '}
                  <code className="font-mono">APM12345</code>). Lowercase <code className="font-mono">{normalizedApm || 'apm12345'}</code> is used in{' '}
                  <code className="font-mono">sppappid</code> label &amp; spec preview.
                </p>
              </div>

              {/* App Alias Token */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.4 App Alias Token ({'{app}'}) *</span>
                  <span className="font-mono text-[10px] text-slate-400">Free text (2..12 chars)</span>
                </label>
                <input
                  type="text"
                  data-testid="input-app-alias"
                  value={formState.appAlias}
                  onChange={(e) => handleFieldChange('appAlias', e.target.value)}
                  placeholder="orders"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
                <p className="text-[11px] text-slate-500">
                  Application short token used in bucket name <code className="font-mono">{'{app}'}</code> (e.g. orders).
                </p>
              </div>

              {/* Purpose Token */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.5 Purpose Token ({'{purpose}'}) *</span>
                  <span className="font-mono text-[10px] text-slate-400">kebab-case, 2..20 chars</span>
                </label>
                <input
                  type="text"
                  data-testid="input-purpose-token"
                  value={formState.purposeToken}
                  onChange={(e) => handleFieldChange('purposeToken', e.target.value)}
                  placeholder="landing"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
                <p className="text-[11px] text-slate-500">
                  Reserved words (nonprod, prod, restricted, etc.) and &apos;google&apos; are rejected.
                </p>
              </div>

              {/* 4-char Suffix */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.6 Platform Suffix ({'{suffix}'}) *</span>
                  <span className="font-mono text-[10px] text-slate-400">4-char a-z0-9</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    data-testid="input-suffix"
                    maxLength={4}
                    value={formState.suffix}
                    onChange={(e) => handleFieldChange('suffix', e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                  />
                  <button
                    type="button"
                    onClick={() => handleFieldChange('suffix', generateRandomSuffix())}
                    className="h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 hover:border-[#008060] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Draw new 4-char random suffix (GCS-NAME-003)"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#008060]" />
                    <span>Draw</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Platform-drawn 4-char collision suffix (GCS-NAME-003).
                </p>
              </div>

              {/* Project ID */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>1.7 Target GCP Project ID (metadata.project_id) *</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    State Unit: su-gcp-{formState.projectId}
                  </span>
                </label>
                <input
                  type="text"
                  data-testid="input-project-id"
                  value={formState.projectId}
                  onChange={(e) => handleFieldChange('projectId', e.target.value)}
                  placeholder="spp-nonprod-orders-svc"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
              </div>

              {/* Business Purpose Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold">
                  1.8 Business Purpose Description (spec.purpose) *
                </label>
                <input
                  type="text"
                  data-testid="input-purpose-desc"
                  value={formState.purposeDescription}
                  onChange={(e) => handleFieldChange('purposeDescription', e.target.value)}
                  placeholder="Landing zone for order events"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs focus:outline-none focus:border-[#008060]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Ownership, Classification & Mandatory Labels (ADR-GLB-008) */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#008060]">
                  Section 2 • ADR-GLB-008 Governance & Labels (LBL-001 / LBL-002)
                </span>
                <h2
                  className="text-lg font-bold mt-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Ownership, Data Classification & 8 Mandatory Labels
                </h2>
              </div>
              <Tags className="w-5 h-5 text-[#008060]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data Sensitivity */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>2.1 Data Sensitivity (datasensitivity) *</span>
                  <span className="font-mono text-[10px] text-[#008060] font-semibold">
                    normalized: {normalizedSens}
                  </span>
                </label>
                <select
                  data-testid="select-data-sensitivity"
                  value={formState.dataSensitivity}
                  onChange={(e) => handleFieldChange('dataSensitivity', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                >
                  <option value="restricted">restricted (VPC-SC + 90d retention floor)</option>
                  <option value="restrict">restrict (normalizes → restricted)</option>
                  <option value="unrestricted">unrestricted</option>
                </select>
              </div>

              {/* Data Classification */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>2.2 Data Classification (dataclassification) *</span>
                  <span className="font-mono text-[10px] text-[#008060] font-semibold">
                    normalized: {normalizedClass}
                  </span>
                </label>
                <select
                  data-testid="select-data-classification"
                  value={formState.dataClassification}
                  onChange={(e) => handleFieldChange('dataClassification', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                >
                  <option value="proprietary">proprietary</option>
                  <option value="Prop">Prop (normalizes → proprietary)</option>
                  <option value="confidential">confidential</option>
                  <option value="restricted">restricted</option>
                  <option value="internal">internal</option>
                  <option value="public">public</option>
                </select>
              </div>

              {/* Owner Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  2.3 Bucket Owner Email (metadata.owner) *
                </label>
                <input
                  type="email"
                  data-testid="input-owner"
                  value={formState.owner}
                  onChange={(e) => handleFieldChange('owner', e.target.value)}
                  placeholder="bucket.owner@example.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  Label owner: {guardrailPreview.effectiveLabels.owner}
                </p>
              </div>

              {/* Shared Mailbox */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  2.4 Shared Team Mailbox (metadata.shared_mailbox) *
                </label>
                <input
                  type="email"
                  data-testid="input-shared-mailbox"
                  value={formState.sharedMailbox}
                  onChange={(e) => handleFieldChange('sharedMailbox', e.target.value)}
                  placeholder="spp-orders-team@example.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  Label sharedemailaddress: {guardrailPreview.effectiveLabels.sharedemailaddress}
                </p>
              </div>

              {/* Requested By */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  2.5 Requested By (metadata.requested_by) *
                </label>
                <input
                  type="email"
                  data-testid="input-requested-by"
                  value={formState.requestedBy}
                  onChange={(e) => handleFieldChange('requestedBy', e.target.value)}
                  placeholder="requester@example.com"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
              </div>

              {/* Cost Center */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  2.6 Cost Center (metadata.cost_center) *
                </label>
                <input
                  type="text"
                  data-testid="input-cost-center"
                  value={formState.costCenter}
                  onChange={(e) => handleFieldChange('costCenter', e.target.value)}
                  placeholder="000000"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                />
              </div>

              {/* Tenancy */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold">
                  2.7 Tenancy Model (metadata.tenancy) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['dedicated', 'shared'] as const).map((t) => {
                    const active = formState.tenancy === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleFieldChange('tenancy', t)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-[#008060] bg-[#008060]/10'
                            : 'border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023]'
                        }`}
                      >
                        <div className="text-xs font-bold capitalize">{t} Tenancy</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t === 'dedicated'
                            ? 'Dedicated to a single APM application'
                            : 'Shared across multiple consumers'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Additional User Labels */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">
                  2.8 User Labels (metadata.labels — merged with 8 Mandatory Labels via LBL-001)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleFieldChange('userLabels', [
                      ...formState.userLabels,
                      { key: '', value: '' },
                    ])
                  }
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-neutral-700 text-xs font-semibold text-[#008060] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Label</span>
                </button>
              </div>
              <div className="space-y-2">
                {formState.userLabels.map((lbl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={lbl.key}
                      onChange={(e) => {
                        const updated = [...formState.userLabels];
                        updated[idx] = { ...updated[idx], key: e.target.value };
                        handleFieldChange('userLabels', updated);
                      }}
                      placeholder="key (e.g. app)"
                      className="col-span-5 h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={lbl.value}
                      onChange={(e) => {
                        const updated = [...formState.userLabels];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        handleFieldChange('userLabels', updated);
                      }}
                      placeholder="value (e.g. orders)"
                      className="col-span-6 h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleFieldChange(
                          'userLabels',
                          formState.userLabels.filter((_, i) => i !== idx)
                        )
                      }
                      className="col-span-1 p-1.5 text-slate-400 hover:text-rose-500 flex justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 8 Mandatory Labels Live Preview Chip Grid */}
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#1C2023] border border-slate-200/80 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#008060] uppercase tracking-wider">
                  8 Mandatory Labels Computed at Approved Gate (No environmentsubtype)
                </span>
                <span className="font-mono text-slate-400">ADR-GLB-008</span>
              </div>
              <div
                data-testid="mandatory-labels-grid"
                className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono"
              >
                {NAMING_SPEC.mandatoryLabels.map((k) => (
                  <div
                    key={k}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#141719] border border-slate-200 dark:border-neutral-700 flex items-center justify-between gap-2"
                  >
                    <span className="text-[#008060] font-semibold">{k}:</span>
                    <span className="text-slate-700 dark:text-slate-200 truncate">
                      {guardrailPreview.effectiveLabels[k]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Location, Storage Class, CMEK & Retention Guardrails (ADR-SVC-001) */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#008060]">
                  Section 3 • ADR-SVC-001 Storage, CMEK & Retention Guardrails
                </span>
                <h2
                  className="text-lg font-bold mt-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Region (Fixed us-east1), CMEK Encryption & Retention Policy
                </h2>
              </div>
              <KeyRound className="w-5 h-5 text-[#008060]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fixed Location us-east1 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>3.1 Region Location (spec.location) *</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#008060]">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </label>
                <input
                  type="text"
                  data-testid="input-location"
                  value={formState.location}
                  readOnly
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-900 text-xs font-mono text-slate-600 dark:text-slate-300 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-500">
                  Locked to single region <code className="font-mono">us-east1</code> across nonprod and prod.
                </p>
              </div>

              {/* Storage Class */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  3.2 Default Storage Class (spec.storage_class) *
                </label>
                <select
                  data-testid="select-storage-class"
                  value={formState.storageClass}
                  onChange={(e) =>
                    handleFieldChange(
                      'storageClass',
                      e.target.value as GcsBucketFormState['storageClass']
                    )
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono focus:outline-none focus:border-[#008060]"
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="NEARLINE">NEARLINE</option>
                  <option value="COLDLINE">COLDLINE</option>
                  <option value="ARCHIVE">ARCHIVE</option>
                </select>
              </div>

              {/* CMEK Key from Config (Read-Only Default) */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold flex items-center justify-between">
                  <span>3.3 Required CMEK Key in locations/us-east1 (GCS-ENC-001) *</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#008060]">
                    <Lock className="w-3 h-3" /> Read-Only Default
                  </span>
                </label>
                <input
                  type="text"
                  data-testid="input-cmek-key"
                  value={guardrailPreview.kmsKeyName}
                  readOnly
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-900 text-xs font-mono text-slate-600 dark:text-slate-300 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-500">
                  Default CMEK key from runtime config (<code className="font-mono">projects/microdrive-dev/locations/us-east1/keyRings/spp-keyring/cryptoKeys/spp-gcs-cmek</code>).
                </p>
              </div>

              {/* Object Versioning */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  3.4 Object Versioning (spec.versioning)
                </label>
                <div className="h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] flex items-center justify-between">
                  <span className="text-xs font-mono">
                    versioning: {String(formState.versioning)}
                  </span>
                  <input
                    type="checkbox"
                    data-testid="checkbox-versioning"
                    checked={formState.versioning}
                    onChange={(e) => handleFieldChange('versioning', e.target.checked)}
                    className="w-4 h-4 accent-[#008060] cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Default false (mutually exclusive with bucket retention policy in GCS).
                </p>
              </div>

              {/* Retention Floor Days (GCS-RET-001) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  3.5 Retention Policy Days (GCS-RET-001)
                </label>
                <input
                  type="number"
                  data-testid="input-retention-days"
                  min={0}
                  max={3650}
                  disabled={formState.versioning}
                  value={formState.retentionDays}
                  onChange={(e) => handleFieldChange('retentionDays', Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-xs font-mono disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500">
                  90-day floor (7,776,000s) for restricted data when versioning is false.
                </p>
              </div>

              {/* Retention Lock & Records Management Flag (GCS-RET-003) */}
              <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>3.6 Records-Management Retention Lock (GCS-RET-003)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-neutral-800">
                        retention_locked: {String(guardrailPreview.retentionLocked)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      GCS retention locks are irreversible. <code className="font-mono">retention_locked</code> is
                      strictly <code className="font-mono">false</code> unless an explicit records-management
                      request flag is enabled.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="checkbox-records-mgmt"
                      checked={formState.recordsManagementFlag}
                      onChange={(e) => handleFieldChange('recordsManagementFlag', e.target.checked)}
                      className="w-4 h-4 accent-[#008060]"
                    />
                    <span className="font-medium">
                      Explicit Records-Management Request Flag
                    </span>
                  </label>
                  <label
                    className={`inline-flex items-center gap-2 ${
                      formState.recordsManagementFlag
                        ? 'cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid="checkbox-retention-locked"
                      disabled={!formState.recordsManagementFlag}
                      checked={formState.retentionLocked}
                      onChange={(e) => handleFieldChange('retentionLocked', e.target.checked)}
                      className="w-4 h-4 accent-[#008060]"
                    />
                    <span className="font-mono">
                      retention_locked = {String(formState.retentionLocked)}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Optional Object Lifecycle Rules (Default NONE / []) */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#008060]">
                  Section 4 • Optional Object Lifecycle Rules (Default NONE)
                </span>
                <h2
                  className="text-lg font-bold mt-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Object Lifecycle Policies (spec.lifecycle_rules)
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#008060]/15 text-[#008060] font-semibold">
                {formState.lifecycleRules.length === 0
                  ? 'Default: [] (NONE)'
                  : `${formState.lifecycleRules.length} Rule(s) Configured`}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Per ADR-SVC-001, <code className="font-mono">lifecycle_rules</code> defaults to{' '}
              <code className="font-mono font-semibold">[] (NONE)</code> (no silent 365-day auto-delete).
              You may optionally add rules to delete objects after N days, transition storage class after N
              days, or clean up noncurrent object versions.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="add-lifecycle-delete"
                onClick={() => addLifecycleRule('Delete')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-neutral-700 hover:border-[#008060] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#008060]" />
                <span>Add Delete after age_days</span>
              </button>
              <button
                type="button"
                data-testid="add-lifecycle-transition"
                onClick={() => addLifecycleRule('SetStorageClass')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-neutral-700 hover:border-[#008060] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#008060]" />
                <span>Add SetStorageClass after age_days</span>
              </button>
              <button
                type="button"
                data-testid="add-lifecycle-noncurrent"
                onClick={() => addLifecycleRule('DeleteNoncurrent')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-neutral-700 hover:border-[#008060] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-[#008060]" />
                <span>Add Noncurrent Version Cleanup</span>
              </button>
            </div>

            {formState.lifecycleRules.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 bg-[#F8F9FA] dark:bg-[#1C2023] text-center text-xs text-slate-500 font-mono">
                lifecycle_rules: [] — No automatic object deletion or storage class transition configured.
              </div>
            ) : (
              <div className="space-y-3">
                {formState.lifecycleRules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-neutral-700 pb-2">
                      <span className="text-xs font-mono font-bold text-[#008060]">
                        Rule #{idx + 1} •{' '}
                        {rule.kind === 'Delete'
                          ? 'Delete after age_days'
                          : rule.kind === 'SetStorageClass'
                          ? 'SetStorageClass after age_days'
                          : 'Delete Noncurrent Versions'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLifecycleRule(idx)}
                        className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    {rule.kind === 'Delete' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">
                            condition.age_days *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={rule.age_days}
                            onChange={(e) =>
                              updateLifecycleRule(idx, {
                                ...rule,
                                age_days: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">
                            condition.with_state
                          </label>
                          <select
                            value={rule.with_state}
                            onChange={(e) =>
                              updateLifecycleRule(idx, {
                                ...rule,
                                with_state: e.target.value as 'ANY' | 'LIVE' | 'ARCHIVED',
                              })
                            }
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] font-mono"
                          >
                            <option value="ANY">ANY</option>
                            <option value="LIVE">LIVE</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {rule.kind === 'SetStorageClass' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">
                            action.storage_class *
                          </label>
                          <select
                            value={rule.storage_class}
                            onChange={(e) =>
                              updateLifecycleRule(idx, {
                                ...rule,
                                storage_class: e.target.value as 'NEARLINE' | 'COLDLINE' | 'ARCHIVE',
                              })
                            }
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] font-mono"
                          >
                            <option value="NEARLINE">NEARLINE</option>
                            <option value="COLDLINE">COLDLINE</option>
                            <option value="ARCHIVE">ARCHIVE</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">
                            condition.age_days *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={rule.age_days}
                            onChange={(e) =>
                              updateLifecycleRule(idx, {
                                ...rule,
                                age_days: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {rule.kind === 'DeleteNoncurrent' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">
                            condition.days_since_noncurrent_time *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={rule.days_since_noncurrent_time}
                            onChange={(e) =>
                              updateLifecycleRule(idx, {
                                ...rule,
                                days_since_noncurrent_time: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-1">
                            condition.num_newer_versions *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={rule.num_newer_versions}
                            onChange={(e) =>
                              updateLifecycleRule(idx, {
                                ...rule,
                                num_newer_versions: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Authoritative IAM Access Bindings (spec.access) */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#008060]">
                  Section 5 • Authoritative Bucket IAM Bindings
                </span>
                <h2
                  className="text-lg font-bold mt-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Access Control (group: and serviceAccount: Principals Only)
                </h2>
              </div>
              <Users className="w-5 h-5 text-[#008060]" />
            </div>

            <div className="space-y-3">
              {formState.accessBindings.map((binding, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C2023] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={binding.role}
                      onChange={(e) => {
                        const updated = [...formState.accessBindings];
                        updated[idx] = { ...updated[idx], role: e.target.value };
                        handleFieldChange('accessBindings', updated);
                      }}
                      className="h-9 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] text-xs font-mono flex-1"
                    >
                      {NAMING_SPEC.allowedBucketIamRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        handleFieldChange(
                          'accessBindings',
                          formState.accessBindings.filter((_, i) => i !== idx)
                        )
                      }
                      className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Members (one per line — must start with group: or serviceAccount:)
                    </label>
                    <textarea
                      rows={2}
                      value={binding.members.join('\n')}
                      onChange={(e) => {
                        const updated = [...formState.accessBindings];
                        updated[idx] = {
                          ...updated[idx],
                          members: e.target.value.split('\n'),
                        };
                        handleFieldChange('accessBindings', updated);
                      }}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#141719] text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  handleFieldChange('accessBindings', [
                    ...formState.accessBindings,
                    {
                      role: 'roles/storage.objectViewer',
                      members: [`group:gcp-${normalizedLob}-${normalizedEnv}-${formState.appAlias}-read@example.com`],
                    },
                  ])
                }
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-neutral-700 hover:border-[#008060] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#008060]" />
                <span>Add IAM Role Binding</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sticky Column (5 cols): Order Summary + Validation Status + Live Requested JSON Preview */}
        <div className="lg:col-span-5 space-y-5">
          <div className="sticky top-20 space-y-5">
            {/* Validation & Order Summary Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
                <div>
                  <h3
                    className="text-base font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Provisioning Request Summary
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    POST {runtimeCfg.API_BASE_URL || ''}/api/v1/requests
                  </p>
                </div>
                {violations.length === 0 ? (
                  <span
                    data-testid="validation-status-valid"
                    className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-[#008060] text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Spec Valid</span>
                  </span>
                ) : (
                  <span
                    data-testid="validation-status-invalid"
                    className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{violations.length} Rule Violation(s)</span>
                  </span>
                )}
              </div>

              {/* Violations List */}
              {violations.length > 0 && (
                <div
                  data-testid="validation-violations-list"
                  className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/30 space-y-1.5 text-xs"
                >
                  <div className="font-bold text-rose-700 dark:text-rose-300">
                    Client-Side Policy & Naming Violations:
                  </div>
                  <ul className="space-y-1 text-[11px] text-rose-700 dark:text-rose-200">
                    {violations.map((v, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-mono font-bold shrink-0">[{v.ruleId}]</span>
                        <span>{v.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Enforced Specs Receipt */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Generated Name:</span>
                  <span className="font-mono font-semibold text-[#008060] truncate max-w-[220px]">
                    {liveBucketName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Location (Fixed):</span>
                  <span className="font-mono font-semibold">{formState.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Environment Token:</span>
                  <span className="font-mono font-semibold">{normalizedEnv}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Data Classification:</span>
                  <span className="font-mono font-semibold">
                    {normalizedSens} / {normalizedClass}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Lifecycle Rules:</span>
                  <span className="font-mono font-semibold">
                    {formState.lifecycleRules.length === 0
                      ? 'NONE ([])'
                      : `${formState.lifecycleRules.length} configured`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Retention Lock (GCS-RET-003):</span>
                  <span className="font-mono font-semibold">
                    {String(guardrailPreview.retentionLocked)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                data-testid="submit-request-btn"
                disabled={violations.length > 0 || submitting}
                className="w-full py-3 px-4 rounded-xl bg-[#008060] hover:bg-[#006e52] disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Submitting to POST /api/v1/requests...'
                    : 'Submit Request to Control Plane (POST /api/v1/requests)'}
                </span>
              </button>
            </div>

            {/* Live Requested JSON & Approved Guardrails Preview Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('requested')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      previewTab === 'requested'
                        ? 'bg-[#008060] text-white'
                        : 'bg-[#F1F2F4] dark:bg-[#0B0D0E] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Requested JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('guardrails')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      previewTab === 'guardrails'
                        ? 'bg-[#008060] text-white'
                        : 'bg-[#F1F2F4] dark:bg-[#0B0D0E] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approved Guardrails</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedJson ? (
                    <Check className="w-3 h-3 text-[#008060]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {previewTab === 'requested' ? (
                <pre
                  data-testid="requested-json-preview"
                  className="p-4 rounded-xl bg-slate-950 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-[460px] leading-relaxed"
                >
                  {requestedJsonString}
                </pre>
              ) : (
                <pre
                  data-testid="guardrail-json-preview"
                  className="p-4 rounded-xl bg-slate-950 text-sky-300 text-[11px] font-mono overflow-x-auto max-h-[460px] leading-relaxed"
                >
                  {JSON.stringify(guardrailPreview, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
