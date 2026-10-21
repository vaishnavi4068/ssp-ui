export interface SppRuntimeConfig {
  API_BASE_URL: string;
  DEFAULT_CMEK_KEY_TEMPLATE: string;
  MICRODRIVE_CMEK_KEY: string;
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
  const envCmekTemplate =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_SPP_CMEK_KEY_TEMPLATE as string | undefined)
      : undefined;
  const envMicrodriveCmek =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_SPP_MICRODRIVE_CMEK_KEY as string | undefined)
      : undefined;

  const apiBaseUrl = (winCfg?.API_BASE_URL || envApiUrl || '').replace(/\/+$/, '');
  const defaultCmekTemplate =
    winCfg?.DEFAULT_CMEK_KEY_TEMPLATE ||
    envCmekTemplate ||
    'projects/{lob}-kms-{env}/locations/us-east1/keyRings/{lob}-{env}-use1/cryptoKeys/gcs-default';
  const microdriveCmek =
    winCfg?.MICRODRIVE_CMEK_KEY ||
    envMicrodriveCmek ||
    'projects/microdrive-dev/locations/us-east1/keyRings/spp-nonprod-use1/cryptoKeys/gcs-default';

  return {
    API_BASE_URL: apiBaseUrl,
    DEFAULT_CMEK_KEY_TEMPLATE: defaultCmekTemplate,
    MICRODRIVE_CMEK_KEY: microdriveCmek,
  };
}

export function resolveCmekKeyName(
  lob: string,
  env: 'nonprod' | 'prod',
  projectId?: string,
  configOverride?: Partial<SppRuntimeConfig>
): string {
  const cfg = { ...getRuntimeConfig(), ...configOverride };
  const normalizedLob = (lob || 'spp').trim().toLowerCase();
  if (projectId && projectId.trim().toLowerCase() === 'microdrive-dev') {
    return cfg.MICRODRIVE_CMEK_KEY;
  }
  return cfg.DEFAULT_CMEK_KEY_TEMPLATE.replace(/\{lob\}/g, normalizedLob).replace(
    /\{env\}/g,
    env
  );
}
