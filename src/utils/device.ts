export const NEXUS_DEVICE_ID_KEY = 'nexus_device_fingerprint';

/**
 * Retrieves or generates a persistent unique device identifier for the current browser/device.
 * Uses crypto.randomUUID() as requested by security specifications.
 */
export const getLocalDeviceId = (): string => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'dev_server_fallback';
  }

  try {
    let devId = localStorage.getItem(NEXUS_DEVICE_ID_KEY);
    if (!devId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        devId = crypto.randomUUID();
      } else {
        devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      }
      localStorage.setItem(NEXUS_DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch (_) {
    return 'dev_storage_fallback';
  }
};
