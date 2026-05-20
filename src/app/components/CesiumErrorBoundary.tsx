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
        <div className="absolute inset-0 flex items-center justify-center bg-surface-1 text-slate-12">
          <div className="max-w-md rounded-md bg-accent-danger-tint px-4 py-3 text-sm shadow-[0_0_0_1px_var(--border-default)]">
            <div className="mb-1 text-[13px] font-semibold text-accent-danger">
              Cesium failed to mount
            </div>
            <div className="mb-3 text-[12px] text-slate-11">
              The Cesium parity backend hit a runtime error. The Mapbox dashboard
              still works — switch back via the link below.
            </div>
            <pre className="mb-3 max-h-40 overflow-auto rounded bg-black/40 p-2 text-[11px] leading-snug text-accent-danger">
              {message}
            </pre>
            <a
              href="?map=mapbox"
              className="inline-flex items-center rounded-md bg-state-pressed px-3 py-1.5 text-[12px] font-medium text-slate-12 hover:bg-state-selected"
            >
              Reload with Mapbox
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
