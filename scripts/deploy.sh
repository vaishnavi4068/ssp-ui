#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# SPP Portal UI (ssp-ui) — Build & GKE Deployment Script
# Target:
#   GCP Project : microdrive-dev
#   GKE Cluster : md-dev (us-east1)
#   Node Pool   : spp-pool (workload=spp, dedicated=spp:NoSchedule)
#   Namespace   : spp-portal
#   Registry    : us-east1-docker.pkg.dev/microdrive-dev/spp
#   ControlPlane: http://ssp-cp.spp-platform.svc.cluster.local:8000
# ---------------------------------------------------------------------------

PROJECT_ID="${GCP_PROJECT_ID:-microdrive-dev}"
REGION="${GCP_REGION:-us-east1}"
CLUSTER="${GKE_CLUSTER_NAME:-md-dev}"
NAMESPACE="${PORTAL_K8S_NAMESPACE:-spp-portal}"
REGISTRY="${IMAGE_REGISTRY:-us-east1-docker.pkg.dev/${PROJECT_ID}/spp}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo v1.0.0)}"
SPP_API_URL="${SPP_API_URL:-http://ssp-cp.spp-platform.svc.cluster.local:8000}"

echo "=================================================================="
echo "SPP Portal UI Deployment"
echo "Project     : ${PROJECT_ID}"
echo "Cluster     : ${CLUSTER} (${REGION})"
echo "Namespace   : ${NAMESPACE}"
echo "Registry    : ${REGISTRY}"
echo "Image       : ${REGISTRY}/spp-portal:${IMAGE_TAG}"
echo "API URL     : ${SPP_API_URL}"
echo "=================================================================="

echo "[1/3] Submitting Cloud Build to build & push spp-portal:${IMAGE_TAG}..."
if [[ "${SKIP_BUILD:-false}" != "true" ]]; then
  gcloud builds submit \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --config=cloudbuild.yaml \
    --substitutions="_REGISTRY=${REGISTRY},_TAG=${IMAGE_TAG}" \
    .
else
  echo "SKIP_BUILD=true: using existing image ${REGISTRY}/spp-portal:${IMAGE_TAG}"
fi

echo "[2/3] Fetching GKE cluster credentials for ${CLUSTER}..."
gcloud container clusters get-credentials "${CLUSTER}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --dns-endpoint

echo "[3/3] Running Helm upgrade --install for spp-portal in namespace ${NAMESPACE}..."
helm upgrade --install spp-portal ./deploy/helm/spp-portal \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  --set images.registry="${REGISTRY}" \
  --set images.tag="${IMAGE_TAG}" \
  --set runtimeConfig.apiUrl="${SPP_API_URL}" \
  --wait \
  --timeout 10m

echo "=================================================================="
echo "Deployment complete. Checking pods and services:"
kubectl get pods,svc,ingress -n "${NAMESPACE}"
echo "=================================================================="
