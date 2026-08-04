import React from 'react';
import { User, signOut, auth } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { Clock, ShieldCheck, LogOut, CheckCircle, RefreshCw } from 'lucide-react';

interface PendingVerificationViewProps {
  user: User;
  profile?: UserProfile | null;
  isDarkMode?: boolean;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({
  user,
  profile,
  isDarkMode = true
}) => {
  const handleSignOut = () => {
    signOut(auth);
  };

  const payment = profile?.paymentDetails;

  return (
    <div 
      id="pending-verification-view"
      className={`w-full flex flex-col items-center justify-start md:justify-center p-4 transition-colors select-none overflow-y-auto ${
        isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
      style={{ height: '100%', minHeight: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <div className={`w-full max-w-md my-auto rounded-3xl p-8 border shadow-2xl backdrop-blur-md text-center transition-all ${
        isDarkMode 
          ? 'bg-neutral-900/90 border-neutral-800/80 shadow-black/60' 
          : 'bg-white border-slate-200/80 shadow-slate-300/40'
      }`}>
        
        {/* Animated Clock / Verification Badge */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 animate-pulse">
              <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5 text-neutral-950 shadow-lg">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
          </div>
        </div>

        {/* Main Header */}
        <h2 className="text-xl font-black tracking-tight mb-2">
          Verification Pending
        </h2>

        {/* Mandatory Requested Text */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <p className="text-sm font-bold text-amber-400">
            Please wait until we verify your transaction.
          </p>
          <p className="text-[11px] text-amber-300/80 mt-1">
            Our team is reviewing your payment submission. Once approved, your device will automatically unlock access.
          </p>
        </div>

        {/* Submitted Transaction Details Card */}
        {payment && (
          <div className={`rounded-2xl p-4 border text-left mb-6 space-y-2.5 text-xs ${
            isDarkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <span className="text-neutral-400 font-medium">Full Name:</span>
              <span className="font-bold text-white">{payment.fullName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Transaction ID:</span>
              <span className="font-mono font-bold text-emerald-400">{payment.transactionId}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Payment Method:</span>
              <span className="font-bold text-amber-400">{payment.paymentMethod}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Submitted Date:</span>
              <span className="font-mono text-neutral-300">{payment.dateTime}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 mb-6 font-medium">
          <ShieldCheck size={16} className="text-cyan-400" />
          <span>Real-time verification status monitoring</span>
        </div>

        {/* Sign out button */}
        <button
          id="btn-signout-pending-screen"
          type="button"
          onClick={handleSignOut}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isDarkMode 
              ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700' 
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
          }`}
        >
          <LogOut size={14} />
          <span>Sign Out / Switch Account</span>
        </button>

      </div>
    </div>
  );
};
