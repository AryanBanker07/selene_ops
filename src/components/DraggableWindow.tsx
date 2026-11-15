import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, GripVertical, Minus, X } from 'lucide-react';

export interface WindowPosition {
  x: number;
  y: number;
}

interface DraggableWindowProps {
  id: string;
  title: React.ReactNode;
  headerActions?: React.ReactNode;
  defaultPos: WindowPosition;
  pos?: WindowPosition;
  onPositionChange: (id: string, pos: WindowPosition) => void;
  onResetPosition?: (id: string) => void;
  onClose: () => void;
  onFocus: () => void;
  zIndex: number;
  widthClass?: string;
  maxHeightClass?: string;
  children: React.ReactNode;
}

function clampPosition(pos: WindowPosition): WindowPosition {
  if (typeof window === 'undefined') return pos;
  const maxX = Math.max(12, window.innerWidth - 180);
  const maxY = Math.max(52, window.innerHeight - 52);
  return {
    x: Math.round(Math.min(maxX, Math.max(8, pos.x))),
    y: Math.round(Math.min(maxY, Math.max(48, pos.y))),
  };
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  id,
  title,
  headerActions,
  defaultPos,
  pos,
  onPositionChange,
  onResetPosition,
  onClose,
  onFocus,
  zIndex,
  widthClass = 'w-[372px] max-w-[calc(100vw-24px)]',
  maxHeightClass = 'max-h-[calc(100vh-135px)]',
  children,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [, setViewportTick] = useState<number>(0);

  const onPosChangeRef = useRef(onPositionChange);
  onPosChangeRef.current = onPositionChange;

  const dragOriginRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startWinX: number;
    startWinY: number;
  } | null>(null);

  const resolvedPos = clampPosition(pos ?? defaultPos);

  useEffect(() => {
    const onResize = () => setViewportTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragOriginRef.current) return;
      const dx = e.clientX - dragOriginRef.current.startMouseX;
      const dy = e.clientY - dragOriginRef.current.startMouseY;
      onPosChangeRef.current(
        id,
        clampPosition({
          x: dragOriginRef.current.startWinX + dx,
          y: dragOriginRef.current.startWinY + dy,
        })
      );
    };

    const handlePointerUp = () => {
      dragOriginRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [id, isDragging]);

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onFocus();
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a, [data-no-drag="true"]')) {
      return;
    }
    dragOriginRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startWinX: resolvedPos.x,
      startWinY: resolvedPos.y,
    };
    setIsDragging(true);
  };

  return (
    <section
      onPointerDownCapture={onFocus}
      style={{
        position: 'fixed',
        left: resolvedPos.x,
        top: resolvedPos.y,
        zIndex,
      }}
      className={`obsidian-drawer rounded-xl pointer-events-auto flex flex-col overflow-hidden shadow-2xl border ${
        isDragging ? 'border-[#E59934]/50' : 'border-white/[0.12]'
      } ${widthClass} ${isMinimized ? '' : maxHeightClass}`}
    >
      {/* Draggable Window Title Bar */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest('button, input, select, textarea, a')) return;
          onResetPosition?.(id);
        }}
        title="Drag to move window · Double-click to snap back"
        className={`px-3.5 py-2 border-b border-white/[0.08] bg-[#111318] flex items-center justify-between gap-2 select-none shrink-0 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-[#6C7280] shrink-0" />
          <div className="text-sm font-semibold text-[#ECEEF2] truncate">{title}</div>
        </div>

        <div className="flex items-center gap-1 shrink-0" data-no-drag="true">
          {headerActions}
          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
            title={isMinimized ? 'Expand window' : 'Minimize window'}
          >
            {isMinimized ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
            title="Close window (Esc closes top window)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Window Body */}
      {!isMinimized && children}
    </section>
  );
};
