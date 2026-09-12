/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator, Grid3X3, Crosshair, RotateCcw, Sliders, History
} from 'lucide-react';
import { TabType, HistoryItem, CentroidShape } from './types';
import StandardTab from './components/StandardTab';
import MatricesTab from './components/MatricesTab';
import CentroidsTab from './components/CentroidsTab';
import MOITab from './components/MOITab';
import HistoryTab from './components/HistoryTab';
import SettingsTab from './components/SettingsTab';
import { playMechanicalClick } from './utils/feedback';

export default function App() {
  // 1. Navigation & Visual Settings (Persisted in localStorage)
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
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('calcs_history_ledger');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

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

  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_is_premium_unlocked');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [isZoomLocked, setIsZoomLocked] = useState<boolean>(false);

  // 2. Standard Tab State (Persisted in localStorage)
  const [standardExpression, setStandardExpression] = useState<string>(() => {
    try {
      return localStorage.getItem('nexus_standard_expression') || '';
    } catch (_) {
      return '';
    }
  });

  const [standardLiveResult, setStandardLiveResult] = useState<string>(() => {
    try {
      return localStorage.getItem('nexus_standard_live_result') || '';
    } catch (_) {
      return '';
    }
  });

  const [standardHistoryExpression, setStandardHistoryExpression] = useState<string>(() => {
    try {
      return localStorage.getItem('nexus_standard_history_expression') || '';
    } catch (_) {
      return '';
    }
  });

  const [standardIsDeg, setStandardIsDeg] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_standard_is_deg');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [standardParsingError, setStandardParsingError] = useState<string | null>(null);

  // 3. Matrices Tab State (Persisted in localStorage)
  const [matricesRowsA, setMatricesRowsA] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_matrices_rows_a');
      return saved ? parseInt(saved, 10) : 3;
    } catch (_) {
      return 3;
    }
  });

  const [matricesColsA, setMatricesColsA] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_matrices_cols_a');
      return saved ? parseInt(saved, 10) : 3;
    } catch (_) {
      return 3;
    }
  });

  const [matricesRowsB, setMatricesRowsB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_matrices_rows_b');
      return saved ? parseInt(saved, 10) : 3;
    } catch (_) {
      return 3;
    }
  });

  const [matricesColsB, setMatricesColsB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_matrices_cols_b');
      return saved ? parseInt(saved, 10) : 3;
    } catch (_) {
      return 3;
    }
  });

  const [matricesMatrixA, setMatricesMatrixA] = useState<(number | string)[][]>(() => {
    try {
      const saved = localStorage.getItem('nexus_matrices_matrix_a');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return Array(10).fill(0).map(() => Array(10).fill(''));
  });

  const [matricesMatrixB, setMatricesMatrixB] = useState<(number | string)[][]>(() => {
    try {
      const saved = localStorage.getItem('nexus_matrices_matrix_b');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return Array(10).fill(0).map(() => Array(10).fill(''));
  });

  const [matricesResultMatrix, setMatricesResultMatrix] = useState<number[][] | null>(null);
  const [matricesResultScalar, setMatricesResultScalar] = useState<number | null>(null);
  const [matricesOpLabel, setMatricesOpLabel] = useState<string>('');
  const [matricesErrorText, setMatricesErrorText] = useState<string | null>(null);
  const [matricesScalarK, setMatricesScalarK] = useState<string>('');

  // 4. Centroids Tab State (Persisted in localStorage)
  const [centroidsShape, setCentroidsShape] = useState<CentroidShape>(() => {
    try {
      const saved = localStorage.getItem('nexus_centroids_shape');
      return (saved as CentroidShape) || 'Rectangle';
    } catch (_) {
      return 'Rectangle';
    }
  });

  const [centroidsWidth, setCentroidsWidth] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('nexus_centroids_width');
      return saved !== null ? saved : 10;
    } catch (_) {
      return 10;
    }
  });

  const [centroidsHeight, setCentroidsHeight] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('nexus_centroids_height');
      return saved !== null ? saved : 10;
    } catch (_) {
      return 10;
    }
  });

  const [centroidsRadius, setCentroidsRadius] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('nexus_centroids_radius');
      return saved !== null ? saved : 5;
    } catch (_) {
      return 5;
    }
  });

  const [centroidsDegree, setCentroidsDegree] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_centroids_degree');
      return saved ? parseInt(saved, 10) : 2;
    } catch (_) {
      return 2;
    }
  });

  const [centroidsArea, setCentroidsArea] = useState<number>(100);
  const [centroidsXBar, setCentroidsXBar] = useState<number>(5);
  const [centroidsYBar, setCentroidsYBar] = useState<number>(5);

  // 5. MOI Tab State (Persisted in localStorage)
  const [moiShape, setMoiShape] = useState<CentroidShape>(() => {
    try {
      const saved = localStorage.getItem('nexus_moi_shape');
      return (saved as CentroidShape) || 'Rectangle';
    } catch (_) {
      return 'Rectangle';
    }
  });

  const [moiWidth, setMoiWidth] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('nexus_moi_width');
      return saved !== null ? saved : 10;
    } catch (_) {
      return 10;
    }
  });

  const [moiHeight, setMoiHeight] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('nexus_moi_height');
      return saved !== null ? saved : 10;
    } catch (_) {
      return 10;
    }
  });

  const [moiRadius, setMoiRadius] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('nexus_moi_radius');
      return saved !== null ? saved : 5;
    } catch (_) {
      return 5;
    }
  });

  const [moiDegree, setMoiDegree] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_moi_degree');
      return saved ? parseInt(saved, 10) : 2;
    } catch (_) {
      return 2;
    }
  });

  const [moiIx, setMoiIx] = useState<number>(0);
  const [moiIy, setMoiIy] = useState<number>(0);
  const [moiRx, setMoiRx] = useState<number>(0);
  const [moiRy, setMoiRy] = useState<number>(0);

  // --------------------------------------------------------------------------
  // LOCAL STORAGE PERSISTENCE SYNCHRONIZATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    try {
      localStorage.setItem('nexus_active_tab', activeTab);
    } catch (_) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_is_dark_mode', JSON.stringify(isDarkMode));
    } catch (_) {}
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('calcs_history_ledger', JSON.stringify(history));
    } catch (_) {}
  }, [history]);

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

  useEffect(() => {
    try {
      localStorage.setItem('nexus_is_premium_unlocked', JSON.stringify(isPremiumUnlocked));
    } catch (_) {}
  }, [isPremiumUnlocked]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_standard_expression', standardExpression);
    } catch (_) {}
  }, [standardExpression]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_standard_live_result', standardLiveResult);
    } catch (_) {}
  }, [standardLiveResult]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_standard_history_expression', standardHistoryExpression);
    } catch (_) {}
  }, [standardHistoryExpression]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_standard_is_deg', JSON.stringify(standardIsDeg));
    } catch (_) {}
  }, [standardIsDeg]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_matrices_rows_a', matricesRowsA.toString());
      localStorage.setItem('nexus_matrices_cols_a', matricesColsA.toString());
      localStorage.setItem('nexus_matrices_rows_b', matricesRowsB.toString());
      localStorage.setItem('nexus_matrices_cols_b', matricesColsB.toString());
      localStorage.setItem('nexus_matrices_matrix_a', JSON.stringify(matricesMatrixA));
      localStorage.setItem('nexus_matrices_matrix_b', JSON.stringify(matricesMatrixB));
    } catch (_) {}
  }, [matricesRowsA, matricesColsA, matricesRowsB, matricesColsB, matricesMatrixA, matricesMatrixB]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_centroids_shape', centroidsShape);
      localStorage.setItem('nexus_centroids_width', centroidsWidth.toString());
      localStorage.setItem('nexus_centroids_height', centroidsHeight.toString());
      localStorage.setItem('nexus_centroids_radius', centroidsRadius.toString());
      localStorage.setItem('nexus_centroids_degree', centroidsDegree.toString());
    } catch (_) {}
  }, [centroidsShape, centroidsWidth, centroidsHeight, centroidsRadius, centroidsDegree]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_moi_shape', moiShape);
      localStorage.setItem('nexus_moi_width', moiWidth.toString());
      localStorage.setItem('nexus_moi_height', moiHeight.toString());
      localStorage.setItem('nexus_moi_radius', moiRadius.toString());
      localStorage.setItem('nexus_moi_degree', moiDegree.toString());
    } catch (_) {}
  }, [moiShape, moiWidth, moiHeight, moiRadius, moiDegree]);

  // Tab switch cleanup
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

  const triggerFeedback = () => {
    if (isAudioEnabled) playMechanicalClick();
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator && isHapticEnabled) {
      try {
        navigator.vibrate(15);
      } catch (_) {}
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
    triggerFeedback();

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
            isPremiumUnlocked={isPremiumUnlocked}
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
            isPremiumUnlocked={isPremiumUnlocked}
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
            isPremiumUnlocked={isPremiumUnlocked}
            onTogglePremium={() => setIsPremiumUnlocked(p => !p)}
          />
        );
      default:
        return null;
    }
  };

  // Immediate direct render of the entire standalone application
  return (
    <div className={`min-h-screen h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-0 md:p-6 transition-colors duration-250 font-sans overflow-hidden overflow-y-hidden ${
      isDarkMode ? 'bg-zinc-950 text-neutral-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Visual Ambient Background Blobs on Desktop */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -z-50 pointer-events-none hidden md:block" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-50 pointer-events-none hidden md:block" />

      {/* Primary Calculator Frame Container */}
      <div 
        id="phone-frame-container" 
        className={`w-full h-screen h-[100dvh] max-h-[100dvh] md:h-[660px] md:w-[350px] md:max-w-[350px] md:rounded-[36px] flex flex-col justify-between overflow-hidden overflow-y-hidden shadow-2xl relative border transition-all duration-250 ${
          isDarkMode 
            ? 'bg-zinc-950 border-neutral-800/80 shadow-black' 
            : 'bg-white border-slate-200 shadow-slate-300'
        }`}
      >
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

        {/* Home indicator bar on desktop */}
        <div className="h-4 w-full flex justify-center items-center pb-2 shrink-0 select-none hidden md:flex">
          <div className="w-24 h-1 bg-neutral-600/60 rounded-full" />
        </div>

      </div>
    </div>
  );
}
