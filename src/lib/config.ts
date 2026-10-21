export const DEFAULT_GCS_CMEK_KEY =
  'projects/microdrive-dev/locations/us-east1/keyRings/spp-keyring/cryptoKeys/spp-gcs-cmek';

export interface SppRuntimeConfig {
  API_BASE_URL: string;
  DEFAULT_CMEK_KEY: string;
}

declare global {
  interface Window {
    __SPP_CONFIG__?: Partial<SppRuntimeConfig>;
  }
}

export function getRuntimeConfig(): SppRuntimeConfig {
  const winCfg = typeof window !== 'undefined' ? window.__SPP_CONFIG__ : undefined;
  const envApiUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_SPP_API_URL as string | undefined)
      : undefined;
  const envCmekKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_SPP_DEFAULT_CMEK_KEY as string | undefined)
      : undefined;

  const apiBaseUrl = (winCfg?.API_BASE_URL || envApiUrl || '').replace(/\/+$/, '');
  const defaultCmekKey =
    winCfg?.DEFAULT_CMEK_KEY || envCmekKey || DEFAULT_GCS_CMEK_KEY;

  return {
    API_BASE_URL: apiBaseUrl,
    DEFAULT_CMEK_KEY: defaultCmekKey,
  };
}

export function resolveCmekKeyName(
  _lob?: string,
  _env?: 'nonprod' | 'prod',
  _projectId?: string,
  configOverride?: Partial<SppRuntimeConfig>
): string {
  const cfg = { ...getRuntimeConfig(), ...configOverride };
  return cfg.DEFAULT_CMEK_KEY;
}
