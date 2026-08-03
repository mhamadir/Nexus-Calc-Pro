import React, { useState } from 'react';
import { Sun, Moon, Volume2, VolumeX, Fingerprint, Sparkles } from 'lucide-react';

interface SettingsTabProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isHapticEnabled: boolean;
  onToggleHaptic: () => void;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  isPremiumUnlocked?: boolean;
  onTogglePremium?: () => void;
}

export default function SettingsTab({ 
  isDarkMode, 
  onToggleDarkMode,
  isHapticEnabled,
  onToggleHaptic,
  isAudioEnabled,
  onToggleAudio,
  isPremiumUnlocked = false,
  onTogglePremium
}: SettingsTabProps) {
  const [devTapCount, setDevTapCount] = useState<number>(0);
  
  return (
    <div className="flex flex-col h-full w-full select-none text-xs text-left relative overflow-hidden">
      
      {/* Scrollable Container */}
      <div id="settings-panel" className="flex flex-col h-full justify-between pb-2">
        
        <div className="space-y-4">
          {/* Top Structural Spacing / Secret tap interaction zone */}
          <div 
            id="settings-tap-zone"
            onClick={() => setDevTapCount(prev => prev + 1)}
            className="h-3 w-full cursor-pointer select-none"
          />

          <div className="flex flex-col">
            <span className="font-extrabold text-[10px] uppercase text-neutral-400 tracking-wider mb-2">Display Mode</span>
            
            {/* Toggle 1: Appearance Style */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${
              isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-neutral-800 text-amber-400' : 'bg-slate-200/60 text-indigo-600'}`}>
                  {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                </div>
                <div>
                  <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>Appearance Style</p>
                  <p className="text-[9px] text-neutral-400 uppercase mt-0.5 font-semibold">
                    {isDarkMode ? 'Dark UI theme' : 'Light UI theme'}
                  </p>
                </div>
              </div>

              {/* Toggle switch slider button */}
              <button
                id="toggle-appearance-style"
                onClick={onToggleDarkMode}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                  isDarkMode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all duration-200 ${
                  isDarkMode ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-extrabold text-[10px] uppercase text-neutral-400 tracking-wider mb-2">Tactile & Audio Controllers</span>
            
            <div className="space-y-2">
              {/* Toggle 2: Haptic Feedback */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isHapticEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-500/10 text-neutral-400'}`}>
                    <Fingerprint size={16} />
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>Haptic Vibration</p>
                    <p className="text-[9px] text-neutral-400 uppercase mt-0.5 font-semibold">
                      {isHapticEnabled ? 'Tactile vibration active' : 'Tactile vibration disabled'}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  id="toggle-haptic-feedback"
                  onClick={() => {
                    const nextState = !isHapticEnabled;
                    onToggleHaptic();
                    if (nextState && typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                      try {
                        navigator.vibrate([30, 50, 30]);
                      } catch (e) {}
                    }
                  }}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                    isHapticEnabled ? 'bg-emerald-500' : 'bg-neutral-500/30'
                  }`}
                >
                  <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all duration-200 ${
                    isHapticEnabled ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 3: Audio Feedback */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isAudioEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-neutral-550/10 text-neutral-400'}`}>
                    {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>Mechanical Key Sound</p>
                    <p className="text-[9px] text-neutral-400 uppercase mt-0.5 font-semibold">
                      {isAudioEnabled ? 'Audio click active' : 'Audio click muted'}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  id="toggle-audio-feedback"
                  onClick={onToggleAudio}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                    isAudioEnabled ? 'bg-blue-500' : 'bg-neutral-500/30'
                  }`}
                >
                  <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all duration-200 ${
                    isAudioEnabled ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Premium License Controls Section */}
          {devTapCount >= 7 && (
            <div className="flex flex-col">
              <span className="font-extrabold text-[10px] uppercase text-amber-500 tracking-wider mb-2 flex items-center space-x-1">
                <Sparkles size={11} className="text-amber-500 animate-pulse" />
                <span>Premium License Engine</span>
              </span>
              
              <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${
                isDarkMode ? 'bg-gradient-to-br from-neutral-900 to-neutral-950 border-amber-500/25' : 'bg-gradient-to-br from-amber-50/40 to-yellow-50 bg-white border-amber-500/15'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isPremiumUnlocked ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-500/10 text-neutral-450'}`}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>Pro Premium License</p>
                    <p className="text-[9px] text-neutral-400 uppercase mt-0.5 font-semibold">
                      {isPremiumUnlocked ? '★ PRO Activated' : '🔓 Free / Locked Mode'}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  id="toggle-premium-license"
                  onClick={onTogglePremium}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                    isPremiumUnlocked ? 'bg-amber-500' : 'bg-neutral-500/30'
                  }`}
                >
                  <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-all duration-200 ${
                    isPremiumUnlocked ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
