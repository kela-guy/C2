import type { ReactNode } from 'react';
import { type MarkerStyle, hexToRgba, headingToCompass } from './mapMarkerStates';

export interface MapMarkerProps {
  icon: ReactNode;
  surfaceSize?: number;
  ringSize?: number;
  style: MarkerStyle;
  heading?: number;
  showBadge?: boolean;
  badgeSize?: number;
  badgeFill?: string;
  badgeOpacity?: number;
  label?: string;
  showLabel?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  className?: string;
}

export function MapMarker({
  icon,
  surfaceSize = 42,
  ringSize: ringSizeProp,
  style: s,
  heading,
  showBadge = false,
  badgeSize = 16,
  badgeFill = '#0a0a0a',
  badgeOpacity = 0.85,
  label,
  showLabel = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  className,
}: MapMarkerProps) {
  const ringSize = ringSizeProp ?? surfaceSize;
  const outerSize = Math.max(surfaceSize, ringSize);
  const compassLetter = heading != null ? headingToCompass(heading) : null;
  const borderColor = hexToRgba(s.ringColor, s.ringOpacity);

  return (
    <div className={`relative inline-flex flex-col items-center ${className ?? ''}`}>
      <div
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: outerSize,
          height: outerSize,
          transform: `scale(${s.markerScale})`,
          transition: 'transform 200ms ease',
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {/* Layer 1 (bottom): Surface */}
        <div
          className="absolute rounded-full"
          style={{
            width: surfaceSize,
            height: surfaceSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: hexToRgba(s.surfaceFill, s.surfaceOpacity),
            backdropFilter: s.surfaceBlur > 0 ? `blur(${s.surfaceBlur}px)` : undefined,
            WebkitBackdropFilter: s.surfaceBlur > 0 ? `blur(${s.surfaceBlur}px)` : undefined,
          }}
        />

        {/* Layer 2 (middle): Glyph */}
        <div
          className="relative flex items-center justify-center z-[1]"
          style={{
            opacity: s.glyphOpacity,
            transition: 'opacity 200ms ease',
          }}
        >
          {icon}
        </div>

        {/* Inner glow circle — on top of glyph */}
        {s.innerGlow && (
          <div
            className="absolute rounded-full pointer-events-none z-[1]"
            style={{
              width: ringSize * 0.78,
              height: ringSize * 0.78,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: `rgba(255,255,255,${s.innerGlowOpacity})`,
            }}
          />
        )}

        {/* Layer 3 (top): Ring */}
        {s.ringWidth > 0 && (
          <div
            className={`absolute rounded-full pointer-events-none z-[2] ${s.ringPulse ? 'animate-pulse' : ''}`}
            style={{
              width: ringSize,
              height: ringSize,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: `${s.ringWidth}px ${s.ringDash === 'dashed' ? 'dashed' : 'solid'} ${borderColor}`,
              transition: 'border-color 200ms ease, border-width 200ms ease',
            }}
          />
        )}

        {/* Badge (Compass) */}
        {showBadge && compassLetter && (() => {
          const angle = Math.PI / 4;
          const dist = ringSize / 2 + badgeSize / 2;
          const cx = outerSize / 2 + Math.cos(angle) * dist;
          const cy = outerSize / 2 + Math.sin(angle) * dist;
          const fontSize = Math.max(6, Math.round(badgeSize * 0.5));
          return (
            <div
              className="absolute flex items-center justify-center rounded-full pointer-events-none z-[3]"
              style={{
                width: badgeSize,
                height: badgeSize,
                left: cx - badgeSize / 2,
                top: cy - badgeSize / 2,
                background: hexToRgba(badgeFill, badgeOpacity),
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0px 0px 0px 1px rgba(0,0,0,1)',
              }}
            >
              <span
                className="font-bold text-white/80 leading-none select-none"
                style={{ fontSize }}
              >
                {compassLetter}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Label/Tooltip — floats top-right of the marker */}
      {showLabel && label && (
        <div
          className="absolute whitespace-nowrap pointer-events-none"
          style={{
            left: outerSize / 2 + 6,
            bottom: outerSize / 2 + 2,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 4,
            padding: '3px 8px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-[11px] font-medium text-white/80">{label}</span>
        </div>
      )}
    </div>
  );
}
