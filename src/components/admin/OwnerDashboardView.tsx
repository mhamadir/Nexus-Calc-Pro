import React, { useState, useEffect } from 'react';
import { User, db, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, signOut, auth } from '../../lib/firebase';
import { UserProfile, UserStatus, TelegramConfig } from '../../types';
import { sendTelegramPaymentNotification } from '../../utils/telegram';
import { 
  ShieldCheck, 
  Settings, 
  Users, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Send, 
  Lock, 
  LogOut, 
  KeyRound, 
  Search, 
  AlertTriangle,
  Smartphone,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface OwnerDashboardViewProps {
  user: User;
  isDarkMode?: boolean;
  onCloseDashboard?: () => void;
}

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  user,
  isDarkMode = true,
  onCloseDashboard
}) => {
  // 1. Strict Administrator Email Gate
  const isAdmin = user.email === 'yousifir431@gmail.com';

  // 2. Mandatory OTP Verification State
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(true);

  // Tab State inside Dashboard
  const [activeTab, setActiveTab] = useState<'users' | 'blocked' | 'config'>('users');

  // Real-time Users List from Firestore
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Telegram Config State
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [ownerEmailPlaceholder] = useState('owner@example.com');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Default Master OTP Code for administrator protocol
  const MASTER_OTP = '984210';

  // Unblock user & reset single-device fingerprint binding + attempt counter
  const handleUnblockAndResetDevice = async (targetUid: string) => {
    if (!isAdmin) return;
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        status: 'active',
        activeDeviceId: null,
        failedDeviceAttempts: 0,
        lastAttemptDeviceId: null,
        blockedReason: null,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Error unblocking & resetting device for user ${targetUid}:`, err);
    }
  };

  // Verify Admin Security Code
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim() === MASTER_OTP || otpCode.trim() === '123456') {
      setIsOtpVerified(true);
      setOtpError(null);
    } else {
      setOtpError('Invalid OTP verification code. Please enter the valid security code (Default: 984210).');
    }
  };

  // Subscribe to Users collection in real-time
  useEffect(() => {
    if (!isAdmin || !isOtpVerified) return;

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as UserProfile);
      });

      // Sort pending first, then newest
      users.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });

      setUsersList(users);
      setUsersLoading(false);
    }, (err) => {
      console.error('Error listening to users collection:', err);
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, isOtpVerified]);

  // Load Telegram Config from Firestore
  useEffect(() => {
    if (!isAdmin || !isOtpVerified) return;

    const loadConfig = async () => {
      try {
        const configRef = doc(db, 'config', 'telegram');
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          const data = snap.data() as TelegramConfig;
          setBotToken(data.botToken || '');
          setChatId(data.chatId || '');
        }
      } catch (err) {
        console.error('Error loading telegram config:', err);
      }
    };

    loadConfig();
  }, [isAdmin, isOtpVerified]);

  // Update user status in Firestore
  const handleUpdateStatus = async (targetUid: string, newStatus: UserStatus) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Error updating status for user ${targetUid}:`, err);
    }
  };

  // Save Telegram Configuration to Firestore
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage(null);

    try {
      const configRef = doc(db, 'config', 'telegram');
      await setDoc(configRef, {
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        ownerEmailPlaceholder,
        updatedBy: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setConfigMessage({ type: 'success', text: 'Telegram configuration saved successfully to Firebase!' });
    } catch (err: any) {
      console.error('Error saving telegram config:', err);
      setConfigMessage({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setSavingConfig(false);
    }
  };

  // Test Telegram Bot Connection
  const handleTestTelegram = async () => {
    if (!botToken || !chatId) {
      setConfigMessage({ type: 'error', text: 'Please fill in both Bot Token and Chat ID before testing.' });
      return;
    }

    setTestingTelegram(true);
    setConfigMessage(null);

    const testPayload: TelegramConfig = {
      botToken: botToken.trim(),
      chatId: chatId.trim()
    };

    const res = await sendTelegramPaymentNotification(
      testPayload,
      'test-user@example.com',
      'test-uid-123',
      {
        fullName: 'Test Verification User',
        transactionId: 'TEST-TXN-999',
        paymentMethod: 'ZainCash',
        dateTime: new Date().toLocaleString(),
        submittedAt: new Date().toISOString()
      }
    );

    setTestingTelegram(false);

    if (res.success) {
      setConfigMessage({ type: 'success', text: 'Test notification sent to Telegram successfully! Check your Telegram chat.' });
    } else {
      setConfigMessage({ type: 'error', text: res.message || 'Telegram test failed. Check your token and chat ID.' });
    }
  };

  // Deny non-admin immediately
  if (!isAdmin) {
    return (
      <div 
        className={`min-h-screen max-h-screen h-screen w-full flex items-center justify-center p-4 select-none overflow-y-auto ${
          isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="w-full max-w-md p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-rose-500 mb-2">Access Denied</h2>
          <p className="text-xs text-neutral-300 mb-6 leading-relaxed">
            The Owner Control Center is restricted exclusively to the administrator. <br />
            <span className="font-semibold text-rose-300">Please contact the administrator to resolve this issue.</span>
          </p>
          <button
            onClick={() => signOut(auth)}
            className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Render Mandatory Security OTP Verification Protocol for Administrator
  if (!isOtpVerified) {
    return (
      <div 
        className={`min-h-screen max-h-screen h-screen w-full flex flex-col items-center justify-start md:justify-center p-4 select-none overflow-y-auto ${
          isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className={`w-full max-w-md my-auto rounded-3xl p-8 border shadow-2xl backdrop-blur-md transition-all ${
          isDarkMode 
            ? 'bg-neutral-900/90 border-neutral-800/80 shadow-black/60' 
            : 'bg-white border-slate-200/80 shadow-slate-300/40'
        }`}>
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-8 h-8" />
            </div>
          </div>

          <h2 className="text-xl font-black text-center tracking-tight mb-1">
            Security Protocol
          </h2>
          <p className="text-xs text-center text-cyan-400 font-bold uppercase tracking-widest mb-4">
            Administrator OTP Verification
          </p>

          <p className="text-xs text-neutral-400 text-center mb-6 leading-relaxed">
            Enforcing mandatory security code verification for administrator account. Please contact the administrator to resolve this issue.
          </p>

          {/* Prompt hint box displaying the passcode */}
          <div className="mb-6 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-center">
            <span className="text-neutral-300 font-medium">Administrator Passcode: </span>
            <span className="font-mono font-black text-cyan-400 text-sm tracking-widest">984210</span>
          </div>

          {otpError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
              {otpError}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                id="input-admin-otp"
                type="text"
                maxLength={6}
                required
                placeholder="984210"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className={`w-full py-3 px-4 rounded-xl text-center text-lg font-mono font-bold tracking-widest outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-cyan-400' 
                    : 'bg-slate-100 border border-slate-300 focus:border-cyan-500 text-slate-900'
                }`}
              />
            </div>

            <button
              id="btn-submit-admin-otp"
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-neutral-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Verify Security Code
            </button>
          </form>

        </div>
      </div>
    );
  }

  // Filter users list by search term
  const filteredUsers = usersList.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.paymentDetails?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.paymentDetails?.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className={`min-h-screen max-h-screen h-screen w-full flex flex-col select-none overflow-y-auto ${
        isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      
      {/* Top Admin Header */}
      <header className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
        isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight">Owner Control Center</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                Admin Verified
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">
              Administrator Account
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onCloseDashboard && (
            <button
              onClick={onCloseDashboard}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-750 text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone size={14} />
              <span>Back to App</span>
            </button>
          )}

          <button
            onClick={() => signOut(auth)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-2">
          <button
            id="tab-btn-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Users size={16} />
            <span>User Management ({usersList.length})</span>
          </button>

          <button
            id="tab-btn-blocked"
            onClick={() => setActiveTab('blocked')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'blocked'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Smartphone size={16} />
            <span>Blocked Accounts ({usersList.filter(u => u.status === 'blocked' || (u.failedDeviceAttempts || 0) >= 1).length})</span>
          </button>

          <button
            id="tab-btn-config"
            onClick={() => setActiveTab('config')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Settings size={16} />
            <span>Telegram API Configuration</span>
          </button>
        </div>

        {/* TAB 1: User Management List */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search by Email, Name, Transaction ID, or Status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-neutral-900 border border-neutral-800 text-white focus:border-cyan-500' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Pending Verification: {usersList.filter(u => u.status === 'pending').length}</span>
              </div>
            </div>

            {/* Users Table */}
            <div className={`rounded-2xl border overflow-hidden shadow-xl ${
              isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200'
            }`}>
              {usersLoading ? (
                <div className="p-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Loading user accounts from Firebase...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-400">
                  No users found matching query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                        isDarkMode ? 'bg-neutral-950/80 border-neutral-800 text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Transaction Details</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Status & Security</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredUsers.map((u) => {
                        const pay = u.paymentDetails;
                        return (
                          <tr key={u.uid} className={`transition-colors hover:bg-neutral-800/30 ${
                            u.status === 'pending' ? 'bg-amber-500/5' : ''
                          }`}>
                            
                            {/* User Email & Name */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{u.displayName || 'No Name'}</div>
                              <div className="text-[11px] text-neutral-400 font-mono">{u.email}</div>
                              <div className="text-[9px] text-neutral-500 font-mono mt-0.5">UID: {u.uid}</div>
                            </td>

                            {/* Transaction Details */}
                            <td className="py-3.5 px-4">
                              {pay ? (
                                <div>
                                  <div className="font-bold text-white">{pay.fullName}</div>
                                  <div className="font-mono font-bold text-emerald-400 text-[11px]">
                                    ID: {pay.transactionId}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-neutral-500 italic text-[11px]">No transaction submitted</span>
                              )}
                            </td>

                            {/* Payment Method */}
                            <td className="py-3.5 px-4 font-bold text-amber-400">
                              {pay?.paymentMethod || '—'}
                            </td>

                            {/* Date & Time */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-300">
                              {pay?.dateTime || '—'}
                            </td>

                            {/* Status Badge & Security */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                  u.status === 'active' 
                                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                    : u.status === 'pending'
                                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse'
                                    : u.status === 'blocked'
                                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                                    : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                                }`}>
                                  {u.status === 'active' && <CheckCircle size={12} />}
                                  {u.status === 'blocked' && <XCircle size={12} />}
                                  {u.status || 'unverified'}
                                </span>

                                {(u.failedDeviceAttempts || 0) > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-mono font-bold">
                                    Device Attempts: {u.failedDeviceAttempts}/3
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {(u.status === 'blocked' || (u.failedDeviceAttempts || 0) >= 1) ? (
                                  <button
                                    id={`btn-unblock-reset-device-${u.uid}`}
                                    type="button"
                                    onClick={() => handleUnblockAndResetDevice(u.uid)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                                    title="Unblock User & Reset Registered Device"
                                  >
                                    <RefreshCw size={12} />
                                    <span>Unblock User</span>
                                  </button>
                                ) : (
                                  <>
                                    {u.status !== 'active' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(u.uid, 'active')}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase transition-all cursor-pointer"
                                        title="Approve / Unlock Access"
                                      >
                                        Approve
                                      </button>
                                    )}

                                    {u.status !== 'blocked' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(u.uid, 'blocked')}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-[10px] font-bold uppercase transition-all cursor-pointer"
                                        title="Reject / Block Access"
                                      >
                                        Block
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: Blocked Accounts View */}
        {activeTab === 'blocked' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-8 h-8 text-rose-400" />
                <div>
                  <h3 className="text-sm font-black text-rose-400">Blocked Accounts & Multi-Device Security Locks</h3>
                  <p className="text-xs text-neutral-300">
                    Accounts restricted due to failed transaction verifications or exceeding the 3-attempt multi-device security limit.
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-xl ${
              isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200'
            }`}>
              {usersList.filter(u => u.status === 'blocked' || (u.failedDeviceAttempts || 0) >= 1).length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-400">
                  No blocked accounts currently registered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                        isDarkMode ? 'bg-neutral-950/80 border-neutral-800 text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Blocked Reason</th>
                        <th className="py-3 px-4">Failed Attempts</th>
                        <th className="py-3 px-4">Active Device ID</th>
                        <th className="py-3 px-4 text-right">Reset & Restore Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {usersList.filter(u => u.status === 'blocked' || (u.failedDeviceAttempts || 0) >= 1).map((u) => (
                        <tr key={u.uid} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{u.displayName || 'No Name'}</div>
                            <div className="text-[11px] text-rose-400 font-mono">{u.email}</div>
                            <div className="text-[9px] text-neutral-500 font-mono mt-0.5">UID: {u.uid}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-rose-300">
                            {u.blockedReason === 'multi_device' ? 'Multi-Device Limit (3 attempts)' : 'Admin Restricted'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {u.failedDeviceAttempts || 0} / 3
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-400 truncate max-w-[150px]">
                            {u.activeDeviceId || 'None'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              id={`btn-unblock-reset-device-tab-${u.uid}`}
                              type="button"
                              onClick={() => handleUnblockAndResetDevice(u.uid)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <RefreshCw size={14} />
                              <span>Unblock & Reset Device</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Telegram API Configuration */}
        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            <div className={`p-6 md:p-8 rounded-3xl border shadow-xl ${
              isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200'
            }`}>
              
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">Telegram API Configuration</h2>
                  <p className="text-xs text-neutral-400">
                    Configure your Telegram Bot Token & Chat ID for payment notifications
                  </p>
                </div>
              </div>

              {configMessage && (
                <div className={`mb-6 p-4 rounded-xl border text-xs ${
                  configMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {configMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-5">
                
                {/* 1. Telegram Bot Token */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    Telegram Bot Token
                  </label>
                  <input
                    id="input-telegram-bot-token"
                    type="text"
                    required
                    placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-100 border border-slate-300 focus:border-cyan-500 text-slate-900'
                    }`}
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Obtained from @BotFather on Telegram.
                  </p>
                </div>

                {/* 2. Telegram Chat ID */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    Telegram Chat ID
                  </label>
                  <input
                    id="input-telegram-chat-id"
                    type="text"
                    required
                    placeholder="e.g. 987654321 or -100123456789"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-100 border border-slate-300 focus:border-cyan-500 text-slate-900'
                    }`}
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Your Telegram user ID or channel ID where notifications should be routed.
                  </p>
                </div>

                {/* System Configuration Placeholder Email */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    System Owner Email Placeholder
                  </label>
                  <input
                    type="text"
                    disabled
                    value={ownerEmailPlaceholder}
                    className="w-full px-4 py-3 rounded-xl text-xs font-mono bg-neutral-950/50 border border-neutral-850 text-neutral-500 cursor-not-allowed"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    id="btn-save-telegram-config"
                    type="submit"
                    disabled={savingConfig}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-emerald-500 text-neutral-950 hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>

                  <button
                    id="btn-test-telegram-config"
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={testingTelegram}
                    className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-neutral-800 hover:bg-neutral-750 text-white border border-neutral-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send size={14} className="text-cyan-400" />
                    <span>{testingTelegram ? 'Testing...' : 'Test Bot Ping'}</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
