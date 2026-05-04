/**
 * CesiumErrorBoundary — defense-in-depth fallback for the Cesium map subtree.
 *
 * The Cesium parity migration is in progress; if the underlying viewer fails
 * to mount, we'd rather show a small overlay (and let the rest of the
 * dashboard keep running) than crash the entire app.
 *
 * Wraps `<CesiumTacticalMap>` only — Mapbox renders without this boundary so
 * its error semantics are unchanged.
 */

import React from 'react';

interface CesiumErrorBoundaryProps {
  children: React.ReactNode;
}

interface CesiumErrorBoundaryState {
  error: Error | null;
}

export class CesiumErrorBoundary extends React.Component<
  CesiumErrorBoundaryProps,
  CesiumErrorBoundaryState
> {
  state: CesiumErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): CesiumErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the actual error + component stack so the team can debug.
    // React's default boundary message hides the underlying exception.
    console.error('[CesiumErrorBoundary] Cesium subtree crashed:', error);
    console.error('[CesiumErrorBoundary] componentStack:', info.componentStack);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error.message || String(this.state.error);
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-100">
          <div className="max-w-md rounded-md bg-red-500/10 px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="mb-1 text-[13px] font-semibold text-red-300">
              Cesium failed to mount
            </div>
            <div className="mb-3 text-[12px] text-zinc-300">
              The map viewer hit a runtime error. Reload the page to retry.
            </div>
            <pre className="mb-3 max-h-40 overflow-auto rounded bg-black/40 p-2 text-[11px] leading-snug text-red-200">
              {message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/[0.14]"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
