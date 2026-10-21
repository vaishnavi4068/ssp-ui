import { resolveCmekKeyName } from './config';

/**
 * Naming & Labeling specification constants from ssp-doc specs/naming/naming-spec.json
 * and ADR-GLB-006 / ADR-GLB-008 / ADR-SVC-001.
 */
export const NAMING_SPEC = {
  spec: 'idp-naming',
  version: '1.0.0',
  tokens: {
    lob: {
      pattern: /^[a-z][a-z0-9]{1,5}$/,
    },
    env: {
      allowed: ['nonprod', 'prod'] as const,
      nonprodAliases: ['sandbox', 'dev', 'qa', 'test', 'pdev', 'pqa', 'preprod', 'non-prod', 'nonprod'] as const,
    },
    app: {
      pattern: /^[a-z][a-z0-9]{1,11}$/,
    },
    purpose: {
      minLength: 2,
      maxLength: 20,
      kebabPattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
      snakePattern: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
      reserved: [
        'non-prod',
        'nonprod',
        'prod',
        'sandbox',
        'dev',
        'qa',
        'test',
        'pdev',
        'pqa',
        'preprod',
        'restricted',
        'unrestricted',
      ],
    },
    suffix: {
      length: 4,
      alphabet: 'abcdefghijklmnopqrstuvwxyz0123456789',
      pattern: /^[a-z0-9]{4}$/,
    },
  },
  forbiddenGcs: {
    prefixes: ['goog'],
    substrings: ['google', 'g00gle'],
  },
  mandatoryLabels: [
    'sppappid',
    'costcenter',
    'environmenttype',
    'primarylob',
    'datasensitivity',
    'owner',
    'provisionedby',
    'idp_resource_id',
  ] as const,
  allowedBucketIamRoles: [
    'roles/storage.objectAdmin',
    'roles/storage.objectViewer',
    'roles/storage.objectCreator',
    'roles/storage.objectUser',
    'roles/storage.legacyBucketReader',
  ] as const,
  apmAliasFixtures: {
    apm12345: 'orders',
    apm17299: 'orders',
    apm18401: 'payments',
    apm19102: 'ledger',
    apm20550: 'analytics',
  } as Record<string, string>,
};

export type NormalizedEnvironment = 'nonprod' | 'prod';
export type NormalizedDataSensitivity = 'restricted' | 'unrestricted';
export type NormalizedDataClassification =
  | 'public'
  | 'internal'
  | 'proprietary'
  | 'confidential'
  | 'restricted';

export function normalizeEnvironment(rawEnv: string): NormalizedEnvironment {
  const cleaned = (rawEnv || '').trim().toLowerCase();
  if (cleaned === 'prod' || cleaned === 'production') {
    return 'prod';
  }
  if (
    (NAMING_SPEC.tokens.env.nonprodAliases as readonly string[]).includes(cleaned)
  ) {
    return 'nonprod';
  }
  return cleaned === 'prod' ? 'prod' : 'nonprod';
}

export function normalizeApmId(rawApmId: string): string {
  return (rawApmId || '').trim().toLowerCase();
}

export function formatApmIdDisplay(rawApmId: string): string {
  return (rawApmId || '').trim().toUpperCase();
}

export function isValidApmId(rawApmId: string): boolean {
  return /^APM\d{5}$/.test(formatApmIdDisplay(rawApmId));
}

export function normalizeLob(rawLob: string): string {
  return (rawLob || '').trim().toLowerCase();
}

export function normalizeDataSensitivity(raw: string): NormalizedDataSensitivity {
  const cleaned = (raw || '').trim().toLowerCase();
  if (cleaned === 'restrict' || cleaned === 'restricted' || cleaned === 'high' || cleaned === 'sensitive') {
    return 'restricted';
  }
  if (cleaned === 'unrestrict' || cleaned === 'unrestricted' || cleaned === 'low' || cleaned === 'public') {
    return 'unrestricted';
  }
  return cleaned === 'unrestricted' ? 'unrestricted' : 'restricted';
}

export function normalizeDataClassification(raw: string): NormalizedDataClassification {
  const cleaned = (raw || '').trim().toLowerCase();
  if (cleaned === 'prop' || cleaned === 'proprietary' || cleaned === 'company-proprietary') {
    return 'proprietary';
  }
  if (cleaned === 'conf' || cleaned === 'confidential' || cleaned === 'highly-confidential') {
    return 'confidential';
  }
  if (cleaned === 'restrict' || cleaned === 'restricted') {
    return 'restricted';
  }
  if (cleaned === 'pub' || cleaned === 'public') {
    return 'public';
  }
  if (cleaned === 'int' || cleaned === 'internal') {
    return 'internal';
  }
  return 'proprietary';
}

/**
 * LBL-002 Label Value Normalization:
 * - lowercase: true
 * - replace_pattern: [^a-z0-9_-] -> '_'
 * - max_length: 63
 * - drop_empty: true
 */
export function normalizeLabelValue(raw: string): string {
  const lowered = (raw || '').toLowerCase();
  const replaced = lowered.replace(/[^a-z0-9_-]/g, '_');
  return replaced.slice(0, 63);
}

export function normalizeLabelKey(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function isValidLabelKey(key: string): boolean {
  return /^[a-z][a-z0-9_-]{0,62}$/.test(key) && key !== 'environmentsubtype';
}

export function generateRandomSuffix(): string {
  const alphabet = NAMING_SPEC.tokens.suffix.alphabet;
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 4; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export interface GcsBucketNameTokens {
  lob: string;
  env: string;
  app: string;
  purpose: string;
  suffix: string;
}

export function buildGcsBucketName(tokens: GcsBucketNameTokens): string {
  const lob = normalizeLob(tokens.lob);
  const env = normalizeEnvironment(tokens.env);
  const app = (tokens.app || '').trim().toLowerCase();
  const purpose = (tokens.purpose || '').trim().toLowerCase();
  const suffix = (tokens.suffix || '').trim().toLowerCase();
  return `${lob}-${env}-${app}-${purpose}-${suffix}`;
}

export interface ValidationViolation {
  ruleId: string;
  field: string;
  message: string;
}

/**
 * Validates a GCS bucket name and its constituent tokens against ADR-GLB-006 / specs/naming/naming-spec.json
 * Rules: GCS-NAME-001, GCS-NAME-002, NAM-RSV-001, NAM-IMM-001
 */
export function validateGcsBucketNaming(params: {
  name: string;
  lob: string;
  environment: string;
  app: string;
  purposeToken: string;
  suffix: string;
  action?: 'create' | 'update' | 'import';
  existingName?: string;
}): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const { name, lob, environment, app, purposeToken, suffix, action = 'create', existingName } = params;

  if (action === 'update' && existingName && name !== existingName) {
    violations.push({
      ruleId: 'NAM-IMM-001',
      field: 'spec.name',
      message: 'An update request must keep the exact name of the resource it updates (no rename via update).',
    });
    return violations;
  }

  if (action === 'import') {
    return violations;
  }

  // Check NAM-RSV-001 on purpose token first
  const lowerPurpose = (purposeToken || '').trim().toLowerCase();
  if ((NAMING_SPEC.tokens.purpose.reserved as readonly string[]).includes(lowerPurpose)) {
    violations.push({
      ruleId: 'NAM-RSV-001',
      field: 'purposeToken',
      message: `Purpose token '${purposeToken}' is a reserved word (environment or data sensitivity terms belong in labels, not purpose).`,
    });
  }

  // Check GCS-NAME-002 on name and purpose
  const lowerName = (name || '').toLowerCase();
  for (const prefix of NAMING_SPEC.forbiddenGcs.prefixes) {
    if (lowerName.startsWith(prefix)) {
      violations.push({
        ruleId: 'GCS-NAME-002',
        field: 'spec.name',
        message: `Bucket name cannot start with forbidden prefix '${prefix}' (Cloud Storage rule).`,
      });
    }
  }
  for (const sub of NAMING_SPEC.forbiddenGcs.substrings) {
    if (lowerName.includes(sub) || lowerPurpose.includes(sub)) {
      violations.push({
        ruleId: 'GCS-NAME-002',
        field: 'spec.name',
        message: `Bucket name cannot contain forbidden substring '${sub}' (Cloud Storage rule).`,
      });
    }
  }

  // Check individual tokens for GCS-NAME-001
  if (!NAMING_SPEC.tokens.lob.pattern.test(lob)) {
    violations.push({
      ruleId: 'GCS-NAME-001',
      field: 'metadata.lob',
      message: 'LOB token must be 2–6 lowercase alphanumeric characters starting with a letter (^[a-z][a-z0-9]{1,5}$).',
    });
  }

  if (environment !== 'nonprod' && environment !== 'prod') {
    violations.push({
      ruleId: 'GCS-NAME-001',
      field: 'metadata.environment',
      message: "Environment token must be 'nonprod' (no hyphen) or 'prod'.",
    });
  }

  if (!NAMING_SPEC.tokens.app.pattern.test(app)) {
    violations.push({
      ruleId: 'GCS-NAME-001',
      field: 'app',
      message: 'App alias token must be 2–12 lowercase alphanumeric characters starting with a letter (^[a-z][a-z0-9]{1,11}$).',
    });
  }

  if (
    purposeToken.length < NAMING_SPEC.tokens.purpose.minLength ||
    purposeToken.length > NAMING_SPEC.tokens.purpose.maxLength ||
    !NAMING_SPEC.tokens.purpose.kebabPattern.test(purposeToken)
  ) {
    violations.push({
      ruleId: 'GCS-NAME-001',
      field: 'purposeToken',
      message: 'Purpose token must be 2–20 lowercase kebab-case characters (^[a-z][a-z0-9]*(-[a-z0-9]+)*$).',
    });
  }

  if (!NAMING_SPEC.tokens.suffix.pattern.test(suffix)) {
    violations.push({
      ruleId: 'GCS-NAME-001',
      field: 'suffix',
      message: 'Suffix must be a 4-character lowercase alphanumeric string (^[a-z0-9]{4}$).',
    });
  }

  const expectedName = `${lob}-${environment}-${app}-${purposeToken}-${suffix}`;
  if (name !== expectedName || name.length > 63 || /[A-Z]/.test(name)) {
    violations.push({
      ruleId: 'GCS-NAME-001',
      field: 'spec.name',
      message: `Bucket name '${name}' must equal '{lob}-{env}-{app}-{purpose}-{suffix}' ('${expectedName}') and be <= 63 lowercase chars.`,
    });
  }

  return violations;
}

/**
 * Validates Spanner instance and database names per ADR-GLB-006 test vectors
 */
export function validateSpannerInstanceName(params: {
  name: string;
  lob: string;
  environment: 'nonprod' | 'prod';
  app: string;
  purpose?: string | null;
}): ValidationViolation[] {
  const { name, lob, environment, app, purpose } = params;
  const expected = purpose ? `${lob}-${environment}-${app}-${purpose}` : `${lob}-${environment}-${app}`;
  if (name !== expected || name.length > 64) {
    return [
      {
        ruleId: 'SPN-NAME-001',
        field: 'spec.name',
        message: `Spanner instance name '${name}' must equal '${expected}'.`,
      },
    ];
  }
  return [];
}

export function validateSpannerDatabaseName(params: {
  name: string;
  app: string;
  purpose?: string | null;
}): ValidationViolation[] {
  const { name, app, purpose } = params;
  if (purpose && !NAMING_SPEC.tokens.purpose.snakePattern.test(purpose)) {
    return [
      {
        ruleId: 'SPN-NAME-002',
        field: 'spec.name',
        message: 'Spanner database purpose must use snake_case (underscore), not hyphens.',
      },
    ];
  }
  const validExact = purpose ? `${app}_${purpose}` : app;
  const matchesPattern = name === app || (name.startsWith(`${app}_`) && /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name));
  if (!matchesPattern || (purpose !== undefined && name !== validExact) || name.length > 30) {
    return [
      {
        ruleId: 'SPN-NAME-002',
        field: 'spec.name',
        message: `Spanner database name '${name}' must equal '{app}' or '{app}_{purpose}' using snake_case.`,
      },
    ];
  }
  return [];
}

export function buildSpannerDisplayName(params: {
  lob: string;
  app: string;
  purpose?: string | null;
  env: 'nonprod' | 'prod';
}): string {
  const upperLob = params.lob.toUpperCase();
  const titleApp = params.app.charAt(0).toUpperCase() + params.app.slice(1).toLowerCase();
  const suffix = ` (${params.env})`;
  if (params.purpose && params.purpose.trim()) {
    const words = params.purpose
      .trim()
      .split(/[-_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    while (words.length > 0) {
      const candidate = `${upperLob} ${titleApp} ${words.join(' ')}${suffix}`;
      if (candidate.length <= 30) {
        return candidate;
      }
      words.pop();
    }
  }
  const withoutPurpose = `${upperLob} ${titleApp}${suffix}`;
  if (withoutPurpose.length <= 30) {
    return withoutPurpose;
  }
  const maxAppLen = Math.max(1, 30 - upperLob.length - 1 - suffix.length);
  return `${upperLob} ${titleApp.slice(0, maxAppLen)}${suffix}`;
}

export interface MandatoryLabelsInput {
  apmId: string;
  costCenter: string;
  environment: 'nonprod' | 'prod';
  lob: string;
  dataSensitivity: string;
  dataClassification: string;
  owner: string;
  sharedMailbox: string;
  tenancy: 'dedicated' | 'shared';
  resourceId: string;
  userLabels?: Record<string, string>;
  isLegacyImport?: boolean;
}

/**
 * Computes the canonical label map per ADR-GLB-008 (LBL-001 & LBL-002).
 * Always includes the 8 mandatory labels:
 *   sppappid, costcenter, environmenttype, primarylob, datasensitivity, owner, provisionedby, idp_resource_id
 * Plus metadata-derived labels:
 *   dataclassification, sharedemailaddress, tenancy
 * NEVER emits environmentsubtype.
 */
export function buildCanonicalLabels(input: MandatoryLabelsInput): Record<string, string> {
  const merged: Record<string, string> = {};

  if (input.userLabels) {
    for (const [rawKey, rawVal] of Object.entries(input.userLabels)) {
      const k = normalizeLabelKey(rawKey);
      if (!k || k === 'environmentsubtype') continue;
      const v = normalizeLabelValue(rawVal);
      if (v) {
        merged[k] = v;
      }
    }
  }

  const mandatoryAndDerived: Record<string, string> = {
    sppappid: normalizeLabelValue(normalizeApmId(input.apmId)),
    costcenter: normalizeLabelValue(input.costCenter),
    environmenttype: normalizeEnvironment(input.environment),
    primarylob: normalizeLabelValue(normalizeLob(input.lob)),
    datasensitivity: normalizeLabelValue(normalizeDataSensitivity(input.dataSensitivity)),
    owner: normalizeLabelValue(input.owner),
    provisionedby: 'idp',
    idp_resource_id: normalizeLabelValue(input.resourceId),
    dataclassification: normalizeLabelValue(normalizeDataClassification(input.dataClassification)),
    sharedemailaddress: normalizeLabelValue(input.sharedMailbox),
    tenancy: normalizeLabelValue(input.tenancy),
  };

  for (const [k, v] of Object.entries(mandatoryAndDerived)) {
    if (v) {
      merged[k] = v;
    }
  }

  if (input.isLegacyImport) {
    merged['idp_naming'] = 'legacy';
  }

  // Sort keys alphabetically for deterministic JSON output matching gcs_bucket.gates.json
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(merged).sort()) {
    sorted[k] = merged[k];
  }
  return sorted;
}

export type LifecycleRuleUI =
  | {
      id: string;
      kind: 'Delete';
      age_days: number;
      with_state: 'ANY' | 'LIVE' | 'ARCHIVED';
    }
  | {
      id: string;
      kind: 'SetStorageClass';
      storage_class: 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
      age_days: number;
    }
  | {
      id: string;
      kind: 'DeleteNoncurrent';
      days_since_noncurrent_time: number;
      num_newer_versions: number;
    };

export interface GcsLifecycleRuleSpec {
  action: {
    type: 'Delete' | 'SetStorageClass';
    storage_class?: 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  };
  condition: {
    age_days?: number;
    with_state?: 'ANY' | 'LIVE' | 'ARCHIVED';
    days_since_noncurrent_time?: number;
    num_newer_versions?: number;
  };
}

export interface GcsAccessBinding {
  role: string;
  members: string[];
}

export interface GcsBucketFormState {
  apmId: string;
  appAlias: string;
  projectId: string;
  environment: string;
  lob: string;
  purposeToken: string;
  suffix: string;
  purposeDescription: string;
  dataSensitivity: string;
  dataClassification: string;
  owner: string;
  sharedMailbox: string;
  requestedBy: string;
  costCenter: string;
  tenancy: 'dedicated' | 'shared';
  location: string;
  storageClass: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  versioning: boolean;
  retentionDays: number;
  recordsManagementFlag: boolean;
  retentionLocked: boolean;
  cmekKeyOverride?: string;
  userLabels: Array<{ key: string; value: string }>;
  extensionsJson: string;
  lifecycleRules: LifecycleRuleUI[];
  accessBindings: GcsAccessBinding[];
  resourceIdPreview: string;
}

export interface RequestedDocument {
  api_version: 'idp.spp/v1';
  kind: 'gcs_bucket';
  action: 'create';
  metadata: {
    apm_id: string;
    project_id: string;
    environment: NormalizedEnvironment;
    lob: string;
    data_sensitivity: NormalizedDataSensitivity;
    data_classification: NormalizedDataClassification;
    owner: string;
    shared_mailbox: string;
    requested_by: string;
    cost_center: string;
    tenancy: 'dedicated' | 'shared';
    labels: Record<string, string>;
    extensions?: Record<string, Record<string, string>>;
  };
  spec: {
    name: string;
    location: string;
    storage_class: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
    versioning: boolean;
    lifecycle_rules: GcsLifecycleRuleSpec[];
    access: GcsAccessBinding[];
    purpose: string;
    records_management_retention_lock?: boolean;
  };
}

export function convertLifecycleRulesToSpec(rules: LifecycleRuleUI[]): GcsLifecycleRuleSpec[] {
  return rules.map((r) => {
    if (r.kind === 'Delete') {
      return {
        action: { type: 'Delete' },
        condition: {
          age_days: r.age_days,
          with_state: r.with_state,
        },
      };
    }
    if (r.kind === 'SetStorageClass') {
      return {
        action: {
          type: 'SetStorageClass',
          storage_class: r.storage_class,
        },
        condition: {
          age_days: r.age_days,
        },
      };
    }
    return {
      action: { type: 'Delete' },
      condition: {
        days_since_noncurrent_time: r.days_since_noncurrent_time,
        num_newer_versions: r.num_newer_versions,
        with_state: 'ARCHIVED',
      },
    };
  });
}

export function buildRequestedDocument(state: GcsBucketFormState): RequestedDocument {
  const lob = normalizeLob(state.lob);
  const env = normalizeEnvironment(state.environment);
  const apmId = normalizeApmId(state.apmId);
  const app = (state.appAlias || 'orders').trim().toLowerCase();
  const purposeToken = (state.purposeToken || '').trim().toLowerCase();
  const suffix = (state.suffix || '').trim().toLowerCase();
  const bucketName = buildGcsBucketName({
    lob,
    env,
    app,
    purpose: purposeToken,
    suffix,
  });

  const userLabelsMap: Record<string, string> = {};
  for (const item of state.userLabels) {
    const k = normalizeLabelKey(item.key);
    const v = normalizeLabelValue(item.value);
    if (k && v && k !== 'environmentsubtype') {
      userLabelsMap[k] = v;
    }
  }

  let parsedExtensions: Record<string, Record<string, string>> | undefined;
  if (state.extensionsJson && state.extensionsJson.trim()) {
    try {
      const parsed = JSON.parse(state.extensionsJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsedExtensions = parsed;
      }
    } catch {
      // Handled by validation
    }
  }

  const doc: RequestedDocument = {
    api_version: 'idp.spp/v1',
    kind: 'gcs_bucket',
    action: 'create',
    metadata: {
      apm_id: apmId,
      project_id: state.projectId.trim(),
      environment: env,
      lob,
      data_sensitivity: normalizeDataSensitivity(state.dataSensitivity),
      data_classification: normalizeDataClassification(state.dataClassification),
      owner: state.owner.trim(),
      shared_mailbox: state.sharedMailbox.trim(),
      requested_by: state.requestedBy.trim(),
      cost_center: state.costCenter.trim(),
      tenancy: state.tenancy,
      labels: userLabelsMap,
      ...(parsedExtensions ? { extensions: parsedExtensions } : {}),
    },
    spec: {
      name: bucketName,
      location: state.location.trim(),
      storage_class: state.storageClass,
      versioning: state.versioning,
      lifecycle_rules: convertLifecycleRulesToSpec(state.lifecycleRules),
      access: state.accessBindings.map((b) => ({
        role: b.role.trim(),
        members: b.members.map((m) => m.trim()).filter(Boolean),
      })),
      purpose: state.purposeDescription.trim(),
      ...(state.recordsManagementFlag && state.retentionLocked
        ? { records_management_retention_lock: true }
        : {}),
    },
  };

  return doc;
}

export interface ApprovedGuardrailPreview {
  effectiveLabels: Record<string, string>;
  kmsKeyName: string;
  uniformBucketLevelAccess: true;
  publicAccessPrevention: 'enforced';
  retentionDays: number | null;
  retentionLocked: boolean;
  softDeleteRetentionDays: 7;
  forceDestroy: false;
  guardrailTrace: Array<{
    rule_id: string;
    path: string;
    from: unknown;
    to: unknown;
    reason: string;
  }>;
}

export function buildApprovedGuardrailPreview(
  state: GcsBucketFormState,
  requestedDoc: RequestedDocument
): ApprovedGuardrailPreview {
  const effectiveLabels = buildCanonicalLabels({
    apmId: requestedDoc.metadata.apm_id,
    costCenter: requestedDoc.metadata.cost_center,
    environment: requestedDoc.metadata.environment,
    lob: requestedDoc.metadata.lob,
    dataSensitivity: requestedDoc.metadata.data_sensitivity,
    dataClassification: requestedDoc.metadata.data_classification,
    owner: requestedDoc.metadata.owner,
    sharedMailbox: requestedDoc.metadata.shared_mailbox,
    tenancy: requestedDoc.metadata.tenancy,
    resourceId: state.resourceIdPreview,
    userLabels: requestedDoc.metadata.labels,
  });

  const kmsKeyName =
    state.cmekKeyOverride?.trim() ||
    resolveCmekKeyName(
      requestedDoc.metadata.lob,
      requestedDoc.metadata.environment,
      requestedDoc.metadata.project_id
    );

  // Retention policy is active when versioning is false
  const effectiveRetentionDays = requestedDoc.spec.versioning ? null : state.retentionDays;
  const effectiveRetentionLocked = state.recordsManagementFlag ? state.retentionLocked : false;

  const guardrailTrace = [
    {
      rule_id: 'GCS-UBLA-001',
      path: '/spec/uniform_bucket_level_access',
      from: null,
      to: true,
      reason: 'Uniform bucket-level access is mandatory.',
    },
    {
      rule_id: 'GCS-PAP-001',
      path: '/spec/public_access_prevention',
      from: null,
      to: 'enforced',
      reason: 'Public access prevention is enforced on all SPP Cloud Storage buckets.',
    },
    {
      rule_id: 'GCS-ENC-001',
      path: '/spec/kms_key_name',
      from: null,
      to: kmsKeyName,
      reason: `CMEK resolved by (lob=${requestedDoc.metadata.lob}, environment_type=${requestedDoc.metadata.environment}, location=us-east1); key location 'us-east1' matches bucket.`,
    },
    ...(effectiveRetentionDays !== null
      ? [
          {
            rule_id: 'GCS-RET-001',
            path: '/spec/retention_days',
            from: null,
            to: effectiveRetentionDays,
            reason: 'Retention floor for restricted data (set by the GCS ADR). Versioning stays off.',
          },
        ]
      : []),
    {
      rule_id: 'GCS-RET-003',
      path: '/spec/retention_locked',
      from: null,
      to: effectiveRetentionLocked,
      reason: 'Locks are irreversible and only applied on an explicit records-management request.',
    },
    {
      rule_id: 'GCS-SDP-001',
      path: '/spec/soft_delete_retention_days',
      from: null,
      to: 7,
      reason: 'Soft-delete window for accidental deletes.',
    },
    {
      rule_id: 'GCS-DEL-001',
      path: '/spec/force_destroy',
      from: null,
      to: false,
      reason: 'The platform never force-destroys a bucket with objects in it.',
    },
    {
      rule_id: 'LBL-001',
      path: '/metadata/labels',
      from: requestedDoc.metadata.labels,
      to: effectiveLabels,
      reason: 'Mandatory labels merged with user labels; one key set for every kind.',
    },
  ];

  return {
    effectiveLabels,
    kmsKeyName,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    retentionDays: effectiveRetentionDays,
    retentionLocked: effectiveRetentionLocked,
    softDeleteRetentionDays: 7,
    forceDestroy: false,
    guardrailTrace,
  };
}

/**
 * Full client-side validation mirroring ssp-doc ADR-SVC-001, ADR-GLB-006, ADR-GLB-007, ADR-GLB-008
 */
export function validateGcsBucketRequest(state: GcsBucketFormState): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const normalizedLobVal = normalizeLob(state.lob);
  const normalizedEnvVal = normalizeEnvironment(state.environment);
  const appAlias = (state.appAlias || '').trim().toLowerCase();
  const purposeToken = (state.purposeToken || '').trim().toLowerCase();
  const suffix = (state.suffix || '').trim().toLowerCase();
  const generatedName = buildGcsBucketName({
    lob: normalizedLobVal,
    env: normalizedEnvVal,
    app: appAlias,
    purpose: purposeToken,
    suffix,
  });

  // 1. Naming rules (GCS-NAME-001, GCS-NAME-002, NAM-RSV-001)
  violations.push(
    ...validateGcsBucketNaming({
      name: generatedName,
      lob: normalizedLobVal,
      environment: normalizedEnvVal,
      app: appAlias,
      purposeToken,
      suffix,
    })
  );

  // 2. Metadata validations (ADR-SVC-001 & ADR-GLB-008 + APM + 5 digits decision)
  if (!isValidApmId(state.apmId)) {
    violations.push({
      ruleId: 'LBL-001',
      field: 'metadata.apm_id',
      message: "Application ID (APM ID) must match '^APM\\d{5}$' (APM + 5 digits, e.g. 'APM12345'; normalized to lowercase 'apm12345' in labels/spec).",
    });
  }

  if (!state.projectId.trim() || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(state.projectId.trim())) {
    violations.push({
      ruleId: 'GCS-PRJ-001',
      field: 'metadata.project_id',
      message: 'Target GCP Project ID must be a valid GCP project identifier (6–30 lowercase letters, digits, or hyphens).',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(state.owner.trim())) {
    violations.push({
      ruleId: 'LBL-001',
      field: 'metadata.owner',
      message: 'Bucket Owner email is required and must be a valid email address.',
    });
  }
  if (!emailRegex.test(state.sharedMailbox.trim())) {
    violations.push({
      ruleId: 'LBL-001',
      field: 'metadata.shared_mailbox',
      message: 'Team Shared Mailbox is required and must be a valid email address.',
    });
  }
  if (!emailRegex.test(state.requestedBy.trim())) {
    violations.push({
      ruleId: 'REQ-001',
      field: 'metadata.requested_by',
      message: 'Requester email is required and must be a valid email address.',
    });
  }

  if (!/^[0-9]{4,12}$/.test(state.costCenter.trim())) {
    violations.push({
      ruleId: 'LBL-001',
      field: 'metadata.cost_center',
      message: 'Cost Center is required (4–12 numeric digits, e.g. 000000).',
    });
  }

  if (!state.purposeDescription.trim() || state.purposeDescription.trim().length < 5) {
    violations.push({
      ruleId: 'GCS-PRP-001',
      field: 'spec.purpose',
      message: 'Business purpose description is required (minimum 5 characters).',
    });
  }

  // 3. Location constraint (ADR-SVC-001 GR-1: us-east1 only)
  if (state.location.trim() !== 'us-east1') {
    violations.push({
      ruleId: 'GCS-LOC-001',
      field: 'spec.location',
      message: "Location is locked to 'us-east1' in SPP (multi-region 'US' and other regions are prohibited).",
    });
  }

  // 4. CMEK key validation (GCS-ENC-001 / GCS-ENC-002)
  const kmsKey =
    state.cmekKeyOverride?.trim() ||
    resolveCmekKeyName(normalizedLobVal, normalizedEnvVal, state.projectId);
  const cmekPattern = /^projects\/[a-z0-9-]+\/locations\/us-east1\/keyRings\/[a-zA-Z0-9_-]+\/cryptoKeys\/[a-zA-Z0-9_-]+$/;
  if (!cmekPattern.test(kmsKey)) {
    violations.push({
      ruleId: 'GCS-ENC-001',
      field: 'spec.kms_key_name',
      message:
        "CMEK key is required and must reside in 'locations/us-east1' (projects/<project>/locations/us-east1/keyRings/<ring>/cryptoKeys/<key>).",
    });
  }

  // 5. Retention & Versioning mutual exclusivity + floor (GCS-RET-001, GCS-RET-003)
  const normalizedSens = normalizeDataSensitivity(state.dataSensitivity);
  if (!state.versioning) {
    if (normalizedSens === 'restricted' && state.retentionDays < 90) {
      violations.push({
        ruleId: 'GCS-RET-001',
        field: 'spec.retention_days',
        message: 'Restricted data buckets without versioning require a retention floor of at least 90 days.',
      });
    }
  } else if (state.retentionDays > 0) {
    violations.push({
      ruleId: 'GCS-RET-001',
      field: 'spec.versioning',
      message:
        'Object versioning (true) and bucket retention policy (retention_days > 0) are mutually exclusive in Cloud Storage. Set retention_days to 0 when enabling versioning.',
    });
  }

  if (state.retentionLocked && !state.recordsManagementFlag) {
    violations.push({
      ruleId: 'GCS-RET-003',
      field: 'spec.retention_locked',
      message:
        'retention_locked must be false unless an explicit records-management request flag is enabled (GCS retention locks are irreversible).',
    });
  }

  // 6. User Labels validation (ADR-GLB-008)
  for (const lbl of state.userLabels) {
    const k = normalizeLabelKey(lbl.key);
    if (!k && !lbl.value) continue;
    if (k === 'environmentsubtype') {
      violations.push({
        ruleId: 'LBL-001',
        field: 'metadata.labels',
        message: "The legacy 'environmentsubtype' label is dropped everywhere in SPP and cannot be specified.",
      });
    } else if (!isValidLabelKey(k)) {
      violations.push({
        ruleId: 'LBL-002',
        field: 'metadata.labels',
        message: `Label key '${lbl.key}' must match '^[a-z][a-z0-9_-]{0,62}$'.`,
      });
    }
  }

  // 7. Lifecycle rules validation (ADR-SVC-001 §1.3)
  for (let i = 0; i < state.lifecycleRules.length; i++) {
    const rule = state.lifecycleRules[i];
    if (rule.kind === 'Delete') {
      if (!Number.isInteger(rule.age_days) || rule.age_days < 1) {
        violations.push({
          ruleId: 'GCS-LCY-001',
          field: `spec.lifecycle_rules[${i}]`,
          message: `Lifecycle rule #${i + 1} (Delete): age_days must be a positive integer.`,
        });
      } else if (!state.versioning && state.retentionDays > 0 && rule.age_days < state.retentionDays) {
        violations.push({
          ruleId: 'GCS-LCY-001',
          field: `spec.lifecycle_rules[${i}]`,
          message: `Lifecycle rule #${i + 1} (Delete): age_days (${rule.age_days}) must be >= retention_days (${state.retentionDays}) when a retention policy is active.`,
        });
      }
    } else if (rule.kind === 'SetStorageClass') {
      if (!Number.isInteger(rule.age_days) || rule.age_days < 1) {
        violations.push({
          ruleId: 'GCS-LCY-002',
          field: `spec.lifecycle_rules[${i}]`,
          message: `Lifecycle rule #${i + 1} (SetStorageClass): age_days must be a positive integer.`,
        });
      }
    } else if (rule.kind === 'DeleteNoncurrent') {
      if (!state.versioning) {
        violations.push({
          ruleId: 'GCS-LCY-003',
          field: `spec.lifecycle_rules[${i}]`,
          message: `Lifecycle rule #${i + 1} (Noncurrent version cleanup): requires object versioning to be enabled.`,
        });
      }
      if (
        !Number.isInteger(rule.days_since_noncurrent_time) ||
        rule.days_since_noncurrent_time < 1 ||
        !Number.isInteger(rule.num_newer_versions) ||
        rule.num_newer_versions < 1
      ) {
        violations.push({
          ruleId: 'GCS-LCY-003',
          field: `spec.lifecycle_rules[${i}]`,
          message: `Lifecycle rule #${i + 1} (Noncurrent version cleanup): days_since_noncurrent_time and num_newer_versions must be >= 1.`,
        });
      }
    }
  }

  // 8. Access / IAM bindings validation (ADR-SVC-001 §1.4 & ADR-GLB-007 GR-3)
  if (state.accessBindings.length === 0) {
    violations.push({
      ruleId: 'GCS-IAM-001',
      field: 'spec.access',
      message: 'At least one IAM access binding (group: or serviceAccount:) is required.',
    });
  }
  for (let i = 0; i < state.accessBindings.length; i++) {
    const binding = state.accessBindings[i];
    if (
      !(NAMING_SPEC.allowedBucketIamRoles as readonly string[]).includes(binding.role)
    ) {
      violations.push({
        ruleId: 'GCS-IAM-001',
        field: `spec.access[${i}].role`,
        message: `Role '${binding.role}' is not in the GCS bucket role allowlist (roles/storage.admin and legacy owner roles are prohibited).`,
      });
    }
    const nonEmptyMembers = binding.members.map((m) => m.trim()).filter(Boolean);
    if (nonEmptyMembers.length === 0) {
      violations.push({
        ruleId: 'GCS-IAM-002',
        field: `spec.access[${i}].members`,
        message: `Access binding #${i + 1} must specify at least one member.`,
      });
    }
    for (const member of nonEmptyMembers) {
      if (
        member === 'allUsers' ||
        member === 'allAuthenticatedUsers' ||
        member.startsWith('user:') ||
        member.startsWith('domain:')
      ) {
        violations.push({
          ruleId: 'GCS-IAM-002',
          field: `spec.access[${i}].members`,
          message: `IAM member '${member}' is forbidden. Only 'group:' and 'serviceAccount:' principals are allowed (no 'user:', 'allUsers', or 'allAuthenticatedUsers').`,
        });
      } else if (!member.startsWith('group:') && !member.startsWith('serviceAccount:')) {
        violations.push({
          ruleId: 'GCS-IAM-002',
          field: `spec.access[${i}].members`,
          message: `IAM member '${member}' must start with 'group:' or 'serviceAccount:'.`,
        });
      }
    }
  }

  // 9. Extensions JSON syntax check
  if (state.extensionsJson && state.extensionsJson.trim()) {
    try {
      const parsed = JSON.parse(state.extensionsJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        violations.push({
          ruleId: 'REQ-EXT-001',
          field: 'metadata.extensions',
          message: 'Extensions must be a valid JSON object.',
        });
      }
    } catch {
      violations.push({
        ruleId: 'REQ-EXT-001',
        field: 'metadata.extensions',
        message: 'Extensions contains invalid JSON.',
      });
    }
  }

  return violations;
}
