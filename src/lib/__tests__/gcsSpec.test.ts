import { describe, it, expect } from 'vitest';
import {
  NAMING_SPEC,
  normalizeEnvironment,
  normalizeApmId,
  formatApmIdDisplay,
  isValidApmId,
  normalizeLob,
  normalizeDataSensitivity,
  normalizeDataClassification,
  normalizeLabelValue,
  buildGcsBucketName,
  validateGcsBucketNaming,
  validateSpannerInstanceName,
  validateSpannerDatabaseName,
  buildSpannerDisplayName,
  buildCanonicalLabels,
  buildRequestedDocument,
  buildApprovedGuardrailPreview,
  validateGcsBucketRequest,
  type GcsBucketFormState,
} from '../gcsSpec';

const validDefaultFormState: GcsBucketFormState = {
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

describe('Intake & Label Value Normalization (ADR-SVC-001, ADR-GLB-006, ADR-GLB-008)', () => {
  it('normalizes legacy environment codes to nonprod (no hyphen) and prod to prod', () => {
    for (const legacy of ['sandbox', 'dev', 'qa', 'test', 'pdev', 'pqa', 'preprod', 'non-prod', 'NONPROD']) {
      expect(normalizeEnvironment(legacy)).toBe('nonprod');
    }
    expect(normalizeEnvironment('prod')).toBe('prod');
    expect(normalizeEnvironment('PROD')).toBe('prod');
  });

  it('normalizes APM ID (accepts lowercase input, displays uppercase APM + 5 digits, uses lowercase in label/preview), LOB, data sensitivity, and data classification', () => {
    expect(formatApmIdDisplay('apm12345')).toBe('APM12345');
    expect(normalizeApmId('APM12345')).toBe('apm12345');
    expect(isValidApmId('apm12345')).toBe(true);
    expect(isValidApmId('APM12345')).toBe(true);
    expect(isValidApmId('APM0017299')).toBe(false);
    expect(isValidApmId('APM1234')).toBe(false);
    expect(normalizeLob('SPP')).toBe('spp');
    expect(normalizeDataSensitivity('restrict')).toBe('restricted');
    expect(normalizeDataSensitivity('RESTRICTED')).toBe('restricted');
    expect(normalizeDataSensitivity('unrestricted')).toBe('unrestricted');
    expect(normalizeDataClassification('Proprietary')).toBe('proprietary');
    expect(normalizeDataClassification('Confidential')).toBe('confidential');
    expect(normalizeDataClassification('Internal')).toBe('internal');
    expect(normalizeDataClassification('Public')).toBe('public');
  });

  it('passes LBL-002 label value normalization test vectors from ADR-GLB-008', () => {
    expect(normalizeLabelValue('bucket.owner@example.com')).toBe('bucket_owner_example_com');
    expect(normalizeLabelValue('spp-orders-team@example.com')).toBe('spp-orders-team_example_com');
    expect(normalizeLabelValue('SPP-Orders Team')).toBe('spp-orders_team');
    const seventyChars = 'a'.repeat(75);
    expect(normalizeLabelValue(seventyChars)).toHaveLength(63);
  });

  it('computes the 8 mandatory labels plus metadata-derived labels and never emits environmentsubtype (LBL-001)', () => {
    const labels = buildCanonicalLabels({
      apmId: 'APM12345',
      costCenter: '000000',
      environment: 'nonprod',
      lob: 'SPP',
      dataSensitivity: 'restrict',
      dataClassification: 'Proprietary',
      owner: 'bucket.owner@example.com',
      sharedMailbox: 'spp-orders-team@example.com',
      tenancy: 'dedicated',
      resourceId: '9478bcfc-c2cf-583b-8bd8-096476647840',
      userLabels: {
        app: 'orders',
        environmentsubtype: 'dev',
      },
    });

    for (const mandatoryKey of NAMING_SPEC.mandatoryLabels) {
      expect(labels[mandatoryKey]).toBeDefined();
      expect(labels[mandatoryKey].length).toBeGreaterThan(0);
    }

    expect(labels).toEqual({
      app: 'orders',
      costcenter: '000000',
      dataclassification: 'proprietary',
      datasensitivity: 'restricted',
      environmenttype: 'nonprod',
      idp_resource_id: '9478bcfc-c2cf-583b-8bd8-096476647840',
      owner: 'bucket_owner_example_com',
      primarylob: 'spp',
      provisionedby: 'idp',
      sharedemailaddress: 'spp-orders-team_example_com',
      sppappid: 'apm12345',
      tenancy: 'dedicated',
    });
    expect(labels['environmentsubtype']).toBeUndefined();
  });
});

describe('Naming Spec Generation & Validation Test Vectors (specs/naming/naming-spec.json & ADR-GLB-006)', () => {
  it('generates live GCS bucket name matching {lob}-{env}-{app}-{purpose}-{suffix}', () => {
    const name = buildGcsBucketName({
      lob: 'spp',
      env: 'dev',
      app: 'orders',
      purpose: 'landing',
      suffix: 'a1b2',
    });
    expect(name).toBe('spp-nonprod-orders-landing-a1b2');
  });

  it('passes valid gcs_bucket test vector', () => {
    const violations = validateGcsBucketNaming({
      name: 'spp-nonprod-orders-landing-a1b2',
      lob: 'spp',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'landing',
      suffix: 'a1b2',
    });
    expect(violations).toHaveLength(0);
  });

  it('rejects env token mismatch in name with GCS-NAME-001', () => {
    const violations = validateGcsBucketNaming({
      name: 'spp-prod-orders-landing-a1b2',
      lob: 'spp',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'landing',
      suffix: 'a1b2',
    });
    expect(violations.some((v) => v.ruleId === 'GCS-NAME-001')).toBe(true);
  });

  it('rejects missing 4-char random suffix with GCS-NAME-001', () => {
    const violations = validateGcsBucketNaming({
      name: 'spp-nonprod-orders-landing',
      lob: 'spp',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'landing',
      suffix: '',
    });
    expect(violations.some((v) => v.ruleId === 'GCS-NAME-001')).toBe(true);
  });

  it('rejects uppercase characters in name with GCS-NAME-001', () => {
    const violations = validateGcsBucketNaming({
      name: 'SPP-nonprod-orders-landing-a1b2',
      lob: 'SPP',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'landing',
      suffix: 'a1b2',
    });
    expect(violations.some((v) => v.ruleId === 'GCS-NAME-001')).toBe(true);
  });

  it('rejects forbidden google substring or goog prefix with GCS-NAME-002', () => {
    const v1 = validateGcsBucketNaming({
      name: 'spp-nonprod-orders-google-a1b2',
      lob: 'spp',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'google',
      suffix: 'a1b2',
    });
    expect(v1.some((v) => v.ruleId === 'GCS-NAME-002')).toBe(true);

    const v2 = validateGcsBucketNaming({
      name: 'goog-nonprod-orders-landing-a1b2',
      lob: 'goog',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'landing',
      suffix: 'a1b2',
    });
    expect(v2.some((v) => v.ruleId === 'GCS-NAME-002')).toBe(true);
  });

  it('rejects reserved purpose words (e.g. restricted, prod, nonprod) with NAM-RSV-001', () => {
    for (const reservedWord of ['restricted', 'unrestricted', 'nonprod', 'non-prod', 'prod', 'dev']) {
      const violations = validateGcsBucketNaming({
        name: `spp-nonprod-orders-${reservedWord}-a1b2`,
        lob: 'spp',
        environment: 'nonprod',
        app: 'orders',
        purposeToken: reservedWord,
        suffix: 'a1b2',
      });
      expect(violations.some((v) => v.ruleId === 'NAM-RSV-001')).toBe(true);
    }
  });

  it('rejects rename on update with NAM-IMM-001', () => {
    const violations = validateGcsBucketNaming({
      name: 'spp-nonprod-orders-archive-a1b2',
      lob: 'spp',
      environment: 'nonprod',
      app: 'orders',
      purposeToken: 'archive',
      suffix: 'a1b2',
      action: 'update',
      existingName: 'spp-nonprod-orders-landing-a1b2',
    });
    expect(violations.some((v) => v.ruleId === 'NAM-IMM-001')).toBe(true);
  });

  it('validates Spanner instance, database, and display name vectors (SPN-NAME-001..003)', () => {
    expect(
      validateSpannerInstanceName({
        name: 'orders-db',
        lob: 'spp',
        environment: 'nonprod',
        app: 'orders',
      })[0]?.ruleId
    ).toBe('SPN-NAME-001');

    expect(
      validateSpannerDatabaseName({
        name: 'orders',
        app: 'orders',
      })
    ).toHaveLength(0);

    expect(
      validateSpannerDatabaseName({
        name: 'orders_history',
        app: 'orders',
        purpose: 'history',
      })
    ).toHaveLength(0);

    expect(
      validateSpannerDatabaseName({
        name: 'history',
        app: 'orders',
      })[0]?.ruleId
    ).toBe('SPN-NAME-002');

    expect(
      validateSpannerDatabaseName({
        name: 'orders-history',
        app: 'orders',
        purpose: 'history',
      })[0]?.ruleId
    ).toBe('SPN-NAME-002');

    expect(buildSpannerDisplayName({ lob: 'SPP', app: 'Orders', purpose: null, env: 'nonprod' })).toBe(
      'SPP Orders (nonprod)'
    );
    expect(buildSpannerDisplayName({ lob: 'SPP', app: 'Orders', purpose: 'Reporting', env: 'prod' })).toBe(
      'SPP Orders Reporting (prod)'
    );
    expect(
      buildSpannerDisplayName({ lob: 'SPP', app: 'Ledgerengine', purpose: 'Reconciliation', env: 'prod' })
    ).toBe('SPP Ledgerengine (prod)');
  });
});

describe('GCS Bucket Request Validation & Requested Document Shape (ADR-SVC-001)', () => {
  it('produces a clean validation result and exact requested document for default valid state', () => {
    const violations = validateGcsBucketRequest(validDefaultFormState);
    expect(violations).toEqual([]);

    const doc = buildRequestedDocument(validDefaultFormState);
    expect(doc).toEqual({
      api_version: 'idp.spp/v1',
      kind: 'gcs_bucket',
      action: 'create',
      metadata: {
        apm_id: 'apm12345',
        project_id: 'spp-nonprod-orders-svc',
        environment: 'nonprod',
        lob: 'spp',
        data_sensitivity: 'restricted',
        data_classification: 'proprietary',
        owner: 'bucket.owner@example.com',
        shared_mailbox: 'spp-orders-team@example.com',
        requested_by: 'requester@example.com',
        cost_center: '000000',
        tenancy: 'dedicated',
        labels: {
          app: 'orders',
        },
        extensions: {
          spp: {
            sppml_version: '1.5',
          },
        },
      },
      spec: {
        name: 'spp-nonprod-orders-landing-a1b2',
        location: 'us-east1',
        storage_class: 'STANDARD',
        versioning: false,
        lifecycle_rules: [],
        access: [
          {
            role: 'roles/storage.objectAdmin',
            members: ['serviceAccount:orders-pipeline@spp-nonprod-orders-svc.iam.gserviceaccount.com'],
          },
          {
            role: 'roles/storage.objectViewer',
            members: ['group:gcp-spp-nonprod-orders-read@example.com'],
          },
        ],
        purpose: 'Landing zone for order events',
      },
    });
  });

  it('enforces location fixed to us-east1 (GCS-LOC-001)', () => {
    const violations = validateGcsBucketRequest({
      ...validDefaultFormState,
      location: 'US',
    });
    expect(violations.some((v) => v.ruleId === 'GCS-LOC-001')).toBe(true);
  });

  it('enforces CMEK in locations/us-east1 (GCS-ENC-001)', () => {
    const violations = validateGcsBucketRequest({
      ...validDefaultFormState,
      cmekKeyOverride: 'projects/spp-kms-nonprod/locations/us/keyRings/ring/cryptoKeys/key',
    });
    expect(violations.some((v) => v.ruleId === 'GCS-ENC-001')).toBe(true);
  });

  it('enforces retention_locked = false unless recordsManagementFlag is true (GCS-RET-003)', () => {
    const violationsWhenUnflagged = validateGcsBucketRequest({
      ...validDefaultFormState,
      recordsManagementFlag: false,
      retentionLocked: true,
    });
    expect(violationsWhenUnflagged.some((v) => v.ruleId === 'GCS-RET-003')).toBe(true);

    const violationsWhenFlagged = validateGcsBucketRequest({
      ...validDefaultFormState,
      recordsManagementFlag: true,
      retentionLocked: true,
    });
    expect(violationsWhenFlagged.some((v) => v.ruleId === 'GCS-RET-003')).toBe(false);
  });

  it('validates optional lifecycle rules (Delete, SetStorageClass, DeleteNoncurrent)', () => {
    const withRules: GcsBucketFormState = {
      ...validDefaultFormState,
      lifecycleRules: [
        { id: '1', kind: 'Delete', age_days: 180, with_state: 'ANY' },
        { id: '2', kind: 'SetStorageClass', storage_class: 'COLDLINE', age_days: 90 },
      ],
    };
    expect(validateGcsBucketRequest(withRules)).toHaveLength(0);
    const doc = buildRequestedDocument(withRules);
    expect(doc.spec.lifecycle_rules).toEqual([
      { action: { type: 'Delete' }, condition: { age_days: 180, with_state: 'ANY' } },
      { action: { type: 'SetStorageClass', storage_class: 'COLDLINE' }, condition: { age_days: 90 } },
    ]);

    // Delete age_days < retentionDays (90) should fail GCS-LCY-001
    const invalidDeleteAge: GcsBucketFormState = {
      ...validDefaultFormState,
      retentionDays: 90,
      lifecycleRules: [{ id: '1', kind: 'Delete', age_days: 30, with_state: 'ANY' }],
    };
    expect(validateGcsBucketRequest(invalidDeleteAge).some((v) => v.ruleId === 'GCS-LCY-001')).toBe(true);

    // Noncurrent version rule without versioning enabled should fail GCS-LCY-003
    const invalidNoncurrent: GcsBucketFormState = {
      ...validDefaultFormState,
      versioning: false,
      lifecycleRules: [
        { id: '3', kind: 'DeleteNoncurrent', days_since_noncurrent_time: 30, num_newer_versions: 3 },
      ],
    };
    expect(validateGcsBucketRequest(invalidNoncurrent).some((v) => v.ruleId === 'GCS-LCY-003')).toBe(true);
  });

  it('rejects forbidden IAM members (user:, allUsers, allAuthenticatedUsers) and roles (roles/storage.admin)', () => {
    const badPrincipal = validateGcsBucketRequest({
      ...validDefaultFormState,
      accessBindings: [{ role: 'roles/storage.objectViewer', members: ['user:alice@example.com'] }],
    });
    expect(badPrincipal.some((v) => v.ruleId === 'GCS-IAM-002')).toBe(true);

    const badRole = validateGcsBucketRequest({
      ...validDefaultFormState,
      accessBindings: [
        { role: 'roles/storage.admin', members: ['group:gcp-spp-nonprod-orders-read@example.com'] },
      ],
    });
    expect(badRole.some((v) => v.ruleId === 'GCS-IAM-001')).toBe(true);
  });

  it('builds Approved gate guardrail trace preview with CMEK, UBLA, PAP, Retention, and 8 Mandatory Labels', () => {
    const doc = buildRequestedDocument(validDefaultFormState);
    const preview = buildApprovedGuardrailPreview(validDefaultFormState, doc);
    expect(preview.uniformBucketLevelAccess).toBe(true);
    expect(preview.publicAccessPrevention).toBe('enforced');
    expect(preview.retentionLocked).toBe(false);
    expect(preview.kmsKeyName).toBe(
      'projects/microdrive-dev/locations/us-east1/keyRings/spp-keyring/cryptoKeys/spp-gcs-cmek'
    );
    expect(preview.guardrailTrace.map((t) => t.rule_id)).toEqual([
      'GCS-UBLA-001',
      'GCS-PAP-001',
      'GCS-ENC-001',
      'GCS-RET-001',
      'GCS-RET-003',
      'GCS-SDP-001',
      'GCS-DEL-001',
      'LBL-001',
    ]);
  });
});
