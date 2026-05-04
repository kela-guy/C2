import { useState, useRef, useEffect, type ReactNode } from 'react';
import { type MarkerStyle, headingToCompass } from './markerStyles';
import { hexToRgba } from './tokens';

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
  statusBadgeText?: string;
  statusBadgeTone?: 'neutral' | 'danger';
  pulse?: boolean;
  label?: string;
  showLabel?: boolean;
  /** When set, dims all layers except the specified one (1=Surface, 2=Ring, 3=Glyph, 4=InnerGlow, 5=Overlays). */
  highlightLayer?: number | null;
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
  statusBadgeText,
  statusBadgeTone = 'neutral',
  pulse = false,
  label,
  showLabel = false,
  highlightLayer,
  onMouseEnter,
  onMouseLeave,
  onClick,
  className,
}: MapMarkerProps) {
  const ringSize = ringSizeProp ?? surfaceSize;
  const outerSize = Math.max(surfaceSize, ringSize);
  const compassLetter = heading != null ? headingToCompass(heading) : null;
  const borderColor = hexToRgba(s.ringColor, s.ringOpacity);
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef<HTMLDivElement>(null);

  const shouldPulse = hovered || pulse;
  const hl = highlightLayer ?? null;
  const layerDim = (layer: number) =>
    hl != null && hl !== layer ? 0.15 : 1;

  useEffect(() => {
    if (!shouldPulse || !pulseRef.current) return;
    const el = pulseRef.current;

    const anim = el.animate(
      [
        { opacity: 0.7, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(3)' },
      ],
      {
        duration: 1650,
        iterations: Infinity,
        easing: 'cubic-bezier(0.0, 0, 0.2, 1)',
      },
    );

    return () => anim.cancel();
  }, [shouldPulse]);

  const handleMouseEnter = () => {
    setHovered(true);
    onMouseEnter?.();
  };
  const handleMouseLeave = () => {
    setHovered(false);
    onMouseLeave?.();
  };

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
            opacity: layerDim(1),
            transition: 'opacity 300ms ease',
          }}
        />

        {/* Layer 2: Ring */}
        {s.ringWidth > 0 && (
          <div
            className={`absolute rounded-full pointer-events-none z-[1] ${s.ringPulse ? 'animate-pulse' : ''}`}
            style={{
              width: ringSize,
              height: ringSize,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: `${s.ringWidth}px ${s.ringDash === 'dashed' ? 'dashed' : 'solid'} ${borderColor}`,
              opacity: layerDim(2),
              transition: 'border-color 200ms ease, border-width 200ms ease, opacity 300ms ease',
            }}
          />
        )}

        {/* Layer 3: Inner circle (styleguide Layer 4 — Inner Glow) */}
        {(s.innerGlow || shouldPulse || hl === 4) && (
          <div
            ref={pulseRef}
            className="absolute rounded-full pointer-events-none z-[2]"
            style={{
              width: ringSize * 0.6,
              height: ringSize * 0.6,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: shouldPulse
                ? hexToRgba(s.innerGlowColor, 1)
                : hexToRgba(s.innerGlowColor, (hl === 4 && !s.innerGlow) ? 0.5 : (s.innerGlowOpacity || 0.4)),
              opacity: layerDim(4),
              transition: 'opacity 300ms ease',
            }}
          />
        )}

        {/* Layer 4 (top): Glyph (styleguide Layer 3) */}
        <div
          className="relative flex items-center justify-center z-[3]"
          style={{
            opacity: s.glyphOpacity * layerDim(3),
            transition: 'opacity 300ms ease',
          }}
        >
          {icon}
        </div>

        {/* Badge (Compass) */}
        {showBadge && compassLetter && (() => {
          const angle = Math.PI / 4;
          const dist = ringSize / 2 + badgeSize / 2;
          const cx = outerSize / 2 + Math.cos(angle) * dist;
          const cy = outerSize / 2 + Math.sin(angle) * dist;
          const fontSize = Math.max(6, Math.round(badgeSize * 0.5));
          return (
            <div
              className="absolute flex items-center justify-center rounded-full pointer-events-none z-[4]"
              style={{
                width: badgeSize,
                height: badgeSize,
                left: cx - badgeSize / 2,
                top: cy - badgeSize / 2,
                background: hexToRgba(badgeFill, badgeOpacity),
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0px 0px 0px 1px rgba(0,0,0,1)',
                opacity: layerDim(5),
                transition: 'opacity 300ms ease',
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

        {/* Badge (Status) */}
        {statusBadgeText && (
          <div
            className="absolute rounded-[4px] px-1 py-[1px] pointer-events-none z-[5]"
            style={{
              right: -2,
              bottom: -2,
              background: statusBadgeTone === 'danger' ? 'rgba(239,68,68,0.9)' : 'rgba(24,24,27,0.9)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.7)',
              opacity: layerDim(5),
              transition: 'opacity 300ms ease',
            }}
          >
            <span className="text-[9px] font-bold leading-none text-white">
              {statusBadgeText}
            </span>
          </div>
        )}
      </div>

      {/* Label/Tooltip — floats top-right of the marker */}
      {showLabel && label && (
        <div
          className="absolute whitespace-nowrap pointer-events-none"
          style={{
            left: outerSize / 2 + 6,
            bottom: outerSize / 2 + 2,
            // Slightly more opaque background so we can drop the
            // 12 px backdrop-blur — every blur radius is a per-pixel
            // gather pass over a region 4x the radius wide; at 12 px
            // with multiple labels visible at once this becomes a
            // measurable GPU cost on every map redraw. 6 px keeps the
            // glassy feel while halving the kernel.
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: 4,
            padding: '3px 8px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4)',
            opacity: layerDim(5),
            transition: 'opacity 300ms ease',
          }}
        >
          <span className="text-xs font-medium text-white">{label}</span>
        </div>
      )}
    </div>
  );
}
