/**
 * CesiumErrorBoundary — defense-in-depth fallback for the Cesium map subtree.
 *
 * If the underlying viewer fails to mount, we'd rather show a small overlay
 * (and let the rest of the dashboard keep running) than crash the entire app.
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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-1 text-slate-12">
          <div className="max-w-md rounded-md bg-red-500/10 px-4 py-3 text-sm shadow-[0_0_0_1px_var(--border-subtle)]">
            <div className="mb-1 text-sm font-semibold text-red-300">
              Cesium failed to mount
            </div>
            <div className="mb-3 text-xs text-slate-11">
              The Cesium map hit a runtime error. The rest of the dashboard
              keeps running — reload the page to retry.
            </div>
            <pre className="mb-3 max-h-40 overflow-auto rounded bg-black/40 p-2 text-xs leading-snug text-red-200">
              {message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.14]"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
