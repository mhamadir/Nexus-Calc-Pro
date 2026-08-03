import React, { useState, useRef, useEffect } from 'react';
import { HistoryItem } from '../types';
import { 
  Trash2, Binary, Grid3X3, Crosshair, RotateCcw, HelpCircle 
} from 'lucide-react';

interface HistoryTabProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  onUndoDeleteHistoryItem?: (item: HistoryItem, index: number) => void;
  isDarkMode: boolean;
  triggerFeedback?: () => void;
  onRestoreItem?: (item: HistoryItem) => void;
  isPremiumUnlocked?: boolean;
  onTriggerPaywall?: () => void;
}



function formatRelativeTime(timestampStr: string): string {
  try {
    const logDate = new Date(timestampStr);
    const now = new Date();
    const diffMs = now.getTime() - logDate.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) {
      return "0 mins ago";
    }

    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    
    // Less than 1 hour old
    if (diffMinutes < 60) {
      return `${diffMinutes} mins ago`;
    }

    // Between 1 hour and 24 hours old
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    if (diffHours < 24) {
      return `${diffHours} hours, ${remainingMinutes} mins ago`;
    }

    // Between 24 hours and 7 days old
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    if (diffDays < 7) {
      return `${diffDays} days, ${remainingHours} hours ago`;
    }

    // 7 days or older -> DD/MM/YYYY
    const d = logDate.getDate();
    const m = logDate.getMonth() + 1;
    const y = logDate.getFullYear();
    return `${d}/${m}/${y}`;
  } catch (err) {
    return "";
  }
}

const renderMiniGrid = (matrix: number[][], isDarkMode: boolean) => {
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;
  return (
    <div className="flex items-center justify-end font-mono text-[7px] leading-tight select-all">
      <div className={`border-l-2 border-r-2 px-1 py-0.5 rounded-sm flex flex-col space-y-0.5 min-w-[40px] ${
        isDarkMode 
          ? 'bg-zinc-800 border-zinc-700 text-neutral-100' 
          : 'bg-slate-100 border-slate-300 text-slate-900'
      }`}>
        {matrix.slice(0, 3).map((row, rIdx) => (
          <div key={rIdx} className="flex justify-end space-x-1">
            {row.slice(0, 3).map((val, cIdx) => {
              const valStr = Math.abs(val) < 1e-4 ? '0' : Number(val.toFixed(1)).toString();
              return (
                <span key={cIdx} className={`font-bold min-w-[12px] text-right ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  {valStr}
                </span>
              );
            })}
            {cols > 3 && (
              <span className={`text-[5px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                ..
              </span>
            )}
          </div>
        ))}
        {rows > 3 && (
          <div className={`text-[5px] text-center leading-none ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
            ...
          </div>
        )}
      </div>
    </div>
  );
};

export default function HistoryTab({ 
  history, 
  onClearHistory, 
  onDeleteHistoryItem,
  onUndoDeleteHistoryItem,
  isDarkMode,
  triggerFeedback,
  onRestoreItem,
  isPremiumUnlocked = false,
  onTriggerPaywall
}: HistoryTabProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ item: HistoryItem; index: number } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleDeleteSingleItem = (item: HistoryItem, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerFeedback) triggerFeedback();

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setPendingDelete({ item, index });
    onDeleteHistoryItem(item.id);

    toastTimerRef.current = setTimeout(() => {
      setPendingDelete(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  const handleUndoDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerFeedback) triggerFeedback();

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    if (pendingDelete) {
      if (onUndoDeleteHistoryItem) {
        onUndoDeleteHistoryItem(pendingDelete.item, pendingDelete.index);
      }
      setPendingDelete(null);
    }
  };
  
  const isPremiumItem = (item: HistoryItem): boolean => {
    if (item.type === 'Centroids' || item.type === 'MOI') return true;
    if (item.type === 'Matrices') {
      const rA = item.details?.matrixA?.length || 0;
      const cA = item.details?.matrixA?.[0]?.length || 0;
      const rB = item.details?.matrixB?.length || 0;
      const cB = item.details?.matrixB?.[0]?.length || 0;
      if (rA > 3 || cA > 3 || rB > 3 || cB > 3) {
        return true;
      }
    }
    return false;
  };
  
  // Return appropriate lucide icon badge for each calculation category
  const getBadgeIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'Standard':
        return <Binary size={14} className="text-amber-500" />;
      case 'Matrices':
        return <Grid3X3 size={14} className="text-blue-400" />;
      case 'Centroids':
        return <Crosshair size={14} className="text-emerald-400" />;
      case 'MOI':
        return <RotateCcw size={14} className="text-cyan-400" />;
      default:
        return <HelpCircle size={14} className="text-neutral-400" />;
    }
  };

  const getBadgeBg = (type: HistoryItem['type']) => {
    switch (type) {
      case 'Standard':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'Matrices':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'Centroids':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'MOI':
        return 'bg-cyan-500/10 border-cyan-500/20';
      default:
        return 'bg-neutral-500/10 border-neutral-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full w-full select-none text-xs text-left relative overflow-hidden">
      
      {/* Container */}
      <div id="history-panel" className="flex flex-col h-full justify-between pb-1 overflow-hidden">
        
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="font-extrabold text-[10px] uppercase text-neutral-400 tracking-wider">
              Calculation History
            </span>
            
            {history.length > 0 && (
              <button
                id="btn-trigger-clear-history-tab"
                type="button"
                onClick={() => {
                  if (triggerFeedback) triggerFeedback();
                  setIsConfirmOpen(true);
                }}
                className="flex items-center space-x-1.5 px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 font-bold text-[10px] uppercase transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span>CLEAR HISTORY</span>
              </button>
            )}
          </div>

          {/* List entries scroll field - max height with absolute scrollbar none */}
          <div 
            id="history-ledger-list-tab"
            className={`border rounded-xl flex-1 h-full max-h-full overflow-y-auto p-2 scrollbar-none space-y-2 opacity-100 ${
              isDarkMode ? 'bg-neutral-950 border-neutral-800/80' : 'bg-white border-slate-200'
            }`}
          >
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <span className="text-2xl opacity-40 mb-1">⏳</span>
                <p className="font-bold text-neutral-400 uppercase text-[10px]">No calculations recorded yet.</p>
                <p className="text-[8px] text-neutral-500 uppercase mt-1">Evaluated items from any mathematical tab compile here.</p>
              </div>
            ) : (
              history.map((item, index) => {
                return (
                  <div
                    key={item.id}
                    id={`history-item-tab-${item.id}`}
                    onClick={() => {
                      if (triggerFeedback) triggerFeedback();
                      if (onRestoreItem) {
                        onRestoreItem(item);
                      }
                    }}
                    className="flex justify-between items-center bg-transparent transition-all duration-150 text-xs cursor-pointer border-b border-slate-200 dark:border-zinc-800/60 pb-3 mb-3 opacity-100"
                  >
                  {/* Left Side: Badge + Module Title + Expression */}
                  <div className="flex items-start space-x-2 min-w-0 flex-1 pr-1">
                    <div className={`p-1.5 rounded-md border flex-none ${getBadgeBg(item.type)}`}>
                      {getBadgeIcon(item.type)}
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                      <div className="flex items-center space-x-1 text-[8px] font-black uppercase tracking-wider text-neutral-400">
                        <span>{item.type} module</span>
                        <span>•</span>
                        <span className="font-mono lowercase opacity-85">{formatRelativeTime(item.timestamp)}</span>
                      </div>
                      <p className={`font-mono text-[11px] truncate mt-0.5 font-semibold ${isDarkMode ? 'text-neutral-100' : 'text-slate-800'}`}>
                        {item.expression}
                      </p>

                    </div>
                  </div>

                  {/* Right Side: Result Value & Delete Button */}
                  <div className="flex items-center space-x-2 flex-none pl-1">
                    <div className="text-right max-w-[130px] overflow-hidden">
                      {item.type === 'Matrices' && item.details?.resultMatrix ? (
                        renderMiniGrid(item.details.resultMatrix, isDarkMode)
                      ) : (
                        <p className="text-[10px] font-bold text-emerald-500 font-mono truncate">
                          {item.result}
                        </p>
                      )}
                    </div>
                    <button
                      id={`btn-delete-item-tab-${item.id}`}
                      type="button"
                      onClick={(e) => handleDeleteSingleItem(item, index, e)}
                      className={`p-1 rounded-md transition-colors cursor-pointer flex-none ${
                        isDarkMode 
                          ? 'text-neutral-500 hover:text-rose-400 hover:bg-neutral-800' 
                          : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200/50'
                      }`}
                      title="Delete entry"
                    >
                      <Trash2 size={12} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>

      </div>

      {/* Interactive Undo Toast Notification Bar */}
      {pendingDelete && (
        <div 
          id="history-undo-toast"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-[320px] px-3 py-2 rounded-xl shadow-2xl border flex items-center justify-between backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in"
          style={{
            backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDarkMode ? 'rgba(63, 63, 70, 0.8)' : 'rgba(226, 232, 240, 0.9)',
            color: isDarkMode ? '#f4f4f5' : '#0f172a'
          }}
        >
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-none" />
            <span className="text-[11px] font-semibold truncate">
              Calculation deleted
            </span>
          </div>

          <button
            id="btn-undo-delete-history"
            type="button"
            onClick={handleUndoDelete}
            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center space-x-1 transition-all active:scale-95 shadow-sm flex-none cursor-pointer"
          >
            <RotateCcw size={11} className="stroke-[3]" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {isConfirmOpen && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className={`w-full max-w-[280px] rounded-2xl p-5 border text-center shadow-xl animate-in zoom-in-95 duration-200 ${
            isDarkMode 
              ? 'bg-neutral-900 border-neutral-800 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="mb-3 flex justify-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Trash2 size={16} />
              </div>
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider mb-2">
              Clear History?
            </h3>
            <p className="text-[10px] text-neutral-400 font-semibold mb-5 leading-relaxed">
              Are you sure you want to delete all calculation logs? This action cannot be undone.
            </p>
            
            <div className="flex space-x-2">
              <button
                id="btn-confirm-clear-history-cancel"
                type="button"
                onClick={() => {
                  if (triggerFeedback) triggerFeedback();
                  setIsConfirmOpen(false);
                }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer ${
                  isDarkMode 
                    ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-750' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-clear-history-proceed"
                type="button"
                onClick={() => {
                  if (triggerFeedback) triggerFeedback();
                  setIsConfirmOpen(false);
                  onClearHistory();
                }}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-750 active:scale-[0.98] transition-all cursor-pointer shadow-md"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
