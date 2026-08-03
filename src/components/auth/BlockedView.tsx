import React from 'react';
import { User, signOut, auth } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { ShieldAlert, LogOut, XCircle, Smartphone } from 'lucide-react';

interface BlockedViewProps {
  user: User;
  profile?: UserProfile | null;
  isDarkMode?: boolean;
}

export const BlockedView: React.FC<BlockedViewProps> = ({ user, profile, isDarkMode = true }) => {
  const handleSignOut = () => {
    signOut(auth);
  };

  const isMultiDeviceBlock = profile?.blockedReason === 'multi_device';

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors select-none ${
      isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl backdrop-blur-md text-center transition-all ${
        isDarkMode 
          ? 'bg-neutral-900/90 border-rose-900/30 shadow-black/60' 
          : 'bg-white border-rose-200/80 shadow-rose-300/40'
      }`}>
        
        {/* Blocked Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500">
            {isMultiDeviceBlock ? <Smartphone className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black tracking-tight mb-2 text-rose-500">
          {isMultiDeviceBlock ? 'Multi-Device Access Blocked' : 'Access Restricted'}
        </h2>
        
        <p className="text-xs text-neutral-400 mb-6 font-medium">
          Account: {user.email}
        </p>

        {/* Message */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-6 text-left">
          <p className="text-xs font-bold text-rose-300 mb-1 flex items-center gap-1.5">
            <ShieldAlert size={14} className="shrink-0" />
            <span>{isMultiDeviceBlock ? 'Security Rule Triggered' : 'Your access has been blocked.'}</span>
          </p>
          <p className="text-[11px] text-rose-200/80 leading-relaxed">
            {isMultiDeviceBlock 
              ? 'Account access was automatically restricted due to 3 unauthorized login attempts from secondary devices. Single-device enforcement is active. Contact administrator (yousifir431@gmail.com) to reset your device fingerprint.'
              : 'Your transaction submission was rejected or access has been administrative restricted. Please contact support if you believe this is a mistake.'}
          </p>
        </div>

        {/* Action Button */}
        <button
          id="btn-signout-blocked-screen"
          type="button"
          onClick={handleSignOut}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>

      </div>
    </div>
  );
};
