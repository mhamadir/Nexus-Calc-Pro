export interface VpnCheckResult {
  isVpn: boolean;
  ip?: string;
  country?: string;
  provider?: string;
  reason?: string;
}

// In-memory cache for VPN check during session
let cachedResult: VpnCheckResult | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export async function checkVpnStatus(forceRefresh = false): Promise<VpnCheckResult> {
  const now = Date.now();
  if (!forceRefresh && cachedResult && (now - lastCheckTime < CACHE_TTL_MS)) {
    return cachedResult;
  }

  // If client is offline, bypass network VPN check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { isVpn: false };
  }

  try {
    // 1. First try server endpoint /api/check-vpn
    const res = await fetch('/api/check-vpn', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000)
    });

    if (res.ok) {
      const data = await res.json();
      cachedResult = {
        isVpn: !!data.isVpn,
        ip: data.ip,
        country: data.country,
        provider: data.provider,
        reason: data.reason || (data.isVpn ? 'Active VPN or Proxy detected on current connection.' : undefined)
      };
      lastCheckTime = now;
      return cachedResult;
    }
  } catch (err) {
    console.warn('Backend VPN check endpoint unavailable, trying fallback IP check:', err);
  }

  // 2. Client-side fallback check via public IP API if server route is unreachable
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,message,country,isp,org,as,proxy,hosting,query', {
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data = await res.json();
      const isVpn = !!(data.proxy || data.hosting);
      cachedResult = {
        isVpn,
        ip: data.query,
        country: data.country,
        provider: data.isp || data.org,
        reason: isVpn ? 'Proxy, Hosting, or VPN connection detected.' : undefined
      };
      lastCheckTime = now;
      return cachedResult;
    }
  } catch (e) {
    // Silent fail client fallback - do not false-positive block if API fails
  }

  cachedResult = { isVpn: false };
  lastCheckTime = now;
  return cachedResult;
}
