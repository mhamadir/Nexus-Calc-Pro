import React, { useState, useEffect } from 'react';
import { signInWithPopup, auth, googleProvider, db, doc, getDoc, setDoc } from '../../lib/firebase';
import { ShieldCheck, Calculator, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { TurnstileWidget } from './TurnstileWidget';
import { VpnDetectedAlert } from './VpnDetectedAlert';
import { checkVpnStatus, VpnCheckResult } from '../../utils/vpnCheck';

interface GoogleSignInViewProps {
  isDarkMode?: boolean;
}

export const GoogleSignInView: React.FC<GoogleSignInViewProps> = ({ isDarkMode = true }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [vpnResult, setVpnResult] = useState<VpnCheckResult | null>(null);
  const [checkingVpn, setCheckingVpn] = useState(true);

  // Run VPN check on mount
  const runVpnCheck = async (force = false) => {
    setCheckingVpn(true);
    setError(null);
    try {
      const res = await checkVpnStatus(force);
      setVpnResult(res);
      if (res.isVpn) {
        setError('VPN/Proxy Detected. Please disable your VPN to access Nexus Calc.');
      }
    } catch (_) {
      setVpnResult({ isVpn: false });
    } finally {
      setCheckingVpn(false);
    }
  };

  useEffect(() => {
    runVpnCheck();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!turnstileVerified) {
      setError('Please complete the Cloudflare security challenge first.');
      return;
    }

    setLoading(true);
    setError(null);

    // Re-verify VPN status before initiating popup
    const vpnRes = await checkVpnStatus(true);
    if (vpnRes.isVpn) {
      setVpnResult(vpnRes);
      setError('VPN/Proxy Detected. Please disable your VPN to access Nexus Calc.');
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const currentUser = result.user;
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || 'No Email',
              displayName: currentUser.displayName || 'Google User',
              photoURL: currentUser.photoURL || null,
              status: 'pending',
              failedDeviceAttempts: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (dbErr) {
          console.error('Error auto-creating Firestore user document on Google Sign-In:', dbErr);
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in popup was closed before completing.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console. Please add current app domain to Firebase Auth domains.');
      } else {
        setError(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // If active VPN detected, present anti-VPN wall
  if (vpnResult?.isVpn) {
    return (
      <div 
        className={`min-h-screen max-h-screen h-screen w-full flex items-center justify-center p-4 transition-colors overflow-y-auto ${
          isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <VpnDetectedAlert
          onRecheck={() => runVpnCheck(true)}
          isDarkMode={isDarkMode}
          ip={vpnResult.ip}
          provider={vpnResult.provider}
        />
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen max-h-screen h-screen w-full flex flex-col items-center justify-start md:justify-center p-4 transition-colors select-none overflow-y-auto ${
        isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Container card */}
      <div className={`w-full max-w-md my-auto rounded-3xl p-8 border shadow-2xl backdrop-blur-md transition-all ${
        isDarkMode 
          ? 'bg-neutral-900/90 border-neutral-800/80 shadow-black/60' 
          : 'bg-white border-slate-200/80 shadow-slate-300/40'
      }`}>
        
        {/* App Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                isDarkMode ? 'bg-neutral-900' : 'bg-white'
              }`}>
                <Calculator className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 text-neutral-950 shadow">
              <Sparkles size={12} />
            </div>
          </div>

          <h1 className="text-xl font-black tracking-tight mb-0.5">
            NexusCalc Pro
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
            Offline Engineering Suite
          </p>
          
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Authenticating your device unlocks full access to scientific, matrix, centroids, and moment of inertia engineering calculators.
          </p>
        </div>

        {/* Error message if any */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Cloudflare Turnstile Bot Protection Widget */}
        <div className="mb-5">
          <TurnstileWidget
            siteKey="0x4AAAAAAEFBVy5u71mRncqd"
            onVerify={() => {
              setTurnstileVerified(true);
              setError(null);
            }}
            onExpire={() => setTurnstileVerified(false)}
            onError={() => setTurnstileVerified(false)}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Google Sign In Button */}
        <div className="space-y-4">
          <button
            id="btn-google-signin"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !turnstileVerified || checkingVpn}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-750 text-white border border-neutral-700/70 hover:border-neutral-600 shadow-black/40' 
                : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-slate-200/60'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {loading 
                ? 'Authenticating...' 
                : !turnstileVerified 
                ? 'Complete Bot Challenge First' 
                : 'Sign in with Google'}
            </span>
          </button>

          <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Turnstile Bot Shield</span>
            </span>
            <button
              type="button"
              onClick={() => runVpnCheck(true)}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-[10px]"
              title="Re-check VPN status"
            >
              <RefreshCw size={11} /> Check Connection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

