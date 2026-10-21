import { getRuntimeConfig } from './config';
import type { RequestedDocument } from './gcsSpec';

export type SubmitRequestOutcome =
  | {
      status: 'submitted';
      endpoint: string;
      statusCode: number;
      responseBody: unknown;
    }
  | {
      status: 'control_plane_unavailable';
      endpoint: string;
      statusCode?: number;
      errorDetail: string;
    }
  | {
      status: 'validation_error';
      endpoint: string;
      statusCode: number;
      errorDetail: string;
      responseBody?: unknown;
    };

/**
 * Posts the canonical 'requested' document to the SPP Control Plane API (ssp-cp)
 * at POST {VITE_SPP_API_URL || runtimeConfig.API_BASE_URL}/api/v1/requests.
 *
 * When ssp-cp is not deployed or unreachable (network error, 404, 502, 503, 504, HTML fallback),
 * returns { status: 'control_plane_unavailable' } with NO mock backend and NO fake success.
 */
export async function submitProvisioningRequest(
  document: RequestedDocument
): Promise<SubmitRequestOutcome> {
  const cfg = getRuntimeConfig();
  const baseUrl = cfg.API_BASE_URL || '';
  const endpoint = `${baseUrl}/api/v1/requests`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(document),
    });

    const contentType = response.headers.get('content-type') || '';

    // If nginx SPA fallback returns text/html or status is 404/502/503/504, control plane is not deployed yet
    if (
      response.status === 404 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504 ||
      contentType.includes('text/html')
    ) {
      return {
        status: 'control_plane_unavailable',
        endpoint,
        statusCode: response.status,
        errorDetail: `HTTP ${response.status} from ${endpoint} — Control plane (ssp-cp) is not deployed yet.`,
      };
    }

    if (response.ok) {
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      return {
        status: 'submitted',
        endpoint,
        statusCode: response.status,
        responseBody: data,
      };
    }

    let errBody: unknown = null;
    try {
      errBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch {
      errBody = null;
    }

    return {
      status: 'validation_error',
      endpoint,
      statusCode: response.status,
      errorDetail: `Control plane returned HTTP ${response.status}`,
      responseBody: errBody,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'control_plane_unavailable',
      endpoint,
      errorDetail: `Unable to reach ${endpoint} (${msg}). Control plane (ssp-cp) is not deployed yet.`,
    };
  }
}
