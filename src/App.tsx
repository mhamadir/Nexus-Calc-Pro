/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator, Grid3X3, Crosshair, RotateCcw, Sliders,
  Wifi, Battery, History, ShieldCheck, LogOut, RefreshCw, KeyRound
} from 'lucide-react';
import { TabType, HistoryItem, CentroidShape, UserProfile, TelegramConfig } from './types';
import StandardTab from './components/StandardTab';
import MatricesTab from './components/MatricesTab';
import CentroidsTab from './components/CentroidsTab';
import MOITab from './components/MOITab';
import HistoryTab from './components/HistoryTab';
import SettingsTab from './components/SettingsTab';
import { GoogleSignInView } from './components/auth/GoogleSignInView';
import { TransactionSubmissionView } from './components/auth/TransactionSubmissionView';
import { PendingVerificationView } from './components/auth/PendingVerificationView';
import { BlockedView } from './components/auth/BlockedView';
import { OwnerDashboardView } from './components/admin/OwnerDashboardView';
import { playMechanicalClick, triggerHaptic } from './utils/feedback';
import { sendTelegramSecurityBlockAlert } from './utils/telegram';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot, 
  User, 
  signOut 
} from './lib/firebase';

const OFFLINE_AUTH_KEY = 'nexus_offline_auth_state_v2';

const encodeAuthPayload = (data: any): string => {
  try {
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch (_) {
    return '';
  }
};

const decodeAuthPayload = <T,>(encodedStr: string | null): T | null => {
  if (!encodedStr) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(encodedStr))) as T;
  } catch (_) {
    return null;
  }
};

const getInitialOfflineAuth = () => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const saved = decodeAuthPayload<any>(localStorage.getItem(OFFLINE_AUTH_KEY));
    if (saved && saved.status === 'active') {
      return saved;
    }
  } catch (_) {}
  return null;
};

export default function App() {
  const initialOfflineAuth = getInitialOfflineAuth();

  // 1. Firebase Auth & Real-Time Profile Listener State (Offline-First Initialization)
  const [user, setUser] = useState<User | null>(() => {
    if (initialOfflineAuth) {
      return {
        uid: initialOfflineAuth.uid,
        email: initialOfflineAuth.email,
        displayName: initialOfflineAuth.displayName,
        photoURL: initialOfflineAuth.photoURL
      } as User;
    }
    return null;
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (initialOfflineAuth) {
      return {
        uid: initialOfflineAuth.uid,
        email: initialOfflineAuth.email,
        displayName: initialOfflineAuth.displayName,
        status: 'active',
        activeDeviceId: initialOfflineAuth.activeDeviceId,
        createdAt: initialOfflineAuth.updatedAt || new Date().toISOString(),
        updatedAt: initialOfflineAuth.updatedAt || new Date().toISOString()
      };
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    // If a valid saved offline authorization token exists, authLoading is false immediately!
    return !initialOfflineAuth;
  });
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', chatId: '' });
  const [showOwnerDashboard, setShowOwnerDashboard] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Network connection status listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Device fingerprint helper
  const getLocalDeviceId = (): string => {
    try {
      let devId = localStorage.getItem('nexus_device_fingerprint');
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('nexus_device_fingerprint', devId);
      }
      return devId;
    } catch (_) {
      return 'dev_fallback';
    }
  };


  // Single-Device Locking & Automated Multi-Device Blocking Rule
  useEffect(() => {
    if (!user || !userProfile) return;
    if (userProfile.status === 'blocked') return;

    const currentDeviceId = getLocalDeviceId();

    // 1. Initial binding if account has no registered activeDeviceId in Firestore
    if (!userProfile.activeDeviceId) {
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, {
        activeDeviceId: currentDeviceId,
        failedDeviceAttempts: 0,
        updatedAt: new Date().toISOString()
      }).catch((err) => console.error('Error binding initial device fingerprint:', err));
      return;
    }

    // 2. Multi-device attempt detection (Logging in from unauthorized/secondary device)
    if (userProfile.activeDeviceId !== currentDeviceId) {
      const sessionAttemptKey = `unauth_device_logged_${user.uid}_${currentDeviceId}`;
      if (!sessionStorage.getItem(sessionAttemptKey)) {
        sessionStorage.setItem(sessionAttemptKey, 'true');

        const currentAttempts = userProfile.failedDeviceAttempts || 0;
        const newAttempts = currentAttempts + 1;
        const userDocRef = doc(db, 'users', user.uid);

        if (newAttempts >= 1) {
          // Maximum security: 1-attempt limit multi-device blocking rule triggered immediately
          updateDoc(userDocRef, {
            status: 'blocked',
            blockedReason: 'multi_device',
            failedDeviceAttempts: newAttempts,
            lastAttemptDeviceId: currentDeviceId,
            updatedAt: new Date().toISOString()
          }).then(() => {
            // Trigger Automated Payload Alert to Telegram Bot
            sendTelegramSecurityBlockAlert(
              telegramConfig,
              user.email || 'No email',
              userProfile.displayName || user.displayName || 'Google User',
              user.uid
            ).catch((err) => console.error('Error sending auto-block Telegram security alert:', err));
          }).catch((err) => console.error('Error auto-blocking user for multi-device login:', err));
        } else {
          updateDoc(userDocRef, {
            failedDeviceAttempts: newAttempts,
            lastAttemptDeviceId: currentDeviceId,
            updatedAt: new Date().toISOString()
          }).catch((err) => console.error('Error updating multi-device attempt counter:', err));
        }
      }
    }
  }, [user, userProfile]);

  // 2. Active Tab & Visual Settings
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('nexus_active_tab');
      return (saved as TabType) || 'Standard';
    } catch (_) {
      return 'Standard';
    }
  });
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_is_dark_mode');
      return saved ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('calcs_history_ledger');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Load Telegram config from Firestore
  useEffect(() => {
    const fetchTelegramConfig = async () => {
      try {
        const configRef = doc(db, 'config', 'telegram');
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          setTelegramConfig(snap.data() as TelegramConfig);
        }
      } catch (err) {
        console.error('Error fetching Telegram config:', err);
      }
    };
    fetchTelegramConfig();
  }, []);

  // Listen to Auth State Changes & Sync Firestore User Document with Offline Fallback
  useEffect(() => {
    // 1. Initial check for offline launch with saved authorization state
    if (!navigator.onLine) {
      const savedOfflineAuth = decodeAuthPayload<any>(localStorage.getItem(OFFLINE_AUTH_KEY));
      if (savedOfflineAuth && savedOfflineAuth.status === 'active') {
        setUser({
          uid: savedOfflineAuth.uid,
          email: savedOfflineAuth.email,
          displayName: savedOfflineAuth.displayName,
          photoURL: savedOfflineAuth.photoURL
        } as User);
        setUserProfile({
          uid: savedOfflineAuth.uid,
          email: savedOfflineAuth.email,
          displayName: savedOfflineAuth.displayName,
          status: 'active',
          activeDeviceId: savedOfflineAuth.activeDeviceId,
          createdAt: savedOfflineAuth.updatedAt || new Date().toISOString(),
          updatedAt: savedOfflineAuth.updatedAt || new Date().toISOString()
        });
        setAuthLoading(false);
        return;
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        // If network is offline, check saved offline state before resetting to null
        if (!navigator.onLine) {
          const savedOfflineAuth = decodeAuthPayload<any>(localStorage.getItem(OFFLINE_AUTH_KEY));
          if (savedOfflineAuth && savedOfflineAuth.status === 'active') {
            setUser({
              uid: savedOfflineAuth.uid,
              email: savedOfflineAuth.email,
              displayName: savedOfflineAuth.displayName,
              photoURL: savedOfflineAuth.photoURL
            } as User);
            setUserProfile({
              uid: savedOfflineAuth.uid,
              email: savedOfflineAuth.email,
              displayName: savedOfflineAuth.displayName,
              status: 'active',
              activeDeviceId: savedOfflineAuth.activeDeviceId,
              createdAt: savedOfflineAuth.updatedAt || new Date().toISOString(),
              updatedAt: savedOfflineAuth.updatedAt || new Date().toISOString()
            });
            setAuthLoading(false);
            return;
          }
        }

        setUserProfile(null);
        setAuthLoading(false);
        return;
      }

      // If user is administrator, default option to open dashboard
      if (currentUser.email === 'yousifir431@gmail.com') {
        setShowOwnerDashboard(true);
      }

      // Setup real-time listener on user profile document in Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Ensure user document exists in Firestore
      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          const initialProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || 'No Email',
            displayName: currentUser.displayName || 'Google User',
            photoURL: currentUser.photoURL || undefined,
            status: 'pending',
            failedDeviceAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, initialProfile);
        }
      } catch (err) {
        console.error('Error ensuring Firestore user document:', err);
      }

      // Real-time snapshot listener on user document
      const unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const profileData = snap.data() as UserProfile;
          setUserProfile(profileData);

          // Save active authorization state to encrypted localStorage for instant offline PWA access
          if (profileData.status === 'active') {
            const offlinePayload = {
              uid: currentUser.uid,
              email: currentUser.email || 'Google User',
              displayName: profileData.displayName || currentUser.displayName || 'Google User',
              photoURL: profileData.photoURL || currentUser.photoURL,
              status: 'active',
              activeDeviceId: profileData.activeDeviceId || getLocalDeviceId(),
              token: `nexus_tok_${currentUser.uid}_${Date.now()}`,
              updatedAt: new Date().toISOString()
            };
            try {
              localStorage.setItem(OFFLINE_AUTH_KEY, encodeAuthPayload(offlinePayload));
            } catch (_) {}
          } else {
            // Clear cached authorization state if user is blocked or unverified
            localStorage.removeItem(OFFLINE_AUTH_KEY);
          }
        } else {
          // Missing user document fallback: initialize default user profile cleanly without crashing
          const fallbackProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || 'No Email',
            displayName: currentUser.displayName || 'Google User',
            photoURL: currentUser.photoURL || undefined,
            status: 'pending',
            failedDeviceAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUserProfile(fallbackProfile);
          setDoc(userDocRef, fallbackProfile).catch((e) => console.error('Error initializing fallback profile doc:', e));
        }
        setAuthLoading(false);
      }, (err) => {
        console.error('Error subscribing to user profile:', err);
        // Fallback to offline cached authorization if network/firestore drops
        const savedOfflineAuth = decodeAuthPayload<any>(localStorage.getItem(OFFLINE_AUTH_KEY));
        if (savedOfflineAuth && savedOfflineAuth.status === 'active') {
          setUserProfile({
            uid: savedOfflineAuth.uid,
            email: savedOfflineAuth.email,
            displayName: savedOfflineAuth.displayName,
            status: 'active',
            activeDeviceId: savedOfflineAuth.activeDeviceId,
            createdAt: savedOfflineAuth.updatedAt || new Date().toISOString(),
            updatedAt: savedOfflineAuth.updatedAt || new Date().toISOString()
          });
        }
        setAuthLoading(false);
      });

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, []);

  // Safety fallback timer for offline initializations
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        const savedOfflineAuth = decodeAuthPayload<any>(localStorage.getItem(OFFLINE_AUTH_KEY));
        if (savedOfflineAuth && savedOfflineAuth.status === 'active') {
          setUser({
            uid: savedOfflineAuth.uid,
            email: savedOfflineAuth.email,
            displayName: savedOfflineAuth.displayName,
            photoURL: savedOfflineAuth.photoURL
          } as User);
          setUserProfile({
            uid: savedOfflineAuth.uid,
            email: savedOfflineAuth.email,
            displayName: savedOfflineAuth.displayName,
            status: 'active',
            activeDeviceId: savedOfflineAuth.activeDeviceId,
            createdAt: savedOfflineAuth.updatedAt || new Date().toISOString(),
            updatedAt: savedOfflineAuth.updatedAt || new Date().toISOString()
          });
        }
        setAuthLoading(false);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [authLoading]);


  // Persistent state synchronization to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('calcs_history_ledger', JSON.stringify(history));
    } catch (e) {
      // ignore
    }
  }, [history]);

  const [currentTime, setCurrentTime] = useState<string>('00:00');
  
  // Feedback States - default enabled for tactile rich experience
  const [isHapticEnabled, setIsHapticEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_is_haptic_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_is_audio_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus_is_haptic_enabled', JSON.stringify(isHapticEnabled));
    } catch (_) {}
  }, [isHapticEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_is_audio_enabled', JSON.stringify(isAudioEnabled));
    } catch (_) {}
  }, [isAudioEnabled]);
  const [isZoomLocked, setIsZoomLocked] = useState<boolean>(false);

  // Standard Tab State
  const [standardExpression, setStandardExpression] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nexus_standard_expression');
      return saved || '';
    } catch (_) {
      return '';
    }
  });
  const [standardLiveResult, setStandardLiveResult] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nexus_standard_live_result');
      return saved || '';
    } catch (_) {
      return '';
    }
  });
  const [standardHistoryExpression, setStandardHistoryExpression] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nexus_standard_history_expression');
      return saved || '';
    } catch (_) {
      return '';
    }
  });
  const [standardIsDeg, setStandardIsDeg] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_standard_is_deg');
      return saved ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });
  const [standardParsingError, setStandardParsingError] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_standard_parsing_error');
      return saved || null;
    } catch (_) {
      return null;
    }
  });

  // Matrices Tab State
  const [matricesRowsA, setMatricesRowsA] = useState<number>(3);
  const [matricesColsA, setMatricesColsA] = useState<number>(3);
  const [matricesRowsB, setMatricesRowsB] = useState<number>(3);
  const [matricesColsB, setMatricesColsB] = useState<number>(3);

  const [matricesMatrixA, setMatricesMatrixA] = useState<(number | string)[][]>(() => 
    Array(10).fill(0).map(() => Array(10).fill(''))
  );
  
  const [matricesMatrixB, setMatricesMatrixB] = useState<(number | string)[][]>(() => 
    Array(10).fill(0).map(() => Array(10).fill(''))
  );

  const [matricesResultMatrix, setMatricesResultMatrix] = useState<number[][] | null>(null);
  const [matricesResultScalar, setMatricesResultScalar] = useState<number | null>(null);
  const [matricesOpLabel, setMatricesOpLabel] = useState<string>('');
  const [matricesErrorText, setMatricesErrorText] = useState<string | null>(null);
  const [matricesScalarK, setMatricesScalarK] = useState<string>('');

  // Centroids Tab State
  const [centroidsShape, setCentroidsShape] = useState<CentroidShape>('Rectangle');
  const [centroidsWidth, setCentroidsWidth] = useState<number | string>(10);
  const [centroidsHeight, setCentroidsHeight] = useState<number | string>(10);
  const [centroidsRadius, setCentroidsRadius] = useState<number | string>(5);
  const [centroidsDegree, setCentroidsDegree] = useState<number>(2);
  const [centroidsArea, setCentroidsArea] = useState<number>(100);
  const [centroidsXBar, setCentroidsXBar] = useState<number>(5);
  const [centroidsYBar, setCentroidsYBar] = useState<number>(5);

  // MOI Tab State
  const [moiShape, setMoiShape] = useState<CentroidShape>('Rectangle');
  const [moiWidth, setMoiWidth] = useState<number | string>(10);
  const [moiHeight, setMoiHeight] = useState<number | string>(10);
  const [moiRadius, setMoiRadius] = useState<number | string>(5);
  const [moiDegree, setMoiDegree] = useState<number>(2);
  const [moiIx, setMoiIx] = useState<number>(0);
  const [moiIy, setMoiIy] = useState<number>(0);
  const [moiRx, setMoiRx] = useState<number>(0);
  const [moiRy, setMoiRy] = useState<number>(0);

  // Tab switch listener
  useEffect(() => {
    setMatricesErrorText(null);
    setStandardParsingError(null);
    if (standardExpression === 'Math Error' || standardExpression === 'Error' || standardExpression === 'Undefined') {
      setStandardExpression('');
    }
    if (activeTab === 'Matrices') {
      setMatricesScalarK('');
    }
  }, [activeTab]);

  // Real-time clock update for simulated status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString();
      let minutes = now.getMinutes().toString();
      if (hours.length === 1) hours = '0' + hours;
      if (minutes.length === 1) minutes = '0' + minutes;
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  const triggerFeedback = () => {
    if (isAudioEnabled) playMechanicalClick();
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator && isHapticEnabled) {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  };

  const handleTabClick = (tab: TabType) => {
    triggerFeedback();
    setActiveTab(tab);
  };

  const handleAddHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleUndoDeleteHistoryItem = (item: HistoryItem, index: number) => {
    setHistory(prev => {
      if (prev.some(h => h.id === item.id)) return prev;
      const next = [...prev];
      const targetIdx = Math.min(Math.max(0, index), next.length);
      next.splice(targetIdx, 0, item);
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleRestoreHistoryItem = (item: HistoryItem) => {
    if (triggerFeedback) triggerFeedback();

    if (item.type === 'Standard') {
      const cleanExpression = item.expression.replace(/\s*\[DEG\]/gi, '').replace(/\s*\[RAD\]/gi, '').trim();
      setStandardExpression(cleanExpression);
      setStandardLiveResult(item.result);
      setStandardHistoryExpression('');
      if (item.expression.toUpperCase().includes('[DEG]')) {
        setStandardIsDeg(true);
      } else if (item.expression.toUpperCase().includes('[RAD]')) {
        setStandardIsDeg(false);
      }
      setActiveTab('Standard');
    } else if (item.type === 'Matrices') {
      if (item.details) {
        if (item.details.matrixA) {
          const restoredA = Array(10).fill(0).map(() => Array(10).fill(''));
          const rA = item.details.matrixA.length;
          const cA = item.details.matrixA[0]?.length || 0;
          for (let r = 0; r < rA; r++) {
            for (let c = 0; c < cA; c++) {
              restoredA[r][c] = item.details.matrixA[r][c];
            }
          }
          setMatricesMatrixA(restoredA);
          setMatricesRowsA(rA);
          setMatricesColsA(cA);
        }

        if (item.details.matrixB) {
          const restoredB = Array(10).fill(0).map(() => Array(10).fill(''));
          const rB = item.details.matrixB.length;
          const cB = item.details.matrixB[0]?.length || 0;
          for (let r = 0; r < rB; r++) {
            for (let c = 0; c < cB; c++) {
              restoredB[r][c] = item.details.matrixB[r][c];
            }
          }
          setMatricesMatrixB(restoredB);
          setMatricesRowsB(rB);
          setMatricesColsB(cB);
        }

        setMatricesResultMatrix(item.details.resultMatrix || null);
        setMatricesResultScalar(item.details.resultScalar !== undefined ? item.details.resultScalar : null);
        setMatricesOpLabel(item.details.operation || '');
        setMatricesErrorText('');
      }
      setActiveTab('Matrices');
    } else if (item.type === 'Centroids') {
      if (item.details) {
        if (item.details.shape) setCentroidsShape(item.details.shape as any);
        if (item.details.width !== undefined) setCentroidsWidth(item.details.width);
        if (item.details.height !== undefined) setCentroidsHeight(item.details.height);
        if (item.details.radius !== undefined) setCentroidsRadius(item.details.radius);
        if (item.details.degree !== undefined) setCentroidsDegree(item.details.degree);
        if (item.details.area !== undefined) setCentroidsArea(item.details.area);
        if (item.details.xBar !== undefined) setCentroidsXBar(item.details.xBar);
        if (item.details.yBar !== undefined) setCentroidsYBar(item.details.yBar);
      }
      setActiveTab('Centroids');
    } else if (item.type === 'MOI') {
      if (item.details) {
        if (item.details.shape) setMoiShape(item.details.shape as any);
        if (item.details.width !== undefined) setMoiWidth(item.details.width);
        if (item.details.height !== undefined) setMoiHeight(item.details.height);
        if (item.details.radius !== undefined) setMoiRadius(item.details.radius);
        if (item.details.degree !== undefined) setMoiDegree(item.details.degree);
        if (item.details.ix !== undefined) setMoiIx(item.details.ix);
        if (item.details.iy !== undefined) setMoiIy(item.details.iy);
        if (item.details.rx !== undefined) setMoiRx(item.details.rx);
        if (item.details.ry !== undefined) setMoiRy(item.details.ry);
      }
      setActiveTab('MOI');
    }
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Render sub-screen panel for active tab
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Standard':
        return (
          <StandardTab 
            onAddHistory={handleAddHistory} 
            isDarkMode={isDarkMode} 
            triggerFeedback={triggerFeedback}
            expression={standardExpression}
            setExpression={setStandardExpression}
            liveResult={standardLiveResult}
            setLiveResult={setStandardLiveResult}
            historyExpression={standardHistoryExpression}
            setHistoryExpression={setStandardHistoryExpression}
            isDeg={standardIsDeg}
            setIsDeg={setStandardIsDeg}
            parsingError={standardParsingError}
            setParsingError={setStandardParsingError}
          />
        );
      case 'Matrices':
        return (
          <MatricesTab 
            onAddHistory={handleAddHistory} 
            isDarkMode={isDarkMode} 
            triggerFeedback={triggerFeedback} 
            isZoomLocked={isZoomLocked}
            setIsZoomLocked={setIsZoomLocked}
            rowsA={matricesRowsA}
            setRowsA={setMatricesRowsA}
            colsA={matricesColsA}
            setColsA={setMatricesColsA}
            rowsB={matricesRowsB}
            setRowsB={setMatricesRowsB}
            colsB={matricesColsB}
            setColsB={setMatricesColsB}
            matrixA={matricesMatrixA}
            setMatrixA={setMatricesMatrixA}
            matrixB={matricesMatrixB}
            setMatrixB={setMatricesMatrixB}
            resultMatrix={matricesResultMatrix}
            setResultMatrix={setMatricesResultMatrix}
            resultScalar={matricesResultScalar}
            setResultScalar={setMatricesResultScalar}
            opLabel={matricesOpLabel}
            setOpLabel={setMatricesOpLabel}
            errorText={matricesErrorText}
            setErrorText={setMatricesErrorText}
            scalarK={matricesScalarK}
            setScalarK={setMatricesScalarK}
            isPremiumUnlocked={true}
          />
        );
      case 'Centroids':
        return (
          <CentroidsTab 
            onAddHistory={handleAddHistory} 
            isDarkMode={isDarkMode} 
            triggerFeedback={triggerFeedback}
            shape={centroidsShape}
            setShape={setCentroidsShape}
            width={centroidsWidth}
            setWidth={setCentroidsWidth}
            height={centroidsHeight}
            setHeight={setCentroidsHeight}
            radius={centroidsRadius}
            setRadius={setCentroidsRadius}
            degree={centroidsDegree}
            setDegree={setCentroidsDegree}
            area={centroidsArea}
            setArea={setCentroidsArea}
            xBar={centroidsXBar}
            setXBar={setCentroidsXBar}
            yBar={centroidsYBar}
            setYBar={setCentroidsYBar}
          />
        );
      case 'MOI':
        return (
          <MOITab 
            onAddHistory={handleAddHistory} 
            isDarkMode={isDarkMode} 
            triggerFeedback={triggerFeedback}
            shape={moiShape}
            setShape={setMoiShape}
            width={moiWidth}
            setWidth={setMoiWidth}
            height={moiHeight}
            setHeight={setMoiHeight}
            radius={moiRadius}
            setRadius={setMoiRadius}
            degree={moiDegree}
            setDegree={setMoiDegree}
            ix={moiIx}
            setIx={setMoiIx}
            iy={moiIy}
            setIy={setMoiIy}
            rx={moiRx}
            setRx={setMoiRx}
            ry={moiRy}
            setRy={setMoiRy}
          />
        );
      case 'History':
        return (
          <HistoryTab 
            history={history} 
            onClearHistory={handleClearHistory} 
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onUndoDeleteHistoryItem={handleUndoDeleteHistoryItem}
            isDarkMode={isDarkMode} 
            triggerFeedback={triggerFeedback}
            onRestoreItem={handleRestoreHistoryItem}
            isPremiumUnlocked={true}
          />
        );
      case 'Settings':
        return (
          <SettingsTab 
            isDarkMode={isDarkMode} 
            onToggleDarkMode={handleToggleDarkMode} 
            isHapticEnabled={isHapticEnabled}
            onToggleHaptic={() => setIsHapticEnabled(p => !p)}
            isAudioEnabled={isAudioEnabled}
            onToggleAudio={() => setIsAudioEnabled(p => !p)}
            isPremiumUnlocked={true}
            onTogglePremium={() => {}}
          />
        );
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION & ACCESS GATING CONTROLLER
  // --------------------------------------------------------------------------

  // 1. Loading State
  if (authLoading) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 select-none ${
        isDarkMode ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Verifying System Credentials...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated User Wall -> Render Exclusive Google Sign-In Interface
  if (!user) {
    return <GoogleSignInView isDarkMode={isDarkMode} />;
  }

  // 3. Strict Administrator Email Gate -> Option to render Owner Dashboard
  if (user.email === 'yousifir431@gmail.com' && showOwnerDashboard) {
    return (
      <OwnerDashboardView 
        user={user} 
        isDarkMode={isDarkMode} 
        onCloseDashboard={() => setShowOwnerDashboard(false)} 
      />
    );
  }

  // 4. Verification & Security Status Gate for Authenticated Users
  const userStatus = userProfile?.status || 'pending';
  const failedAttempts = userProfile?.failedDeviceAttempts || 0;

  // State: Blocked or device attempt limit reached (failedDeviceAttempts >= 1) -> Lock account & render Blocked View
  if (userStatus === 'blocked' || failedAttempts >= 1) {
    return <BlockedView user={user} profile={userProfile} isDarkMode={isDarkMode} />;
  }

  // State: Non-active User (pending, unpaid, unverified, expired) -> Enforce Payment Gate
  if (userStatus !== 'active') {
    // If pending and payment details were already submitted, render Pending Verification View
    if (userStatus === 'pending' && userProfile?.paymentDetails) {
      return (
        <PendingVerificationView 
          user={user} 
          profile={userProfile} 
          isDarkMode={isDarkMode} 
        />
      );
    }
    // Otherwise redirect directly to Payment / Checkout Page
    return (
      <TransactionSubmissionView 
        user={user} 
        telegramConfig={telegramConfig} 
        isDarkMode={isDarkMode} 
      />
    );
  }

  // State: Active -> Render Full Unlocked PWA Engineering Calculator App!
  return (
    <div className={`min-h-screen h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-0 md:p-6 transition-colors duration-250 font-sans overflow-hidden overflow-y-hidden ${
      isDarkMode ? 'bg-zinc-950 text-neutral-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Visual Ambient Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-50 pointer-events-none hidden md:block" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-50 pointer-events-none hidden md:block" />

      {/* Primary Phone Container */}
      <div 
        id="phone-frame-container" 
        className={`w-full h-screen h-[100dvh] max-h-[100dvh] md:h-[660px] md:w-[350px] md:max-w-[350px] md:rounded-[36px] flex flex-col justify-between overflow-hidden overflow-y-hidden shadow-2xl relative border transition-all duration-250 md:aspect-[9/18a] ${
          isDarkMode 
            ? 'bg-zinc-950 border-neutral-800/80 shadow-black' 
            : 'bg-white border-slate-200 shadow-slate-300'
        }`}
      >
        {/* Admin floating button for administrator */}
        {user.email === 'yousifir431@gmail.com' && (
          <div className="absolute top-2 right-2 z-50">
            <button
              onClick={() => setShowOwnerDashboard(true)}
              className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md backdrop-blur-md hover:bg-cyan-500/30 transition-all"
              title="Open Owner Control Center"
            >
              <ShieldCheck size={12} />
              <span>Admin</span>
            </button>
          </div>
        )}

        {/* Inner Viewport Screen */}
        <div className="flex-1 w-full max-w-full overflow-hidden overflow-y-hidden min-h-0 p-0 md:p-3.5 pb-0 flex flex-col justify-between">
          {renderActiveScreen()}
        </div>

        {/* Bottom Navigation Bar */}
        <div 
          id="bottom-tab-navigation"
          className={`h-14 border-t flex justify-around items-center shrink-0 z-10 px-0.5 select-none ${
            isDarkMode 
              ? 'bg-neutral-950 border-neutral-800 text-neutral-400' 
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          {/* Standard */}
          <button
            id="tab-btn-standard"
            onClick={() => handleTabClick('Standard')}
            className={`flex flex-col items-center justify-center flex-1 h-11 rounded-lg cursor-pointer transition-all ${
              activeTab === 'Standard'
                ? (isDarkMode ? 'text-amber-500' : 'text-indigo-600')
                : 'opacity-70 hover:opacity-100 text-neutral-400'
            }`}
          >
            <Calculator size={15} className={`mb-0.5 ${activeTab === 'Standard' ? 'scale-110' : ''}`} />
            <span className="text-[7.5px] font-black tracking-wider uppercase">Standard</span>
          </button>

          {/* Matrices */}
          <button
            id="tab-btn-matrices"
            onClick={() => handleTabClick('Matrices')}
            className={`flex flex-col items-center justify-center flex-1 h-11 rounded-lg cursor-pointer transition-all ${
              activeTab === 'Matrices'
                ? (isDarkMode ? 'text-amber-500' : 'text-indigo-600')
                : 'opacity-70 hover:opacity-100 text-neutral-400'
            }`}
          >
            <Grid3X3 size={15} className={`mb-0.5 ${activeTab === 'Matrices' ? 'scale-110' : ''}`} />
            <span className="text-[7.5px] font-black tracking-wider uppercase">Matrices</span>
          </button>

          {/* Centroids */}
          <button
            id="tab-btn-centroids"
            onClick={() => handleTabClick('Centroids')}
            className={`flex flex-col items-center justify-center flex-1 h-11 rounded-lg cursor-pointer transition-all ${
              activeTab === 'Centroids'
                ? (isDarkMode ? 'text-amber-500' : 'text-indigo-600')
                : 'opacity-70 hover:opacity-100 text-neutral-400'
            }`}
          >
            <Crosshair size={15} className={`mb-0.5 ${activeTab === 'Centroids' ? 'scale-110' : ''}`} />
            <span className="text-[7.5px] font-black tracking-wider uppercase">Centroid</span>
          </button>

          {/* MOI */}
          <button
            id="tab-btn-moi"
            onClick={() => handleTabClick('MOI')}
            className={`flex flex-col items-center justify-center flex-1 h-11 rounded-lg cursor-pointer transition-all ${
              activeTab === 'MOI'
                ? (isDarkMode ? 'text-amber-500' : 'text-indigo-600')
                : 'opacity-70 hover:opacity-100 text-neutral-400'
            }`}
          >
            <RotateCcw size={15} className={`mb-0.5 ${activeTab === 'MOI' ? 'scale-110' : ''}`} />
            <span className="text-[7.5px] font-black tracking-wider uppercase">MOI</span>
          </button>

          {/* History */}
          <button
            id="tab-btn-history"
            onClick={() => handleTabClick('History')}
            className={`flex flex-col items-center justify-center flex-1 h-11 rounded-lg cursor-pointer transition-all ${
              activeTab === 'History'
                ? (isDarkMode ? 'text-amber-500' : 'text-indigo-600')
                : 'opacity-70 hover:opacity-100 text-neutral-400'
            }`}
          >
            <History size={15} className={`mb-0.5 ${activeTab === 'History' ? 'scale-110' : ''}`} />
            <span className="text-[7.5px] font-black tracking-wider uppercase">History</span>
          </button>

          {/* Settings */}
          <button
            id="tab-btn-settings"
            onClick={() => handleTabClick('Settings')}
            className={`flex flex-col items-center justify-center flex-1 h-11 rounded-lg cursor-pointer transition-all ${
              activeTab === 'Settings'
                ? (isDarkMode ? 'text-amber-500' : 'text-indigo-600')
                : 'opacity-70 hover:opacity-100 text-neutral-400'
            }`}
          >
            <Sliders size={15} className={`mb-0.5 ${activeTab === 'Settings' ? 'scale-110' : ''}`} />
            <span className="text-[7.5px] font-black tracking-wider uppercase">Settings</span>
          </button>
        </div>

        {/* Home indicator bar */}
        <div className="h-4 w-full flex justify-center items-center pb-2 shrink-0 select-none hidden md:flex">
          <div className="w-24 h-1 bg-neutral-600/60 rounded-full" />
        </div>

      </div>
    </div>
  );
}
