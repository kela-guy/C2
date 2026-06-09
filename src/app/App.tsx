import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/dashboard/Dashboard";
import { NotificationSystem } from "./components/NotificationSystem";
import { StagingBadge } from "./components/StagingBadge";
import { TooltipProvider } from "./components/ui/tooltip";
import { DirectionProvider } from "@/lib/direction";

const StyleguidePage = lazy(() => import("./components/StyleguidePage"));
const DocsApp = lazy(() => import("@/docs/DocsApp"));

const CardDesignSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/card-sandbox/CardDesignSandbox"))
  : null;

const VideoHudSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/video-hud-sandbox/VideoHudSandbox"))
  : null;

const ThemeSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/theme-sandbox/ThemeSandbox"))
  : null;

const OrbSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/orb-sandbox/OrbSandbox"))
  : null;

const MapSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/map-sandbox/MapSandbox"))
  : null;

export default function App() {
  return (
    <DirectionProvider>
      <DndProvider backend={HTML5Backend}>
        <TooltipProvider delayDuration={0}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/styleguide"
                element={
                  <Suspense fallback={null}>
                    <StyleguidePage />
                  </Suspense>
                }
              />
              <Route
                path="/docs/*"
                element={
                  <Suspense fallback={null}>
                    <DocsApp />
                  </Suspense>
                }
              />
              <Route path="/demo" element={<Dashboard demoMode />} />
              {CardDesignSandbox && (
                <Route
                  path="/card-sandbox"
                  element={
                    <Suspense fallback={null}>
                      <CardDesignSandbox />
                    </Suspense>
                  }
                />
              )}
              {VideoHudSandbox && (
                <Route
                  path="/video-hud-sandbox"
                  element={
                    <Suspense fallback={null}>
                      <VideoHudSandbox />
                    </Suspense>
                  }
                />
              )}
              {ThemeSandbox && (
                <Route
                  path="/theme-sandbox"
                  element={
                    <Suspense fallback={null}>
                      <ThemeSandbox />
                    </Suspense>
                  }
                />
              )}
              {OrbSandbox && (
                <Route
                  path="/orb-sandbox"
                  element={
                    <Suspense fallback={null}>
                      <OrbSandbox />
                    </Suspense>
                  }
                />
              )}
              {MapSandbox && (
                <Route
                  path="/map-sandbox"
                  element={
                    <Suspense fallback={null}>
                      <MapSandbox />
                    </Suspense>
                  }
                />
              )}
            </Routes>
          </BrowserRouter>
          <NotificationSystem />
          <DialRoot position="bottom-right" />
          <StagingBadge />
        </TooltipProvider>
      </DndProvider>
    </DirectionProvider>
  );
}
