import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ZoomPandableContainerProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  cols: number;
  isZoomLocked?: boolean;
}

export default function ZoomPandableContainer({ children, isDarkMode, cols, isZoomLocked = false }: ZoomPandableContainerProps) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);

  const getClampedPan = (x: number, y: number, currentScale: number) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    
    const content = contentWrapperRef.current;
    if (!content) return { x, y };

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;
    
    const visualWidth = contentWidth * currentScale;
    const visualHeight = contentHeight * currentScale;
    
    const maxPanX = Math.max(0, (visualWidth - cWidth) / 2);
    const maxPanY = Math.max(0, (visualHeight - cHeight) / 2);
    
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y))
    };
  };

  // Auto scale down if columns are very large to fit them initially!
  useEffect(() => {
    if (cols >= 8) {
      setScale(0.6);
    } else if (cols >= 6) {
      setScale(0.75);
    } else {
      setScale(0.95);
    }
    setPan({ x: 0, y: 0 });
  }, [cols]);

  // Touch Events for pinch-zoom & pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomLocked) return;
    if (e.touches.length === 1) {
      // Single finger drag/pan
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinchDist.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isZoomLocked) return;
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const desiredX = touch.clientX - dragStart.current.x;
      const desiredY = touch.clientY - dragStart.current.y;
      const clamped = getClampedPan(desiredX, desiredY, scale);
      
      if (clamped.x !== desiredX) {
        dragStart.current.x = touch.clientX - clamped.x;
      }
      if (clamped.y !== desiredY) {
        dragStart.current.y = touch.clientY - clamped.y;
      }
      
      setPan(clamped);
    } else if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / initialPinchDist.current;
      setScale(prev => {
        const nextScale = Math.max(0.35, Math.min(2.5, prev * factor));
        setPan(prevPan => getClampedPan(prevPan.x, prevPan.y, nextScale));
        return nextScale;
      });
      initialPinchDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    if (isZoomLocked) return;
    setIsDragging(false);
    initialPinchDist.current = null;
  };

  // Mouse Drag Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomLocked) return;
    if (e.button !== 0) return; // Only left click drag
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isZoomLocked) return;
    if (!isDragging) return;
    const desiredX = e.clientX - dragStart.current.x;
    const desiredY = e.clientY - dragStart.current.y;
    const clamped = getClampedPan(desiredX, desiredY, scale);
    
    if (clamped.x !== desiredX) {
      dragStart.current.x = e.clientX - clamped.x;
    }
    if (clamped.y !== desiredY) {
      dragStart.current.y = e.clientY - clamped.y;
    }
    
    setPan(clamped);
  };

  const handleMouseUp = () => {
    if (isZoomLocked) return;
    setIsDragging(false);
  };

  const zoomIn = () => setScale(prev => {
    const nextScale = Math.min(2.5, prev + 0.15);
    setPan(prevPan => getClampedPan(prevPan.x, prevPan.y, nextScale));
    return nextScale;
  });
  const zoomOut = () => setScale(prev => {
    const nextScale = Math.max(0.35, prev - 0.15);
    setPan(prevPan => getClampedPan(prevPan.x, prevPan.y, nextScale));
    return nextScale;
  });
  const resetZoom = () => {
    setScale(cols >= 8 ? 0.6 : cols >= 6 ? 0.75 : 0.95);
    setPan({ x: 0, y: 0 });
  };

  const cellWidth = cols >= 7 ? 22 : cols >= 5 ? 32 : 44;
  const contentContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: `${cols * cellWidth + 24}px`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border select-none transition-colors border-dashed h-48 md:h-[210px] ${
        isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'
      }`}
      style={{ touchAction: isZoomLocked ? 'auto' : 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom and Pan Controls Overlaid */}
      {!isZoomLocked ? (
        <div className={`absolute right-1.5 top-1.5 z-30 flex items-center backdrop-blur-md px-1.5 py-0.5 rounded-lg gap-1.5 select-none border transition-colors ${
          isDarkMode 
            ? 'bg-black/75 text-white border-white/10' 
            : 'bg-white/90 text-slate-800 border-slate-200 shadow-sm'
        }`}>
          <button 
            type="button"
            onClick={zoomOut}
            title="Zoom Out"
            className="p-1 hover:text-amber-500 hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer"
          >
            <ZoomOut size={12} />
          </button>
          <button 
            type="button" 
            onClick={resetZoom}
            title="Reset Zoom"
            className={`text-[8px] font-mono tracking-tighter px-1 py-0.5 rounded font-bold hover:text-amber-500 cursor-pointer ${
              isDarkMode ? 'bg-white/15' : 'bg-slate-100'
            }`}
          >
            {Math.round(scale * 100)}%
          </button>
          <button 
            type="button"
            onClick={zoomIn}
            title="Zoom In"
            className="p-1 hover:text-amber-500 hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer"
          >
            <ZoomIn size={12} />
          </button>
        </div>
      ) : (
        <div className={`absolute right-1.5 top-1.5 z-30 flex items-center backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-bold select-none uppercase tracking-wider font-mono border transition-colors ${
          isDarkMode 
            ? 'bg-neutral-950/80 text-neutral-400 border-neutral-800' 
            : 'bg-white/90 text-slate-500 border-slate-200 shadow-sm'
        }`}>
          🔒 Locked
        </div>
      )}

      <div className="absolute left-1.5 top-1.5 z-30 pointer-events-none flex items-center gap-1 opacity-45 select-none">
        <Move size={10} className={isDarkMode ? 'text-white' : 'text-slate-800'} />
        <span className="text-[7.5px] font-mono font-extrabold uppercase">
          {isZoomLocked ? 'Zoom Locked' : 'Grip/Zoom Grid'}
        </span>
      </div>

      {/* Content wrapper subjected to transform */}
      <div 
        className="w-full h-full flex items-center justify-center p-2"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          cursor: isZoomLocked ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          transition: isDragging ? 'none' : 'transform 0.08s ease-out',
        }}
      >
        <div 
          ref={contentWrapperRef}
          style={contentContainerStyle}
          className="mx-auto select-none"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
