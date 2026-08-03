import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, CentroidShape } from '../types';

interface MOITabProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  isDarkMode: boolean;
  triggerFeedback?: () => void;
  shape: CentroidShape;
  setShape: React.Dispatch<React.SetStateAction<CentroidShape>>;
  width: number | string;
  setWidth: React.Dispatch<React.SetStateAction<number | string>>;
  height: number | string;
  setHeight: React.Dispatch<React.SetStateAction<number | string>>;
  radius: number | string;
  setRadius: React.Dispatch<React.SetStateAction<number | string>>;
  degree: number;
  setDegree: React.Dispatch<React.SetStateAction<number>>;
  ix: number;
  setIx: React.Dispatch<React.SetStateAction<number>>;
  iy: number;
  setIy: React.Dispatch<React.SetStateAction<number>>;
  rx: number;
  setRx: React.Dispatch<React.SetStateAction<number>>;
  ry: number;
  setRy: React.Dispatch<React.SetStateAction<number>>;
}

export default function MOITab({ 
  onAddHistory: onAddHistoryRaw, 
  isDarkMode, 
  triggerFeedback,
  shape,
  setShape,
  width,
  setWidth,
  height,
  setHeight,
  radius,
  setRadius,
  degree,
  setDegree,
  ix,
  setIx,
  iy,
  setIy,
  rx,
  setRx,
  ry,
  setRy
}: MOITabProps) {

  const shapes: CentroidShape[] = [
    'Rectangle', 'Triangle', 'Circle', 'Semi-circle', 'Quarter-circle', 'Parabolic Spandrel'
  ];

  const [parabolicType, setParabolicType] = useState<'Fat' | 'Skinny'>('Skinny');

  useEffect(() => {
    const numW = typeof width === 'string' ? (parseFloat(width) || 0) : width;
    const numH = typeof height === 'string' ? (parseFloat(height) || 0) : height;
    const numR = typeof radius === 'string' ? (parseFloat(radius) || 0) : radius;

    const isCircleShape = ['Circle', 'Semi-circle', 'Quarter-circle'].includes(shape);
    const isRectShape = ['Rectangle', 'Triangle', 'Parabolic Spandrel'].includes(shape);

    if ((isCircleShape && (radius === '' || numR <= 0)) || (isRectShape && (width === '' || height === '' || numW <= 0 || numH <= 0))) {
      setIx(0);
      setIy(0);
      setRx(0);
      setRy(0);
      return;
    }

    let calculatedIx = 0;
    let calculatedIy = 0;
    let calculatedRx = 0;
    let calculatedRy = 0;

    const w = Math.max(0.001, numW);
    const h = Math.max(0.001, numH);
    const r = Math.max(0.001, numR);

    switch (shape) {
      case 'Rectangle': {
        const A = w * h;
        calculatedIx = (w * Math.pow(h, 3)) / 12;
        calculatedIy = (h * Math.pow(w, 3)) / 12;
        calculatedRx = Math.sqrt(calculatedIx / A);
        calculatedRy = Math.sqrt(calculatedIy / A);
        break;
      }
      case 'Triangle': {
        const A = 0.5 * w * h;
        calculatedIx = (w * Math.pow(h, 3)) / 36;
        calculatedIy = (h * Math.pow(w, 3)) / 36;
        calculatedRx = Math.sqrt(calculatedIx / A);
        calculatedRy = Math.sqrt(calculatedIy / A);
        break;
      }
      case 'Circle': {
        const A = Math.PI * Math.pow(r, 2);
        calculatedIx = (Math.PI * Math.pow(r, 4)) / 4;
        calculatedIy = (Math.PI * Math.pow(r, 4)) / 4;
        calculatedRx = r / 2;
        calculatedRy = r / 2;
        break;
      }
      case 'Semi-circle': {
        const A = (Math.PI * Math.pow(r, 2)) / 2;
        // centroidal horizontal Axis parallel to flat base
        calculatedIx = Math.pow(r, 4) * (Math.PI / 8 - 8 / (9 * Math.PI));
        // vertical central axis of symmetry
        calculatedIy = (Math.PI * Math.pow(r, 4)) / 8;
        calculatedRx = Math.sqrt(calculatedIx / A);
        calculatedRy = Math.sqrt(calculatedIy / A);
        break;
      }
      case 'Quarter-circle': {
        const A = (Math.PI * Math.pow(r, 2)) / 4;
        // symmetric horizontal and vertical centroidal moments
        calculatedIx = Math.pow(r, 4) * (Math.PI / 16 - 4 / (9 * Math.PI));
        calculatedIy = calculatedIx;
        calculatedRx = Math.sqrt(calculatedIx / A);
        calculatedRy = Math.sqrt(calculatedIy / A);
        break;
      }
      case 'Parabolic Spandrel': {
        if (parabolicType === 'Fat') {
          const Area = (2 / 3) * w * h;
          calculatedIx = (8 / 175) * w * Math.pow(h, 3);
          calculatedIy = (19 / 480) * Math.pow(w, 3) * h;
          calculatedRx = calculatedIx > 0 ? Math.sqrt(calculatedIx / Area) : 0;
          calculatedRy = calculatedIy > 0 ? Math.sqrt(calculatedIy / Area) : 0;
        } else {
          const Area = (1 / 3) * w * h;
          calculatedIx = (1 / 21) * w * Math.pow(h, 3);
          calculatedIy = (1 / 80) * Math.pow(w, 3) * h;
          calculatedRx = calculatedIx > 0 ? Math.sqrt(calculatedIx / Area) : 0;
          calculatedRy = calculatedIy > 0 ? Math.sqrt(calculatedIy / Area) : 0;
        }
        break;
      }
      default:
        break;
    }

    setIx(Math.max(0, calculatedIx));
    setIy(Math.max(0, calculatedIy));
    setRx(Math.max(0, calculatedRx));
    setRy(Math.max(0, calculatedRy));
  }, [shape, width, height, radius, degree, parabolicType]);

  const resetAll = () => {
    setShape('Rectangle');
    setWidth('');
    setHeight('');
    setRadius('');
    setDegree(2);
    setIx(0);
    setIy(0);
    setRx(0);
    setRy(0);
    setParabolicType('Skinny');
  };

  // Wrap raw props onAddHistory to enrich moment of inertia calculations with structural inputs/outputs
  const onAddHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    onAddHistoryRaw({
      ...item,
      details: {
        shape: shape,
        width: typeof width === 'string' ? (parseFloat(width) || 0) : width,
        height: typeof height === 'string' ? (parseFloat(height) || 0) : height,
        radius: typeof radius === 'string' ? (parseFloat(radius) || 0) : radius,
        degree: typeof degree === 'string' ? (parseFloat(degree) || 0) : degree,
        parabolicType: parabolicType,
        ix: ix,
        iy: iy,
        rx: rx,
        ry: ry
      }
    });
  };

  const isMounted = useRef(false);
  const lastLoggedRef = useRef<string>('');

  const logToHistory = () => {
    let dimsString = '';
    let displayShape = shape as string;
    const numW = typeof width === 'string' ? (parseFloat(width) || 0) : width;
    const numH = typeof height === 'string' ? (parseFloat(height) || 0) : height;
    const numR = typeof radius === 'string' ? (parseFloat(radius) || 0) : radius;

    if (shape === 'Rectangle' || shape === 'Triangle') {
      dimsString = `w=${numW.toFixed(1)}, h=${numH.toFixed(1)}`;
    } else if (shape === 'Circle' || shape === 'Semi-circle' || shape === 'Quarter-circle') {
      dimsString = `r=${numR.toFixed(1)}`;
    } else {
      dimsString = `w=${numW.toFixed(1)}, h=${numH.toFixed(1)}, config=${parabolicType === 'Fat' ? 'Fat' : 'Skinny'}`;
      displayShape = parabolicType === 'Fat' ? 'Parabolic Segment (Fat)' : 'Parabolic Spandrel (Skinny)';
    }

    onAddHistory({
      type: 'MOI',
      expression: `Moment of Inertia: ${displayShape} (${dimsString})`,
      result: `Ix: ${ix.toFixed(2)}, Iy: ${iy.toFixed(2)}, rx: ${rx.toFixed(2)}, ry: ${ry.toFixed(2)}`
    });
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      lastLoggedRef.current = JSON.stringify({ shape, width, height, radius, degree, parabolicType });
      return;
    }

    if (ix <= 0 && iy <= 0) return;

    const currentParams = JSON.stringify({ shape, width, height, radius, degree, parabolicType });
    if (currentParams === lastLoggedRef.current) return;

    const handler = setTimeout(() => {
      logToHistory();
      lastLoggedRef.current = currentParams;
    }, 800);

    return () => {
      clearTimeout(handler);
    };
  }, [ix, iy, shape, width, height, radius, degree, parabolicType]);

  const getDimensionInputs = () => {
    switch (shape) {
      case 'Rectangle':
      case 'Triangle':
        return (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">Width (b)</label>
              <input
                id="input-width-moi"
                type="text"
                inputMode="decimal"
                value={width}
                placeholder="0"
                onFocus={(e) => {
                  if (width === 0 || width === '0') {
                    setWidth('');
                  } else {
                    e.target.select();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                    setWidth(val);
                  }
                }}
                className={`w-full py-2 px-3 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-750/85' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300'
                }`}
              />
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={width || 1}
                onChange={(e) => setWidth(parseFloat(e.target.value))}
                className="w-full mt-1.5 accent-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">Height (h)</label>
              <input
                id="input-height-moi"
                type="text"
                inputMode="decimal"
                value={height}
                placeholder="0"
                onFocus={(e) => {
                  if (height === 0 || height === '0') {
                    setHeight('');
                  } else {
                    e.target.select();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                    setHeight(val);
                  }
                }}
                className={`w-full py-2 px-3 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-750/85' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300'
                }`}
              />
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={height || 1}
                onChange={(e) => setHeight(parseFloat(e.target.value))}
                className="w-full mt-1.5 accent-amber-500"
              />
            </div>
          </div>
        );
      case 'Circle':
      case 'Semi-circle':
      case 'Quarter-circle':
        return (
          <div className="grid grid-cols-1 gap-3 mt-2">
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">Radius (R)</label>
              <input
                id="input-radius-moi"
                type="text"
                inputMode="decimal"
                value={radius}
                placeholder="0"
                onFocus={(e) => {
                  if (radius === 0 || radius === '0') {
                    setRadius('');
                  } else {
                    e.target.select();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                    setRadius(val);
                  }
                }}
                className={`w-full py-2 px-3 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-750/85' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300'
                }`}
              />
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={radius || 1}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-full mt-1.5 accent-amber-500"
              />
            </div>
          </div>
        );
      case 'Parabolic Spandrel':
        return (
          <div className="flex flex-col space-y-3 mt-1 w-full">
            {/* Parabolic configuration switch */}
            <div className="flex flex-col">
              <span className="font-semibold text-[9px] uppercase text-neutral-400 tracking-wider mb-1.5 block">Parabolic Shape Configuration</span>
              <div className={`p-1 rounded-xl flex space-x-1 ${
                isDarkMode ? 'bg-neutral-950/60' : 'bg-slate-200/50'
              }`}>
                <button
                  id="btn-parabolic-segment-moi"
                  type="button"
                  onClick={() => {
                    if (triggerFeedback) triggerFeedback();
                    setParabolicType('Fat');
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold text-[10px] uppercase transition-all whitespace-nowrap cursor-pointer ${
                    parabolicType === 'Fat'
                      ? 'bg-amber-500 text-neutral-950 shadow-sm font-black'
                      : (isDarkMode ? 'text-neutral-450 hover:text-white hover:bg-neutral-900/40' : 'text-slate-650 hover:text-slate-800 hover:bg-white/40')
                  }`}
                >
                  Fat Parabola (Segment)
                </button>
                <button
                  id="btn-parabolic-spandrel-moi"
                  type="button"
                  onClick={() => {
                    if (triggerFeedback) triggerFeedback();
                    setParabolicType('Skinny');
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold text-[10px] uppercase transition-all whitespace-nowrap cursor-pointer ${
                    parabolicType === 'Skinny'
                      ? 'bg-amber-500 text-neutral-950 shadow-sm font-black'
                      : (isDarkMode ? 'text-neutral-450 hover:text-white hover:bg-neutral-900/40' : 'text-slate-650 hover:text-slate-800 hover:bg-white/40')
                  }`}
                >
                  Skinny Parabola (Spandrel)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">Width (b)</label>
                <input
                  id="spandrel-width-moi"
                  type="text"
                  inputMode="decimal"
                  value={width}
                  placeholder="0"
                  onFocus={(e) => {
                    if (width === 0 || width === '0') {
                      setWidth('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setWidth(val);
                    }
                  }}
                  className={`w-full py-2 px-3 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-750/85' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300'
                  }`}
                />
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="0.5"
                  value={width || 1}
                  onChange={(e) => setWidth(parseFloat(e.target.value))}
                  className="w-full mt-1.5 accent-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">Height (h)</label>
                <input
                  id="spandrel-height-moi"
                  type="text"
                  inputMode="decimal"
                  value={height}
                  placeholder="0"
                  onFocus={(e) => {
                    if (height === 0 || height === '0') {
                      setHeight('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setHeight(val);
                    }
                  }}
                  className={`w-full py-2 px-3 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-750/85' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300'
                  }`}
                />
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="0.5"
                  value={height || 1}
                  onChange={(e) => setHeight(parseFloat(e.target.value))}
                  className="w-full mt-1.5 accent-amber-500"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto pr-1 select-none text-xs">
      <div id="moi-panel" className="space-y-4 pb-4">

        {/* Shape selector menu */}
        <div className="flex flex-col">
          <span className="font-bold text-[10px] uppercase text-neutral-400 tracking-wider mb-2">Select Shape Profile</span>
          <div 
            id="shape-horizontal-selector-moi" 
            className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap"
          >
            {shapes.map((s) => (
              <button
                key={s}
                id={`btn-shape-moi-${s.replace(/ /g, '-')}`}
                onClick={() => { if (triggerFeedback) triggerFeedback(); setShape(s); }}
                className={`flex-none px-3 py-2 rounded-lg font-bold text-[10px] shadow-sm uppercase transition-all ${
                  shape === s
                    ? 'bg-amber-500 text-neutral-900 font-black'
                    : (isDarkMode ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions inputs wrapper */}
        <div className={`p-3 rounded-xl border shadow-sm ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-neutral-400">Dimensions Input</span>
            <div className="flex items-center space-x-3">
              <button
                id="btn-moi-reset"
                type="button"
                onClick={() => { if (triggerFeedback) triggerFeedback(); resetAll(); }}
                className="text-[10px] text-rose-500 font-semibold uppercase hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {getDimensionInputs()}
        </div>

        {/* Four parallel computed parameters */}
        {(ix > 0 || iy > 0) && (
          <div id="moi-results-card" className={`p-4 rounded-xl border relative overflow-hidden ${
            isDarkMode ? 'bg-neutral-900/90 border-emerald-500/30' : 'bg-emerald-50 border-emerald-500/20'
          }`}>
            <h4 className="font-black text-emerald-500/90 text-[10px] uppercase font-mono mb-2 tracking-wider">
              ✓ Second Moment of Inertia Properties
            </h4>

            <div className="grid grid-cols-2 gap-2 text-center" id="moi-calculated-numbers-grid">
              <div className={`p-2 rounded-lg border shadow-sm ${isDarkMode ? 'bg-black/20 border-neutral-800' : 'bg-white border-slate-100'}`}>
                <span className="text-[9px] text-neutral-400 uppercase font-mono">Inertia X (Ix)</span>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-emerald-500 font-mono mt-0.5 truncate">{ix.toFixed(4)}</p>
              </div>
              <div className={`p-2 rounded-lg border shadow-sm ${isDarkMode ? 'bg-black/20 border-neutral-800' : 'bg-white border-slate-100'}`}>
                <span className="text-[9px] text-neutral-400 uppercase font-mono">Inertia Y (Iy)</span>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-emerald-500 font-mono mt-0.5 truncate">{iy.toFixed(4)}</p>
              </div>
              <div className={`p-2 rounded-lg border shadow-sm ${isDarkMode ? 'bg-black/20 border-neutral-800' : 'bg-white border-slate-100'}`}>
                <span className="text-[9px] text-neutral-400 uppercase font-mono">Gyration X (rx)</span>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-emerald-500 font-mono mt-0.5 truncate">{rx.toFixed(4)}</p>
              </div>
              <div className={`p-2 rounded-lg border shadow-sm ${isDarkMode ? 'bg-black/20 border-neutral-800' : 'bg-white border-slate-100'}`}>
                <span className="text-[9px] text-neutral-400 uppercase font-mono">Gyration Y (ry)</span>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-emerald-500 font-mono mt-0.5 truncate">{ry.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Strict Specification text labeled explicitly at bottom */}
        <div id="moi-footer-text" className="text-center py-2 opacity-60">
        </div>

      </div>
    </div>
  );
}
