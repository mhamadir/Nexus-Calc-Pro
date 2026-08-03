import React from 'react';
import { ShieldAlert, RefreshCw, WifiOff, Globe } from 'lucide-react';

interface VpnDetectedAlertProps {
  onRecheck?: () => void;
  isDarkMode?: boolean;
  ip?: string;
  provider?: string;
}

export const VpnDetectedAlert: React.FC<VpnDetectedAlertProps> = ({
  onRecheck,
  isDarkMode = true,
  ip,
  provider
}) => {
  return (
    <div className={`w-full max-w-md rounded-3xl p-6 md:p-8 border shadow-2xl backdrop-blur-md transition-all select-none ${
      isDarkMode 
        ? 'bg-neutral-900/95 border-rose-500/30 shadow-rose-950/40' 
        : 'bg-white border-rose-200 shadow-rose-100/60'
    }`}>
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-5 animate-pulse">
          <ShieldAlert size={34} />
        </div>

        <h2 className="text-xl font-black text-rose-500 tracking-tight mb-2">
          VPN/Proxy Detected
        </h2>
        
        <p className="text-xs text-neutral-300 mb-4 font-medium leading-relaxed bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl text-left">
          Please disable your VPN to access Nexus Calc. Our anti-fraud security policy restricts access from active VPNs, proxies, or anonymous network tunnels.
        </p>

        {(ip || provider) && (
          <div className="w-full bg-neutral-950/60 rounded-xl p-3 border border-neutral-800 text-[11px] font-mono text-neutral-400 mb-5 text-left space-y-1">
            {ip && <div className="flex justify-between"><span>IP Address:</span> <span className="text-neutral-200">{ip}</span></div>}
            {provider && <div className="flex justify-between"><span>Network Provider:</span> <span className="text-rose-400">{provider}</span></div>}
          </div>
        )}

        <div className="w-full space-y-3">
          <button
            id="btn-recheck-vpn"
            type="button"
            onClick={onRecheck || (() => window.location.reload())}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-rose-500 hover:bg-rose-400 text-neutral-950 transition-all cursor-pointer shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <RefreshCw size={16} />
            <span>Re-check Connection (VPN Disabled)</span>
          </button>

          <p className="text-[10px] text-neutral-400 flex items-center justify-center gap-1 font-mono">
            <Globe size={12} className="text-neutral-500" />
            Once your VPN is disconnected, click above to restore instant access.
          </p>
        </div>
      </div>
    </div>
  );
};
