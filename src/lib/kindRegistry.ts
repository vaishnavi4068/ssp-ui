export interface ResourceKindRegistryEntry {
  kind: 'gcs_bucket' | 'spanner_instance' | 'spanner_database';
  cloud: 'gcp';
  parent_kind: 'spanner_instance' | null;
  display_name: string;
  category: 'Storage' | 'Database';
  schema_uri: string;
  schema_version: string;
  tf_module_source: string;
  tfvars_collection: 'gcs_buckets' | 'spanner_instances' | 'spanner_databases';
  tf_address_template: string;
  opa_package: string;
  approval_gate_key: 'gcs_bucket_owner' | 'spanner_data_owner';
  drift_ignore_paths: string[];
  legacy_resource_type: string;
  enabled: boolean;
  status_badge: 'Available' | 'Coming Soon';
  description: string;
  location_constraint: 'us-east1' | 'regional-us-east1';
  highlights: string[];
}

/**
 * Canonical Resource Kind Registry from ssp-doc ADR-GLB-009 (specs/data-model/spp_state_model.sql).
 * GCS Bucket is enabled for MVP vertical slice 1 (ADR-SVC-001); Spanner kinds are shown as 'Coming Soon' (ADR-SVC-002).
 */
export const RESOURCE_KIND_REGISTRY: ResourceKindRegistryEntry[] = [
  {
    kind: 'gcs_bucket',
    cloud: 'gcp',
    parent_kind: null,
    display_name: 'Cloud Storage bucket',
    category: 'Storage',
    schema_uri: 'schemas/gcs_bucket.schema.json',
    schema_version: '1.0.0',
    tf_module_source:
      'git::https://github.com/vaishnavi4068/ssp-module-gcs-bucket.git//modules/bucket?ref=v1.0.0',
    tfvars_collection: 'gcs_buckets',
    tf_address_template: 'module.gcs_bucket["{name}"]',
    opa_package: 'idp.gcp.gcs_bucket',
    approval_gate_key: 'gcs_bucket_owner',
    drift_ignore_paths: ['/force_destroy'],
    legacy_resource_type: 'storage-bucket',
    enabled: true,
    status_badge: 'Available',
    description:
      'Regional Google Cloud Storage bucket in us-east1 with mandatory CMEK encryption, enforced public access prevention, uniform bucket-level access, 8 canonical governance labels, and optional object lifecycle rules.',
    location_constraint: 'us-east1',
    highlights: [
      'Region locked to us-east1 (CMEK in locations/us-east1)',
      'Enforced Public Access Prevention & Uniform Bucket-Level Access',
      'Optional user-configurable Lifecycle Rules (default NONE)',
      '8 Mandatory ADR-GLB-008 Labels (no environmentsubtype)',
    ],
  },
  {
    kind: 'spanner_instance',
    cloud: 'gcp',
    parent_kind: null,
    display_name: 'Spanner instance',
    category: 'Database',
    schema_uri: 'schemas/spanner.schema.json',
    schema_version: '1.0.0',
    tf_module_source:
      'git::https://github.com/vaishnavi4068/ssp-module-spanner.git//modules/instance?ref=v1.0.0',
    tfvars_collection: 'spanner_instances',
    tf_address_template: 'module.spanner_instance["{name}"]',
    opa_package: 'idp.gcp.spanner_instance',
    approval_gate_key: 'spanner_data_owner',
    drift_ignore_paths: ['/force_destroy'],
    legacy_resource_type: 'spanner-instance',
    enabled: false,
    status_badge: 'Coming Soon',
    description:
      'Regional Cloud Spanner instance in regional-us-east1 with tier-driven edition selection (STANDARD / ENTERPRISE / ENTERPRISE_PLUS), automatic backup schedules, and dedicated or shared DBaaS tenancy.',
    location_constraint: 'regional-us-east1',
    highlights: [
      'Regional config regional-us-east1 (no nam3 multi-region)',
      'Tier & environment edition matrix (SPN-EDT-001/002)',
      'Automatic backup schedule & force_destroy=false guardrails',
      'Sequential data_owner & dbaas_reviewer approval gate',
    ],
  },
  {
    kind: 'spanner_database',
    cloud: 'gcp',
    parent_kind: 'spanner_instance',
    display_name: 'Spanner database',
    category: 'Database',
    schema_uri: 'schemas/spanner.schema.json',
    schema_version: '1.0.0',
    tf_module_source:
      'git::https://github.com/vaishnavi4068/ssp-module-spanner.git//modules/database?ref=v1.0.0',
    tfvars_collection: 'spanner_databases',
    tf_address_template: 'module.spanner_database["{instance}/{name}"]',
    opa_package: 'idp.gcp.spanner_database',
    approval_gate_key: 'spanner_data_owner',
    drift_ignore_paths: ['/ddl', '/deletion_protection'],
    legacy_resource_type: 'spanner-instance (databases[])',
    enabled: false,
    status_badge: 'Coming Soon',
    description:
      'Child Cloud Spanner database attached to a parent spanner_instance with CMEK encryption in us-east1, drop protection, database-scoped IAM bindings, and drift-ignored application DDL migrations.',
    location_constraint: 'regional-us-east1',
    highlights: [
      'Parent kind: spanner_instance ({instance}/{name})',
      'CMEK encryption in locations/us-east1 (SPN-ENC-001)',
      'Drop protection & Terraform deletion_protection enabled',
      'Drift ignores /ddl and /deletion_protection (ADR-SVC-002)',
    ],
  },
];
