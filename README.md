# SPP Portal UI (`ssp-ui`)

Self-Service Provisioning Platform (**SPP Portal**) UI MVP for Google Cloud Platform (`us-east1`).

Built with **React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui patterns**, mirroring the Shopify Polaris Infrastructure Storefront aesthetic (`17-shopify-polar-commerce`). The container image runs a **Go** static server (`cmd/portal`) that serves the built SPA on port 8080.

## Scope & Architecture Alignment (`ssp-doc`)

1. **Shell:** Left navigation (`Catalog`, `My Requests`, `Approvals`, `Resources`) and top header with app name `SPP Portal`.
2. **Service Catalog (`ADR-GLB-009`):** Displays resource kinds from `idp.resource_kind`:
   - `gcs_bucket` (**Cloud Storage bucket**) — **Enabled**
   - `spanner_instance` (**Spanner instance**) — **Coming soon**
   - `spanner_database` (**Spanner database**) — **Coming soon**
3. **GCS Bucket Request Form (`ADR-SVC-001`, `ADR-GLB-006`, `ADR-GLB-008`):**
   - Driven by `specs/examples/gcs_bucket.gates.json` and `specs/naming/naming-spec.json`.
   - Live deterministic bucket name generation: `{lob}-{env}-{app}-{purpose}-{suffix}` with environment normalized to `nonprod` (no hyphen) or `prod`.
   - Fixed location `us-east1` and required CMEK key in `locations/us-east1` resolved from runtime config.
   - 8 mandatory labels (`sppappid`, `costcenter`, `environmenttype`, `primarylob`, `datasensitivity`, `owner`, `provisionedby`, `idp_resource_id`) with `environmentsubtype` dropped everywhere and `LBL-002` value normalization.
   - Optional user-configurable `lifecycle_rules` defaulting to `[]` (**NONE**) — supports `Delete` after `age_days`, `SetStorageClass` after `age_days`, and noncurrent version cleanup.
   - `retention_locked = false` (`GCS-RET-003`) unless the explicit records-management request flag is enabled.
   - Client-side validation mirroring `GCS-NAME-001..003`, `NAM-RSV-001`, `GCS-ENC-001`, `GCS-RET-001`, `GCS-RET-003`, `LBL-001/002`, and IAM principal/role allowlists (`group:` and `serviceAccount:` only).
   - Live preview of the canonical `requested` JSON document and `Approved` gate guardrail trace.
4. **Control Plane API Integration (`ssp-cp`):**
   - Submits to `POST ${VITE_SPP_API_URL}/api/v1/requests` (configurable at runtime via `/config.js` or `VITE_SPP_API_URL`).
   - Because `ssp-cp` is not deployed yet, unreachable responses clearly surface **"Control plane not deployed yet"** while preserving the generated `requested` JSON. No mock backend, no fake success, and clean empty states on `My Requests`, `Approvals`, and `Resources`.

## Local Development & Testing

```bash
npm install
npm test
npm run build
npm run dev
```

## Build & Deploy Commands (GCP Cloud Build + SPP GKE cluster)

```bash
# 1. Build & push container image via Cloud Build
SHORT_SHA="$(git rev-parse --short HEAD)"
gcloud builds submit \
  --project="<spp-factory-host-project-id>" \
  --region="us-east1" \
  --config=cloudbuild.yaml \
  --substitutions="_REGISTRY=us-east1-docker.pkg.dev/<spp-factory-host-project-id>/spp,_TAG=${SHORT_SHA}" \
  .

# 2. Fetch GKE credentials & deploy Helm chart into namespace spp-portal
gcloud container clusters get-credentials "<spp-gke-cluster>" \
  --project="<spp-factory-host-project-id>" \
  --region="us-east1" \
  --dns-endpoint

helm upgrade --install spp-portal ./deploy/helm/spp-portal \
  --namespace spp-portal \
  --create-namespace \
  --set images.registry="us-east1-docker.pkg.dev/<spp-factory-host-project-id>/spp" \
  --set images.tag="${SHORT_SHA}" \
  --wait \
  --timeout 10m
```

Or run the end-to-end helper script:

```bash
./scripts/deploy.sh
```
