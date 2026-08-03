import React, { useState } from 'react';
import { User, db, doc, updateDoc, collection, getDocs, signOut, auth } from '../../lib/firebase';
import { PaymentMethod, PaymentDetails, TelegramConfig, UserProfile } from '../../types';
import { sendTelegramPaymentNotification } from '../../utils/telegram';
import { checkVpnStatus } from '../../utils/vpnCheck';
import { VpnDetectedAlert } from './VpnDetectedAlert';
import { CreditCard, User as UserIcon, Hash, Calendar, LogOut, CheckCircle2, ShieldAlert, Check } from 'lucide-react';

interface TransactionSubmissionViewProps {
  user: User;
  telegramConfig: TelegramConfig;
  isDarkMode?: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = ['ZainCash', 'FastPay', 'FIB', 'SuperQi', 'AsiaPay'];

export const TransactionSubmissionView: React.FC<TransactionSubmissionViewProps> = ({
  user,
  telegramConfig,
  isDarkMode = true
}) => {
  const [fullName, setFullName] = useState(user.displayName || '');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ZainCash');
  
  // Format current date-time for datetime-local default
  const getCurrentDateTimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  
  const [dateTime, setDateTime] = useState(getCurrentDateTimeString());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVpnBlocked, setIsVpnBlocked] = useState(false);

  // Check if all 4 fields are non-empty
  const isFormValid = 
    fullName.trim().length > 0 && 
    transactionId.trim().length > 0 && 
    paymentMethod.length > 0 && 
    dateTime.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setError(null);

    // Anti-VPN check before proceeding to process payment transaction details
    const vpnRes = await checkVpnStatus(true);
    if (vpnRes.isVpn) {
      setIsVpnBlocked(true);
      setError('VPN/Proxy Detected. Please disable your VPN to access Nexus Calc.');
      setSubmitting(false);
      return;
    }

    const inputTxnId = transactionId.trim().toLowerCase();
    const inputFullName = fullName.trim().toLowerCase();
    const inputDateTime = dateTime.trim();

    try {
      // 1. Anti-Fraud & Transaction Duplication Check against Firestore
      const usersRef = collection(db, 'users');
      const querySnap = await getDocs(usersRef);
      
      let isDuplicate = false;
      querySnap.forEach((docSnap) => {
        const uData = docSnap.data() as UserProfile;
        if (uData.paymentDetails) {
          const existingTxnId = (uData.paymentDetails.transactionId || '').trim().toLowerCase();
          const existingName = (uData.paymentDetails.fullName || '').trim().toLowerCase();
          const existingDateTime = (uData.paymentDetails.dateTime || '').trim();

          if (existingTxnId && existingTxnId === inputTxnId) {
            isDuplicate = true;
          }
          if (existingName && existingDateTime && existingName === inputFullName && existingDateTime === inputDateTime) {
            isDuplicate = true;
          }
        }
      });

      if (isDuplicate) {
        setError('Transaction ID or submission details already registered. Duplicate submissions are not allowed.');
        setSubmitting(false);
        return;
      }

      const paymentData: PaymentDetails = {
        fullName: fullName.trim(),
        transactionId: transactionId.trim(),
        paymentMethod,
        dateTime,
        submittedAt: new Date().toISOString()
      };

      // 2. Send notification to Telegram Bot
      const tgResult = await sendTelegramPaymentNotification(
        telegramConfig,
        user.email || 'No email',
        user.uid,
        paymentData
      );

      if (!tgResult.success && tgResult.message) {
        console.warn('Telegram notification warning:', tgResult.message);
      }

      // 3. Update user document in Firestore to 'pending' state
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        paymentDetails: paymentData,
        status: 'pending',
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error submitting transaction details:', err);
      setError(err.message || 'Failed to submit transaction details. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (isVpnBlocked) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors ${
        isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <VpnDetectedAlert
          onRecheck={async () => {
            const res = await checkVpnStatus(true);
            if (!res.isVpn) {
              setIsVpnBlocked(false);
              setError(null);
            }
          }}
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors select-none ${
      isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-2xl backdrop-blur-md transition-all ${
        isDarkMode 
          ? 'bg-neutral-900/90 border-neutral-800/80 shadow-black/60' 
          : 'bg-white border-slate-200/80 shadow-slate-300/40'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Payment Verification</h2>
              <p className="text-[11px] text-neutral-400">Account: {user.email}</p>
            </div>
          </div>
          <button
            id="btn-signout-transaction-wall"
            type="button"
            onClick={handleSignOut}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>

        <p className="text-xs text-neutral-300 mb-6 leading-relaxed bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60">
          Please submit your transaction details below to activate your account access. All 4 fields are mandatory.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium leading-relaxed flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Full Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserIcon size={14} className="text-cyan-400" />
              <span>Full Name</span>
            </label>
            <input
              id="input-full-name"
              type="text"
              required
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-medium outline-none transition-all ${
                isDarkMode 
                  ? 'bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white' 
                  : 'bg-slate-100 border border-slate-300 focus:border-cyan-500 text-slate-900'
              }`}
            />
          </div>

          {/* Field 2: Transaction ID */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Hash size={14} className="text-emerald-400" />
              <span>Transaction ID</span>
            </label>
            <input
              id="input-transaction-id"
              type="text"
              required
              placeholder="e.g. TXN-89304721"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-mono font-bold outline-none transition-all ${
                isDarkMode 
                  ? 'bg-neutral-950 border border-neutral-800 focus:border-emerald-500 text-emerald-400' 
                  : 'bg-slate-100 border border-slate-300 focus:border-emerald-500 text-emerald-700'
              }`}
            />
          </div>

          {/* Field 3: Payment Method Selector (Custom Buttons to avoid iframe select glitches) */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CreditCard size={14} className="text-amber-400" />
              <span>Payment Method</span>
            </label>
            
            {/* Custom Interactive Button Grid */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold tracking-tight flex items-center justify-between border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-sm'
                        : isDarkMode
                        ? 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span>{method}</span>
                    {isSelected && <Check size={14} className="text-amber-400" />}
                  </button>
                );
              })}
            </div>

            {/* Accessible standard select element for test tools */}
            <select
              id="select-payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="sr-only"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* Field 4: Exact Date & Time of Transaction */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-purple-400" />
              <span>Exact Date & Time of Transaction</span>
            </label>
            <input
              id="input-datetime"
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-mono outline-none transition-all ${
                isDarkMode 
                  ? 'bg-neutral-950 border border-neutral-800 focus:border-purple-500 text-white' 
                  : 'bg-slate-100 border border-slate-300 focus:border-purple-500 text-slate-900'
              }`}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              id="btn-confirm-transaction"
              type="submit"
              disabled={!isFormValid || submitting}
              className={`w-full py-4 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99] ${
                isFormValid && !submitting
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-neutral-950 shadow-emerald-500/25 hover:brightness-110'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-750 cursor-not-allowed opacity-50'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying & Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm Transaction</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
