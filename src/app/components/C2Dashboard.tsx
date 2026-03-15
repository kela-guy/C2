import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TacticalMap, findDetectingSensors, LAUNCHER_ASSETS, getClosestAssetsForTarget, CAMERA_ASSETS, DRONE_HIVE_ASSETS, bearingDegrees, REGULUS_EFFECTORS } from './TacticalMap';
import type { MissileLaunchRequest } from './TacticalMap';
import { NotificationSystem, showTacticalNotification } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import ListOfSystems from '@/imports/ListOfSystems';
import type { Detection, IncidentOutcome, DroneDeployment, PlannedMission, MissionWaypoint, RegulusEffector } from '@/imports/ListOfSystems';
import { List, Bell, PlayCircle, AlertTriangle, Crosshair as CrosshairIcon, MapPin, Map as MapLucide, Camera, Route, ShieldAlert, Radar, Zap, BookOpen } from 'lucide-react';
import { DroneHiveIcon as MapDroneIcon } from './TacticalMap';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';

function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function appendLog(targets: Detection[], targetId: string, label: string): Detection[] {
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return targets.map(t => t.id !== targetId ? t : {
    ...t,
    actionLog: [...(t.actionLog || []), { time, label }],
  });
}

const C2Logo = ({ className }: { className?: string }) => (
  <svg width={48} height={48} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.1483 17.565L20.7437 27.1604L20.8479 27.2601C22.623 28.9401 25.4215 28.9084 27.1603 27.1695L27.183 27.1468L36.7649 17.565L43.1679 23.968L23.9543 43.1816L4.74072 23.968L11.1437 17.565H11.1483ZM28.4373 23.3295C28.306 22.3921 27.8758 21.491 27.1558 20.7665C25.3853 18.9959 22.5188 18.9959 20.7528 20.7665C20.0328 21.4865 19.6071 22.3921 19.4713 23.3295L12.4253 16.2835L23.9543 4.75439L35.4834 16.2835L28.4373 23.3295Z"
      fill="currentColor"
    />
  </svg>
);

export const C2Dashboard = () => {
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Simulation State
  const [targets, setTargets] = useState<Detection[]>([]);
  const [pendingMissileLaunch, setPendingMissileLaunch] = useState<MissileLaunchRequest | null>(null);
  const [hoveredSensorIdFromCard, setHoveredSensorIdFromCard] = useState<string | null>(null);
  const [sensorFocusId, setSensorFocusId] = useState<string | null>(null);
  /** When user clicks שיבוש: target being jammed and the map asset (antenna) doing the jamming. Cleared on "סיום משימה". */
  const [jammingTargetId, setJammingTargetId] = useState<string | null>(null);
  const [jammingJammerAssetId, setJammingJammerAssetId] = useState<string | null>(null);
  /** After "סיום משימה" on a jamming mission: show verification choice (camera / drone / skip). */
  const [postJamVerificationTargetId, setPostJamVerificationTargetId] = useState<string | null>(null);
  /** When user chose camera or drone: active verification to show on map; cleared when map calls onJammingVerificationComplete. */
  const [jammingVerificationActive, setJammingVerificationActive] = useState<{ targetId: string; method: 'camera' | 'drone' } | null>(null);
  /** When user sends a drone to verify an attack mission before completing it. */
  const [attackVerificationTargetId, setAttackVerificationTargetId] = useState<string | null>(null);

  // CUAS: Regulus effector state
  const [regulusEffectors, setRegulusEffectors] = useState<RegulusEffector[]>(REGULUS_EFFECTORS);

  // Jam-all modal: auto-triggered when 10+ detections arrive in rapid burst
  const [showJamAllModal, setShowJamAllModal] = useState(false);
  const [burstDetectionCount, setBurstDetectionCount] = useState(0);
  const jamAllModalDismissedRef = useRef(false);
  
  // Flow simulation state
  const [flowTriggerOpen, setFlowTriggerOpen] = useState(false);
  const [flowTriggerRect, setFlowTriggerRect] = useState<{ top: number; left: number } | null>(null);
  const flowTriggerBtnRef = useRef<HTMLButtonElement>(null);

  // Mission planner state
  const [missionPlannerOpen, setMissionPlannerOpen] = useState(false);
  const [missionPlannerRect, setMissionPlannerRect] = useState<{ top: number; left: number } | null>(null);
  const missionPlannerBtnRef = useRef<HTMLButtonElement>(null);
  const [cameraLookAtRequest, setCameraLookAtRequest] = useState<{ cameraId: string; targetLat: number; targetLon: number } | null>(null);
  const [controlIndicator, setControlIndicator] = useState(false);
  const [nearbyCameras, setNearbyCameras] = useState<{ id: string; typeLabel: string; distanceM: number }[]>([]);
  const [nearbyHives, setNearbyHives] = useState<{ id: string; latitude: number; longitude: number; distanceM: number; battery: number; status: string }[]>([]);
  const [fitBoundsPoints, setFitBoundsPoints] = useState<{ lat: number; lon: number }[] | null>(null);

  // Flow 3: Drone deployment state
  const flow3IntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flow3TrailRef = useRef<[number, number][]>([]);
  const flow3PhaseRef = useRef<string>('select');
  const [flow3ActiveDrone, setFlow3ActiveDrone] = useState<{
    currentLat: number; currentLon: number;
    hiveLat: number; hiveLon: number;
    targetLat: number; targetLon: number;
    phase: string; headingDeg: number;
    trail: [number, number][];
  } | null>(null);

  const toggleFlowTrigger = useCallback(() => {
    setFlowTriggerOpen(prev => {
      if (!prev && flowTriggerBtnRef.current) {
        const r = flowTriggerBtnRef.current.getBoundingClientRect();
        const panelW = 208;
        const opensRight = r.right + panelW + 8 < window.innerWidth;
        setFlowTriggerRect({
          top: r.top,
          left: opensRight ? r.right + 8 : r.left - panelW - 8,
        });
      }
      return !prev;
    });
  }, []);

  const toggleMissionPlanner = useCallback(() => {
    setMissionPlannerOpen(prev => {
      if (!prev && missionPlannerBtnRef.current) {
        const r = missionPlannerBtnRef.current.getBoundingClientRect();
        const panelW = 260;
        const opensRight = r.right + panelW + 8 < window.innerWidth;
        setMissionPlannerRect({
          top: r.top,
          left: opensRight ? r.right + 8 : r.left - panelW - 8,
        });
      }
      return !prev;
    });
  }, []);

  // Derived State
  const activeTarget = targets.find(t => t.id === activeTargetId);

  // Sensors currently associated with suspect targets (for map highlighting)
  const highlightedSensorIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const t of targets) {
      if (t.status === 'suspicion' && t.detectedBySensors) {
        for (const s of t.detectedBySensors) {
          ids.add(s.id);
        }
      }
    }
    return Array.from(ids);
  }, [targets]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close flow trigger panel on outside click
  useEffect(() => {
    if (!flowTriggerOpen) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('[data-flow-trigger]') && !el.closest('[data-flow-panel]')) setFlowTriggerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flowTriggerOpen]);

  // Close mission planner panel on outside click
  useEffect(() => {
    if (!missionPlannerOpen) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('[data-mission-planner]') && !el.closest('[data-mission-planner-panel]')) setMissionPlannerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [missionPlannerOpen]);

  // Listen for Alerts (Legacy listeners for debug panel, integrating them)
  useEffect(() => {
    const handleCritical = () => {
       // Debug panel "Critical" button was clicked.
       // We only want to trigger visual effects (vignette), which is handled in NotificationSystem.
       // We do NOT want to change the target state here to avoid loops.
    };

    const handleSuspect = () => {
       // Debug panel "Suspect" button was clicked.
       // We do NOT want to trigger new target creation here to avoid loops.
    };

    const handleToastClick = (e: any) => {
        // e.detail contains the notification data including 'code' which is the target ID
        const targetId = e.detail?.code;
        if (targetId) {
            setActiveTargetId(targetId);
        }
    };

    const handleDetectionBurst = (e: any) => {
      const count = e.detail?.count ?? 10;
      if (!jamAllModalDismissedRef.current) {
        setBurstDetectionCount(count);
        setShowJamAllModal(true);
      }
    };

    window.addEventListener('trigger-critical-alert', handleCritical);
    window.addEventListener('trigger-suspect-alert', handleSuspect);
    window.addEventListener('toast-clicked', handleToastClick);
    window.addEventListener('detection-burst', handleDetectionBurst);
    
    return () => {
        window.removeEventListener('trigger-critical-alert', handleCritical);
        window.removeEventListener('trigger-suspect-alert', handleSuspect);
        window.removeEventListener('toast-clicked', handleToastClick);
        window.removeEventListener('detection-burst', handleDetectionBurst);
    };
  }, []);

  // --- Mission Logic: timer advances steps for intercept/surveillance; attack steps 0–2 only (3–5 from map) ---
  useEffect(() => {
      const missionInterval = setInterval(() => {
          setTargets(prev => prev.map(t => {
              if (t.missionStatus !== 'planning' && t.missionStatus !== 'executing') return t;
              const currentProgress = t.missionProgress ?? 0;
              const totalSteps = t.missionSteps?.length ?? 0;
              if (currentProgress >= totalSteps) {
                  return { ...t, missionStatus: 'waiting_confirmation' };
              }
              // Attack missions: only auto-advance steps 0–2; steps 3–5 are driven by map (onMissilePhaseChange)
              if (t.missionType === 'attack' && currentProgress >= 3) return t;
              return { ...t, missionProgress: currentProgress + 1 };
          }));
      }, 1800); // Advance step every 1.8s for pre-launch steps

      return () => clearInterval(missionInterval);
  }, []);

  // Ensure we clean up any intervals if they exist
  const simulationIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      return () => {
          if (simulationIntervalRef.current) {
              clearInterval(simulationIntervalRef.current);
          }
      };
  }, []);

  // --- Simulation Logic ---

  const handleSimulateDetection = () => {
      // Clear any existing interval to prevent overlap
      if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
      }

      // Add 4 suspect targets in a sequence
      let count = 0;
      const maxTargets = 4;
      
      simulationIntervalRef.current = setInterval(() => {
          if (count >= maxTargets) {
              if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
              return;
          }

          const idNum = Math.floor(Math.random() * 9000) + 1000;
          const newId = `SUSPECT-${Date.now()}-${idNum}`;
          
          // Random offset from center for demo
          const baseLat = 32.1000;
          const baseLon = 34.8000;
          const latOffset = (Math.random() - 0.5) * 0.04;
          const lonOffset = (Math.random() - 0.5) * 0.04;

          const lat = baseLat + latOffset;
          const lon = baseLon + lonOffset;

          // Determine which sensors see this point
          const detectingAssets = findDetectingSensors(lat, lon);

          const newTarget: Detection = {
              id: newId,
              name: "תנועה חשודה",
              type: "unknown",
              status: "suspicion",
              timestamp: new Date().toLocaleTimeString('he-IL', { hour12: false }),
              coordinates: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
              distance: `${(Math.random() * 5).toFixed(1)} ק״מ`,
              isNew: true,
              detectedBySensors: detectingAssets.map(a => ({
                id: a.id,
                typeLabel: a.typeLabel,
                latitude: a.latitude,
                longitude: a.longitude,
              })),
          };

          setTargets(prev => {
              // Ensure we don't add duplicates by checking ID (double safety)
              if (prev.some(t => t.id === newTarget.id)) return prev;
              return [newTarget, ...prev];
          });

          // Show Notification
          showTacticalNotification({
              title: "תנועה חשודה חדשה",
              message: `זוהתה תנועה חשודה בגזרה. נ״צ ${newTarget.coordinates}`,
              level: "suspect",
              code: newId
          });

          count++;
      }, 1500); // Add one every 1.5 seconds
  };

  // --- Flow 1: Alert → Investigate → Validate → Act ---
  const handleFlow1 = () => {
    setFlowTriggerOpen(false);
    setControlIndicator(false);
    setCameraLookAtRequest(null);

    // Pick a location near a camera for a realistic scenario
    const cam = CAMERA_ASSETS[Math.floor(Math.random() * CAMERA_ASSETS.length)];
    const lat = cam.latitude + (Math.random() - 0.5) * 0.008;
    const lon = cam.longitude + (Math.random() - 0.5) * 0.008;

    const idNum = Math.floor(Math.random() * 9000) + 1000;
    const newId = `FLOW1-${Date.now()}-${idNum}`;

    const detectingAssets = findDetectingSensors(lat, lon);

    const camerasNearby = CAMERA_ASSETS.map(c => ({
      id: c.id,
      typeLabel: c.typeLabel,
      distanceM: haversineDistanceM(lat, lon, c.latitude, c.longitude),
    })).sort((a, b) => a.distanceM - b.distanceM);
    setNearbyCameras(camerasNearby);

    const newTarget: Detection = {
      id: newId,
      name: "תח״ש — מכ״ם",
      type: "unknown",
      status: "suspicion",
      timestamp: new Date().toLocaleTimeString('he-IL', { hour12: false }),
      coordinates: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      distance: `${(haversineDistanceM(lat, lon, cam.latitude, cam.longitude) / 1000).toFixed(1)} ק״מ`,
      isNew: true,
      flowPhase: 'trigger',
      flowType: 1,
      detectedBySensors: detectingAssets.map(a => ({
        id: a.id, typeLabel: a.typeLabel, latitude: a.latitude, longitude: a.longitude,
      })),
    };

    setTargets(prev => [newTarget, ...prev]);
    setActiveTargetId(prev => prev !== null ? prev : newId);
    if (!activeTargetId) setSidebarOpen(true);

    // Zoom to show target + nearby detecting sensors + nearby cameras (max 15km from threat)
    const MAX_ZOOM_DIST_M = 15000;
    const zoomPoints: { lat: number; lon: number }[] = [{ lat, lon }];
    detectingAssets.forEach(a => {
      if (haversineDistanceM(lat, lon, a.latitude, a.longitude) <= MAX_ZOOM_DIST_M) {
        zoomPoints.push({ lat: a.latitude, lon: a.longitude });
      }
    });
    camerasNearby.filter(c => c.distanceM <= MAX_ZOOM_DIST_M).slice(0, 3).forEach(c => {
      const cam = CAMERA_ASSETS.find(x => x.id === c.id);
      if (cam) zoomPoints.push({ lat: cam.latitude, lon: cam.longitude });
    });
    setFitBoundsPoints(zoomPoints);

    // Action log
    setTargets(prev => appendLog(prev, newId, 'תח״ש — מכ״ם — זיהוי ראשוני'));

    // Alert sound (Web Audio API tactical beep)
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}

    showTacticalNotification({
      title: "תח״ש — מכ״ם חדש",
      message: `זוהתה תנועה חשודה בגזרה. נ״צ ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      level: "critical",
      code: newId,
    });

    // Phase: trigger → orient (after 1.5s)
    setTimeout(() => {
      setTargets(prev => prev.map(t =>
        t.id === newId ? { ...t, flowPhase: 'orient' } : t
      ));
      setTargets(prev => appendLog(prev, newId, 'הפניית חיישנים לאזור'));
      setFitBoundsPoints(null);

      const nearest = camerasNearby[0];
      if (nearest) {
        setCameraLookAtRequest({ cameraId: nearest.id, targetLat: lat, targetLon: lon });
        setTargets(prev => appendLog(prev, newId, `מצלמה ${nearest.id} מופנית ליעד`));
      }

      setTimeout(() => {
        setTargets(prev => prev.map(t =>
          t.id === newId ? { ...t, flowPhase: 'investigate' } : t
        ));
        setTargets(prev => appendLog(prev, newId, 'חקירה פעילה'));
      }, 3000);
    }, 1500);
  };

  // --- Flow 2: Manual Tracking & Continuous Control ---
  const flow2IntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFlow2 = () => {
    setFlowTriggerOpen(false);
    setControlIndicator(false);
    setCameraLookAtRequest(null);
    if (flow2IntervalRef.current) clearInterval(flow2IntervalRef.current);

    const cam = CAMERA_ASSETS[0];
    const startLat = cam.latitude + (Math.random() - 0.5) * 0.004;
    const startLon = cam.longitude + (Math.random() - 0.5) * 0.004;
    const bearing = Math.random() * 360;
    const speedDegPerTick = 0.00003;

    const idNum = Math.floor(Math.random() * 9000) + 1000;
    const newId = `FLOW2-${Date.now()}-${idNum}`;

    const detectingAssets = findDetectingSensors(startLat, startLon);
    const camerasNearby = CAMERA_ASSETS.map(c => ({
      id: c.id, typeLabel: c.typeLabel,
      distanceM: haversineDistanceM(startLat, startLon, c.latitude, c.longitude),
    })).sort((a, b) => a.distanceM - b.distanceM);
    setNearbyCameras(camerasNearby);

    const newTarget: Detection = {
      id: newId,
      name: "תח״ש — תצפיתן",
      type: "unknown",
      status: "suspicion",
      timestamp: new Date().toLocaleTimeString('he-IL', { hour12: false }),
      coordinates: `${startLat.toFixed(4)}, ${startLon.toFixed(4)}`,
      distance: `${(haversineDistanceM(startLat, startLon, cam.latitude, cam.longitude) / 1000).toFixed(1)} ק״מ`,
      isNew: true,
      flowPhase: 'trigger',
      flowType: 2,
      detectedBySensors: detectingAssets.map(a => ({
        id: a.id, typeLabel: a.typeLabel, latitude: a.latitude, longitude: a.longitude,
      })),
    };

    setTargets(prev => [newTarget, ...prev]);
    setActiveTargetId(prev => prev !== null ? prev : newId);
    if (!activeTargetId) setSidebarOpen(true);

    // Zoom to show target + nearby detecting sensors + nearby cameras (max 15km from threat)
    const MAX_ZOOM_DIST_M2 = 15000;
    const zoomPoints2: { lat: number; lon: number }[] = [{ lat: startLat, lon: startLon }];
    detectingAssets.forEach(a => {
      if (haversineDistanceM(startLat, startLon, a.latitude, a.longitude) <= MAX_ZOOM_DIST_M2) {
        zoomPoints2.push({ lat: a.latitude, lon: a.longitude });
      }
    });
    camerasNearby.filter(c => c.distanceM <= MAX_ZOOM_DIST_M2).slice(0, 3).forEach(c => {
      const cam = CAMERA_ASSETS.find(x => x.id === c.id);
      if (cam) zoomPoints2.push({ lat: cam.latitude, lon: cam.longitude });
    });
    setFitBoundsPoints(zoomPoints2);

    setTargets(prev => appendLog(prev, newId, 'תח״ש — תצפיתן — תנועה חשודה'));

    showTacticalNotification({
      title: "תח״ש — תצפיתן",
      message: `תנועה חשודה דווחה באזור. נ״צ ${startLat.toFixed(4)}, ${startLon.toFixed(4)}`,
      level: "suspect",
      code: newId,
    });

    // After 1.5s → tracking phase, target starts moving
    setTimeout(() => {
      setTargets(prev => prev.map(t =>
        t.id === newId ? { ...t, flowPhase: 'investigate' } : t
      ));
      setTargets(prev => appendLog(prev, newId, 'מעקב ידני פעיל'));
      setFitBoundsPoints(null);

      const nearest = camerasNearby[0];
      if (nearest) {
        setCameraLookAtRequest({ cameraId: nearest.id, targetLat: startLat, targetLon: startLon });
        setTargets(prev => appendLog(prev, newId, `מצלמה ${nearest.id} — מעקב`));
      }

      let tick = 0;
      const radBearing = (bearing * Math.PI) / 180;
      flow2IntervalRef.current = setInterval(() => {
        tick++;
        const wobble = Math.sin(tick * 0.15) * 0.00002;
        const lat = startLat + Math.cos(radBearing) * speedDegPerTick * tick + wobble;
        const lon = startLon + Math.sin(radBearing) * speedDegPerTick * tick;
        const coordStr = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        setTargets(prev => {
          const t = prev.find(x => x.id === newId);
          if (!t || t.status === 'expired' || t.status === 'event_resolved') {
            if (flow2IntervalRef.current) clearInterval(flow2IntervalRef.current);
            return prev;
          }
          return prev.map(x => x.id === newId ? { ...x, coordinates: coordStr } : x);
        });

        if (nearest) {
          setCameraLookAtRequest({ cameraId: nearest.id, targetLat: lat, targetLon: lon });
        }
      }, 300);
    }, 1500);
  };

  useEffect(() => {
    return () => { if (flow2IntervalRef.current) clearInterval(flow2IntervalRef.current); };
  }, []);

  useEffect(() => {
    return () => { if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current); };
  }, []);

  // ─── Flow 3: Drone Deployment ───

  const handleFlow3 = () => {
    setFlowTriggerOpen(false);
    if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current);
    setFlow3ActiveDrone(null);
    flow3TrailRef.current = [];

    const targetLat = 31.85 + (Math.random() - 0.5) * 0.1;
    const targetLon = 34.78 + (Math.random() - 0.5) * 0.15;
    const newId = `FLOW3-${Date.now()}`;

    const hivesWithDist = DRONE_HIVE_ASSETS.map(h => ({
      ...h, distanceM: haversineDistanceM(targetLat, targetLon, h.latitude, h.longitude),
    })).sort((a, b) => a.distanceM - b.distanceM);

    const nearbyHives = hivesWithDist.map(h => ({
      id: h.id, typeLabel: h.typeLabel, distanceM: h.distanceM,
      latitude: h.latitude, longitude: h.longitude,
      battery: Math.round(60 + Math.random() * 35),
      status: 'available' as const,
    }));

    const newTarget: Detection = {
      id: newId,
      name: "שיגור רחפן",
      type: "uav",
      status: 'detection',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      coordinates: `${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}`,
      distance: `${(hivesWithDist[0].distanceM / 1000).toFixed(1)} km`,
      isNew: true,
      flowType: 3,
      flowPhase: 'investigate',
      droneDeployment: {
        droneId: '', hiveId: '', hiveLat: 0, hiveLon: 0,
        targetLat, targetLon, currentLat: 0, currentLon: 0,
        phase: 'select', battery: 0, overridden: false,
      },
    };

    setNearbyHives(nearbyHives);
    const reachableHives = hivesWithDist.filter(h => h.distanceM <= 15000);
    setFitBoundsPoints([
      { lat: targetLat, lon: targetLon },
      ...reachableHives.map(h => ({ lat: h.latitude, lon: h.longitude })),
    ]);
    setTargets(prev => [newTarget, ...prev]);
    setActiveTargetId(prev => prev !== null ? prev : newId);
    setTargets(prev => appendLog(prev, newId, 'שיגור רחפן — בחירת נכס'));
    showTacticalNotification({ title: 'שיגור רחפן', message: 'בחר רחפן לשיגור', level: 'info', code: newId });

    setTimeout(() => {
      setTargets(prev => prev.map(t => t.id === newId ? { ...t, isNew: false } : t));
    }, 2000);
  };

  const handleDroneSelect = (targetId: string, hiveId: string) => {
    const hive = DRONE_HIVE_ASSETS.find(h => h.id === hiveId);
    if (!hive) return;

    const target = targets.find(t => t.id === targetId);
    if (!target || !target.droneDeployment) return;

    setFitBoundsPoints(null);

    const tLat = target.droneDeployment.targetLat;
    const tLon = target.droneDeployment.targetLon;
    const battery = Math.round(70 + Math.random() * 25);

    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      droneDeployment: {
        ...t.droneDeployment!,
        droneId: `${hiveId}-D1`,
        hiveId, hiveLat: hive.latitude, hiveLon: hive.longitude,
        currentLat: hive.latitude, currentLon: hive.longitude,
        phase: 'takeoff' as const, battery, overridden: false,
      },
    }));

    const headingToTarget = bearingDegrees(hive.latitude, hive.longitude, tLat, tLon);
    flow3TrailRef.current = [[hive.longitude, hive.latitude]];
    setFlow3ActiveDrone({
      currentLat: hive.latitude, currentLon: hive.longitude,
      hiveLat: hive.latitude, hiveLon: hive.longitude,
      targetLat: tLat, targetLon: tLon,
      phase: 'takeoff', headingDeg: headingToTarget,
      trail: [[hive.longitude, hive.latitude]],
    });

    toast.success("רחפן ממריא...");
    setTargets(prev => appendLog(prev, targetId, `רחפן ${hiveId} — ממריא`));

    setTimeout(() => {
      setTargets(prev => prev.map(t => t.id !== targetId ? t : {
        ...t,
        droneDeployment: t.droneDeployment ? { ...t.droneDeployment, phase: 'flying' as const } : t.droneDeployment,
      }));
      flow3PhaseRef.current = 'flying';
      setFlow3ActiveDrone(prev => prev ? { ...prev, phase: 'flying' } : null);
      setTargets(prev => appendLog(prev, targetId, 'רחפן בדרך ליעד'));
      toast.info("רחפן בדרך ליעד");

      let tick = 0;
      const totalTicks = 60;
      let currentBattery = battery;
      let isOverridden = false;

      flow3IntervalRef.current = setInterval(() => {
        tick++;
        const phase = flow3PhaseRef.current;

        if (phase === 'landed' || phase === 'rtb') {
          if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current);
          return;
        }

        setTargets(prev => {
          const t = prev.find(x => x.id === targetId);
          if (t?.droneDeployment) {
            isOverridden = t.droneDeployment.overridden;
          }
          return prev;
        });

        if (isOverridden) return;

        if (phase === 'flying') {
          const progress = Math.min(1, tick / totalTicks);
          const lat = hive.latitude + (tLat - hive.latitude) * progress;
          const lon = hive.longitude + (tLon - hive.longitude) * progress;
          const hdg = bearingDegrees(lat, lon, tLat, tLon);
          currentBattery = Math.max(0, battery - (tick * 0.5));

          flow3TrailRef.current = [...flow3TrailRef.current.slice(-60), [lon, lat]];

          if (progress >= 1) {
            flow3PhaseRef.current = 'on_station';
            setFlow3ActiveDrone({
              currentLat: tLat, currentLon: tLon,
              hiveLat: hive.latitude, hiveLon: hive.longitude,
              targetLat: tLat, targetLon: tLon,
              phase: 'on_station', headingDeg: hdg,
              trail: flow3TrailRef.current,
            });
            setTargets(prev => prev.map(t => t.id !== targetId ? t : {
              ...t, name: 'רחפן בתצפית',
              droneDeployment: t.droneDeployment ? {
                ...t.droneDeployment, phase: 'on_station' as const, currentLat: tLat, currentLon: tLon, battery: Math.round(currentBattery),
              } : t.droneDeployment,
            }));
            setTargets(prev => appendLog(prev, targetId, 'רחפן הגיע ליעד — תצפית פעילה'));
            toast.success("רחפן הגיע ליעד — תצפית פעילה");
          } else {
            setFlow3ActiveDrone({
              currentLat: lat, currentLon: lon,
              hiveLat: hive.latitude, hiveLon: hive.longitude,
              targetLat: tLat, targetLon: tLon,
              phase: 'flying', headingDeg: hdg,
              trail: flow3TrailRef.current,
            });
            setTargets(prev => prev.map(t => t.id !== targetId ? t : {
              ...t,
              droneDeployment: t.droneDeployment ? {
                ...t.droneDeployment, currentLat: lat, currentLon: lon, battery: Math.round(currentBattery),
              } : t.droneDeployment,
            }));
          }
        } else if (phase === 'on_station' || phase === 'low_battery') {
          currentBattery = Math.max(0, currentBattery - 0.4);
          const loiterAngle = (tick * 3) % 360;
          const loiterR = 0.0006;
          const lat = tLat + Math.cos((loiterAngle * Math.PI) / 180) * loiterR;
          const lon = tLon + Math.sin((loiterAngle * Math.PI) / 180) * loiterR;
          const hdg = loiterAngle + 90;

          flow3TrailRef.current = [...flow3TrailRef.current.slice(-60), [lon, lat]];

          const nextPhase = currentBattery <= 20 ? 'low_battery' : 'on_station';
          setFlow3ActiveDrone(prev => prev ? {
            ...prev, currentLat: lat, currentLon: lon, headingDeg: hdg,
            phase: nextPhase, trail: flow3TrailRef.current,
          } : null);
          setTargets(prev => prev.map(t => t.id !== targetId ? t : {
            ...t,
            droneDeployment: t.droneDeployment ? {
              ...t.droneDeployment, currentLat: lat, currentLon: lon, battery: Math.round(currentBattery), phase: nextPhase as DroneDeployment['phase'],
            } : t.droneDeployment,
          }));

          if (currentBattery <= 20 && phase !== 'low_battery') {
            flow3PhaseRef.current = 'low_battery';
            toast.warning("סוללה נמוכה — שקול החלפת רחפן");
          }
        }
      }, 300);
    }, 3000);
  };

  const handleDroneOverride = (targetId: string) => {
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      droneDeployment: t.droneDeployment ? { ...t.droneDeployment, overridden: true } : t.droneDeployment,
    }));
    toast.info("משימה מושהית — שליטה ידנית");
  };

  const handleDroneResume = (targetId: string) => {
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      droneDeployment: t.droneDeployment ? { ...t.droneDeployment, overridden: false } : t.droneDeployment,
    }));
    toast.info("משימה חוזרת לפעילות");
  };

  const handleDroneRTB = (targetId: string) => {
    if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current);
    flow3PhaseRef.current = 'rtb';

    const target = targets.find(t => t.id === targetId);
    const dd = target?.droneDeployment;
    if (!dd) return;

    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t, name: 'רחפן חוזר לבסיס',
      droneDeployment: t.droneDeployment ? { ...t.droneDeployment, phase: 'rtb' as const } : t.droneDeployment,
    }));

    const startLat = dd.currentLat;
    const startLon = dd.currentLon;
    const hdg = bearingDegrees(startLat, startLon, dd.hiveLat, dd.hiveLon);
    setFlow3ActiveDrone(prev => prev ? { ...prev, phase: 'rtb', headingDeg: hdg } : null);
    toast.info("רחפן חוזר לבסיס");

    let tick = 0;
    const totalTicks = 40;
    flow3IntervalRef.current = setInterval(() => {
      tick++;
      const progress = Math.min(1, tick / totalTicks);
      const lat = startLat + (dd.hiveLat - startLat) * progress;
      const lon = startLon + (dd.hiveLon - startLon) * progress;

      flow3TrailRef.current = [...flow3TrailRef.current.slice(-60), [lon, lat]];

      setFlow3ActiveDrone(prev => prev ? {
        ...prev, currentLat: lat, currentLon: lon,
        phase: 'rtb', headingDeg: hdg, trail: flow3TrailRef.current,
      } : null);
      setTargets(prev => prev.map(t => t.id !== targetId ? t : {
        ...t,
        droneDeployment: t.droneDeployment ? { ...t.droneDeployment, currentLat: lat, currentLon: lon } : t.droneDeployment,
      }));

      if (progress >= 1) {
        if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current);
        flow3PhaseRef.current = 'landed';
        setFlow3ActiveDrone(null);
        flow3TrailRef.current = [];
        setTargets(prev => prev.map(t => t.id !== targetId ? t : {
          ...t, name: 'רחפן נחת', status: 'event_resolved' as const,
          droneDeployment: t.droneDeployment ? { ...t.droneDeployment, phase: 'landed' as const } : t.droneDeployment,
          flowPhase: undefined, flowType: undefined,
        }));
        setTargets(prev => appendLog(prev, targetId, 'רחפן נחת בבסיס — משימה הושלמה'));
        toast.success("רחפן נחת בבסיס");
      }
    }, 300);
  };

  // ─── Flow 4: Mission Planning & Execution ───

  const flow4IntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flow4TrailRef = useRef<[number, number][]>([]);
  const [flow4ActiveRoute, setFlow4ActiveRoute] = useState<{
    waypoints: { lat: number; lon: number; label: string }[];
    droneLat: number; droneLon: number; headingDeg: number;
    currentSegment: number; phase: string; trail: [number, number][];
    loop: boolean;
  } | null>(null);

  const [missionPlanningMode, setMissionPlanningMode] = useState<{
    targetId: string;
    missionType: 'drone' | 'ptz';
    waypoints: MissionWaypoint[];
    loop: boolean;
    repetitions: number;
    dwellTimeS?: number;
    selectedCameraId?: string;
    scanCenterDeg?: number;
    scanWidthDeg?: number;
    scanSteps?: number;
  } | null>(null);

  const focusCoords = (() => {
    if (!activeTarget) return null;
    if (missionPlanningMode) return null;
    if (activeTarget.entityStage) return null;
    const parts = activeTarget.coordinates.split(',');
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) return null;
    return { lat, lon };
  })();

  useEffect(() => {
    return () => { if (flow4IntervalRef.current) clearInterval(flow4IntervalRef.current); };
  }, []);

  const handleMissionPlannerSelect = (type: 'drone' | 'ptz') => {
    setMissionPlannerOpen(false);
    setFlowTriggerOpen(false);
    if (type === 'drone') {
      handleStartDroneMission();
    } else {
      handleStartCameraMission();
    }
  };

  const handleStartDroneMission = () => {
    if (flow4IntervalRef.current) clearInterval(flow4IntervalRef.current);
    setFlow4ActiveRoute(null);
    flow4TrailRef.current = [];

    const newId = `FLOW4-${Date.now()}`;
    const newTarget: Detection = {
      id: newId,
      name: "תכנון משימה — רחפן",
      type: "uav",
      status: 'detection',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      coordinates: 'ממתין לנקודות ציון',
      distance: '0 נקודות',
      flowType: 4,
      flowPhase: 'investigate',
      plannedMission: {
        missionType: 'drone',
        waypoints: [],
        loop: true,
        currentWaypointIdx: 0,
        segmentProgress: 0,
        phase: 'planning',
        durationMinutes: 15,
        repetitions: -1,
        currentRepetition: 1,
        selectedAssetId: undefined,
      },
    };

    setTargets(prev => [newTarget, ...prev]);
    setActiveTargetId(prev => prev !== null ? prev : newId);
    if (!activeTargetId) setSidebarOpen(true);
    setMissionPlanningMode({ targetId: newId, missionType: 'drone', waypoints: [], loop: true, repetitions: -1 });

    setFlow4ActiveRoute({
      waypoints: [],
      droneLat: 0, droneLon: 0, headingDeg: 0,
      currentSegment: -1, phase: 'planning', trail: [], loop: true,
    });

    showTacticalNotification({ title: 'תכנון משימה', message: 'לחץ על המפה להוספת נקודות ציון', level: 'info', code: newId });
  };

  const handlePlanningMapClick = useCallback((lat: number, lon: number) => {
    if (!missionPlanningMode || missionPlanningMode.missionType === 'ptz') return;

    const wpIdx = missionPlanningMode.waypoints.length + 1;
    const newWp: MissionWaypoint = { lat, lon, label: `WP-${wpIdx}`, stayTimeS: 10 };
    const updatedWaypoints = [...missionPlanningMode.waypoints, newWp];

    setMissionPlanningMode(prev => prev ? { ...prev, waypoints: updatedWaypoints } : null);

    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      coordinates: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      distance: `${updatedWaypoints.length} נקודות`,
      plannedMission: t.plannedMission ? { ...t.plannedMission, waypoints: updatedWaypoints } : t.plannedMission,
    }));

    setFlow4ActiveRoute(prev => prev ? {
      ...prev,
      waypoints: updatedWaypoints.map(w => ({ lat: w.lat, lon: w.lon, label: w.label })),
      loop: missionPlanningMode.loop,
    } : null);

  }, [missionPlanningMode]);

  const handlePlanningRemoveWaypoint = useCallback((idx: number) => {
    if (!missionPlanningMode) return;

    const updatedWaypoints = missionPlanningMode.waypoints
      .filter((_, i) => i !== idx)
      .map((wp, i) => ({ ...wp, label: `WP-${i + 1}` }));

    setMissionPlanningMode(prev => prev ? { ...prev, waypoints: updatedWaypoints } : null);

    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      distance: `${updatedWaypoints.length} נקודות`,
      coordinates: updatedWaypoints.length > 0
        ? `${updatedWaypoints[0].lat.toFixed(5)}, ${updatedWaypoints[0].lon.toFixed(5)}`
        : 'ממתין לנקודות ציון',
      plannedMission: t.plannedMission ? { ...t.plannedMission, waypoints: updatedWaypoints } : t.plannedMission,
    }));

    setFlow4ActiveRoute(prev => prev ? {
      ...prev,
      waypoints: updatedWaypoints.map(w => ({ lat: w.lat, lon: w.lon, label: w.label })),
    } : null);
  }, [missionPlanningMode]);

  const handlePlanningToggleLoop = useCallback(() => {
    if (!missionPlanningMode) return;
    const newLoop = !missionPlanningMode.loop;
    setMissionPlanningMode(prev => prev ? { ...prev, loop: newLoop } : null);
    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, loop: newLoop } : t.plannedMission,
    }));
    setFlow4ActiveRoute(prev => prev ? { ...prev, loop: newLoop } : null);
  }, [missionPlanningMode]);

  const handlePlanningUpdateWaypoint = useCallback((idx: number, updates: Partial<MissionWaypoint>) => {
    if (!missionPlanningMode) return;
    const updatedWaypoints = missionPlanningMode.waypoints.map((wp, i) => i === idx ? { ...wp, ...updates } : wp);
    setMissionPlanningMode(prev => prev ? { ...prev, waypoints: updatedWaypoints } : null);
    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, waypoints: updatedWaypoints } : t.plannedMission,
    }));
  }, [missionPlanningMode]);

  const handlePlanningSetRepetitions = useCallback((n: number) => {
    if (!missionPlanningMode) return;
    setMissionPlanningMode(prev => prev ? { ...prev, repetitions: n } : null);
    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, repetitions: n } : t.plannedMission,
    }));
  }, [missionPlanningMode]);

  const handlePlanningSetScanCenter = useCallback((deg: number) => {
    if (!missionPlanningMode) return;
    const clamped = ((deg % 360) + 360) % 360;
    setMissionPlanningMode(prev => prev ? { ...prev, scanCenterDeg: clamped } : null);
  }, [missionPlanningMode]);

  const handlePlanningSetScanWidth = useCallback((deg: number) => {
    if (!missionPlanningMode) return;
    const clamped = Math.max(10, Math.min(180, deg));
    setMissionPlanningMode(prev => prev ? { ...prev, scanWidthDeg: clamped } : null);
  }, [missionPlanningMode]);

  const handlePlanningSetScanSteps = useCallback((n: number) => {
    if (!missionPlanningMode) return;
    const clamped = Math.max(2, Math.min(12, n));
    setMissionPlanningMode(prev => prev ? { ...prev, scanSteps: clamped } : null);
  }, [missionPlanningMode]);

  const handlePlanningSetDwellTime = useCallback((seconds: number) => {
    if (!missionPlanningMode) return;
    const clamped = Math.max(2, Math.min(60, seconds));
    setMissionPlanningMode(prev => prev ? { ...prev, dwellTimeS: clamped } : null);
    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, dwellTimeS: clamped } : t.plannedMission,
    }));
  }, [missionPlanningMode]);

  const handlePlanningSelectCamera = useCallback((cameraId: string) => {
    if (!missionPlanningMode) return;
    const cam = CAMERA_ASSETS.find(c => c.id === cameraId);
    if (!cam) return;
    setMissionPlanningMode(prev => prev ? { ...prev, selectedCameraId: cameraId } : null);
    setTargets(prev => prev.map(t => t.id !== missionPlanningMode.targetId ? t : {
      ...t,
      coordinates: `${cam.latitude.toFixed(5)}, ${cam.longitude.toFixed(5)}`,
      distance: cameraId,
      plannedMission: t.plannedMission ? { ...t.plannedMission, selectedAssetId: cameraId } : t.plannedMission,
    }));
    setFitBoundsPoints([{ lat: cam.latitude, lon: cam.longitude }]);
  }, [missionPlanningMode]);

  const handlePlanningZoomCameras = useCallback(() => {
    setFitBoundsPoints(CAMERA_ASSETS.map(c => ({ lat: c.latitude, lon: c.longitude })));
  }, []);

  const handlePlanningFinalize = useCallback(() => {
    if (!missionPlanningMode) return;
    const targetId = missionPlanningMode.targetId;

    if (missionPlanningMode.missionType === 'ptz') {
      if (!missionPlanningMode.selectedCameraId) return;
      const center = missionPlanningMode.scanCenterDeg ?? 0;
      const width = missionPlanningMode.scanWidthDeg ?? 60;
      const steps = missionPlanningMode.scanSteps ?? 4;
      const half = width / 2;
      const scanBearings = Array.from({ length: steps }, (_, i) => {
        const angle = center - half + (width / (steps - 1)) * i;
        return Math.round(((angle % 360) + 360) % 360);
      });

      setTargets(prev => prev.map(t => t.id !== targetId ? t : {
        ...t,
        plannedMission: t.plannedMission ? {
          ...t.plannedMission,
          scanBearings,
          dwellTimeS: missionPlanningMode.dwellTimeS ?? 6,
          selectedAssetId: missionPlanningMode.selectedCameraId,
          repetitions: missionPlanningMode.repetitions,
          loop: missionPlanningMode.loop,
        } : t.plannedMission,
      }));
      setTargets(prev => appendLog(prev, targetId, `סריקת מצלמה — ${missionPlanningMode.selectedCameraId} · ${steps} מיקומים`));
      setMissionPlanningMode(null);
      showTacticalNotification({ title: 'סריקת מצלמה', message: `${steps} מיקומים — מוכן להפעלה`, level: 'info', code: targetId });
      return;
    }

    if (missionPlanningMode.waypoints.length < 2) return;

    const waypoints = missionPlanningMode.waypoints;
    const nearestHive = DRONE_HIVE_ASSETS.map(h => ({
      ...h, d: haversineDistanceM(waypoints[0].lat, waypoints[0].lon, h.latitude, h.longitude),
    })).sort((a, b) => a.d - b.d)[0];

    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      coordinates: `${waypoints[0].lat.toFixed(5)}, ${waypoints[0].lon.toFixed(5)}`,
      plannedMission: t.plannedMission ? {
        ...t.plannedMission,
        waypoints,
        loop: missionPlanningMode.loop,
        repetitions: missionPlanningMode.repetitions,
        selectedAssetId: nearestHive.id,
      } : t.plannedMission,
    }));
    setTargets(prev => appendLog(prev, targetId, `משימת רחפן — ${waypoints.length} נקודות ציון`));

    const allPoints = [
      ...waypoints.map(w => ({ lat: w.lat, lon: w.lon })),
      { lat: nearestHive.latitude, lon: nearestHive.longitude },
    ];
    setFitBoundsPoints(allPoints);

    setFlow4ActiveRoute(prev => prev ? {
      ...prev,
      waypoints: waypoints.map(w => ({ lat: w.lat, lon: w.lon, label: w.label })),
      droneLat: nearestHive.latitude, droneLon: nearestHive.longitude,
      headingDeg: bearingDegrees(nearestHive.latitude, nearestHive.longitude, waypoints[0].lat, waypoints[0].lon),
      loop: missionPlanningMode.loop,
    } : null);

    setMissionPlanningMode(null);

    showTacticalNotification({ title: 'תכנון משימה', message: `${waypoints.length} נקודות ציון הוגדרו — מוכן להפעלה`, level: 'info', code: targetId });
  }, [missionPlanningMode]);

  // ─── Flow 4 Camera: PTZ Scan Mission ───

  const flow4CameraIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (flow4CameraIntervalRef.current) clearInterval(flow4CameraIntervalRef.current); };
  }, []);

  const handleStartCameraMission = () => {
    if (flow4CameraIntervalRef.current) clearInterval(flow4CameraIntervalRef.current);

    const selectedCam = CAMERA_ASSETS[0];
    const newId = `FLOW4C-${Date.now()}`;
    const defaultCenter = 0;
    const defaultWidth = 60;
    const defaultSteps = 4;
    const defaultDwell = 6;

    const newTarget: Detection = {
      id: newId,
      name: "תכנון סריקה — מצלמה",
      type: "uav",
      status: 'detection',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      coordinates: `${selectedCam.latitude.toFixed(5)}, ${selectedCam.longitude.toFixed(5)}`,
      distance: selectedCam.id,
      flowType: 4,
      flowPhase: 'investigate',
      plannedMission: {
        missionType: 'ptz',
        waypoints: [],
        loop: true,
        currentWaypointIdx: 0,
        segmentProgress: 0,
        phase: 'planning',
        durationMinutes: 10,
        repetitions: 3,
        currentRepetition: 1,
        selectedAssetId: selectedCam.id,
        dwellTimeS: defaultDwell,
      },
    };

    setTargets(prev => [newTarget, ...prev]);
    setActiveTargetId(prev => prev !== null ? prev : newId);
    if (!activeTargetId) setSidebarOpen(true);
    setFitBoundsPoints([{ lat: selectedCam.latitude, lon: selectedCam.longitude }]);
    setMissionPlanningMode({
      targetId: newId,
      missionType: 'ptz',
      waypoints: [],
      loop: true,
      repetitions: 3,
      dwellTimeS: defaultDwell,
      selectedCameraId: selectedCam.id,
      scanCenterDeg: defaultCenter,
      scanWidthDeg: defaultWidth,
      scanSteps: defaultSteps,
    });

    showTacticalNotification({ title: 'סריקת מצלמה', message: `${selectedCam.id} — הגדר פרמטרי סריקה`, level: 'info', code: newId });
  };

  const handleMissionActivate = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target?.plannedMission) return;

    // Camera (PTZ) mission activation
    if (target.plannedMission.missionType === 'ptz') {
      setFitBoundsPoints(null);
      setTargets(prev => prev.map(t => t.id !== targetId ? t : {
        ...t, name: 'סריקה פעילה',
        plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'active' as const, currentWaypointIdx: 0, segmentProgress: 0 } : t.plannedMission,
      }));
      setTargets(prev => appendLog(prev, targetId, 'סריקת מצלמה הופעלה'));
      toast.success("סריקת מצלמה הופעלה");

      const bearings = target.plannedMission.scanBearings || [];
      const dwellS = target.plannedMission.dwellTimeS || 6;
      const camId = target.plannedMission.selectedAssetId || '';
      const reps = target.plannedMission.repetitions;
      let bearingIdx = 0;
      let tickInDwell = 0;
      const ticksPerDwell = Math.round(dwellS * (1000 / 500));
      let currentRep = 1;
      let paused = false;

      const [tLat, tLon] = target.coordinates.split(',').map(s => parseFloat(s.trim()));

      if (bearings.length > 0 && camId) {
        setCameraLookAtRequest({ cameraId: camId, targetLat: tLat, targetLon: tLon });
      }

      flow4CameraIntervalRef.current = setInterval(() => {
        setTargets(prev => {
          const t = prev.find(x => x.id === targetId);
          if (t?.plannedMission) {
            paused = t.plannedMission.phase === 'paused' || t.plannedMission.phase === 'override';
          }
          return prev;
        });
        if (paused) return;
        if (bearings.length === 0) return;

        tickInDwell++;
        if (tickInDwell >= ticksPerDwell) {
          tickInDwell = 0;
          bearingIdx++;
          if (bearingIdx >= bearings.length) {
            bearingIdx = 0;
            currentRep++;
            if (reps !== -1 && currentRep > reps) {
              if (flow4CameraIntervalRef.current) clearInterval(flow4CameraIntervalRef.current);
              setCameraLookAtRequest(null);
              setTargets(prev => prev.map(t => t.id !== targetId ? t : {
                ...t, name: 'סריקה הושלמה', status: 'event_resolved' as const,
                plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'completed' as const } : t.plannedMission,
                flowPhase: undefined, flowType: undefined,
              }));
              setTargets(prev => appendLog(prev, targetId, 'סריקת מצלמה הושלמה'));
              toast.success("סריקת מצלמה הושלמה");
              return;
            }
          }
        }

        const bearing = bearings[bearingIdx];
        const scanDist = 0.005;
        const targetScanLat = tLat + Math.cos((bearing * Math.PI) / 180) * scanDist;
        const targetScanLon = tLon + Math.sin((bearing * Math.PI) / 180) * scanDist;
        setCameraLookAtRequest({ cameraId: camId, targetLat: targetScanLat, targetLon: targetScanLon });

        setTargets(prev => prev.map(t => t.id !== targetId ? t : {
          ...t,
          plannedMission: t.plannedMission ? {
            ...t.plannedMission, currentWaypointIdx: bearingIdx,
            segmentProgress: tickInDwell / ticksPerDwell,
            currentRepetition: currentRep,
          } : t.plannedMission,
        }));
      }, 500);

      return;
    }

    // Drone mission activation
    const wps = target.plannedMission.waypoints;
    const isLoop = target.plannedMission.loop;

    setFitBoundsPoints(null);
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t, name: 'משימה פעילה',
      plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'active' as const, currentWaypointIdx: 0, segmentProgress: 0 } : t.plannedMission,
    }));
    setTargets(prev => appendLog(prev, targetId, 'משימת רחפן הופעלה'));
    toast.success("משימה הופעלה");

    let segIdx = 0;
    let segTick = 0;
    const segTicks = 40;
    let stayTick = 0;
    let staying = false;
    let paused = false;

    const startLat = flow4ActiveRoute?.droneLat ?? wps[0].lat;
    const startLon = flow4ActiveRoute?.droneLon ?? wps[0].lon;
    let fromLat = startLat, fromLon = startLon;
    let toLat = wps[0].lat, toLon = wps[0].lon;

    flow4TrailRef.current = [[startLon, startLat]];

    flow4IntervalRef.current = setInterval(() => {
      setTargets(prev => {
        const t = prev.find(x => x.id === targetId);
        if (t?.plannedMission) {
          paused = t.plannedMission.phase === 'paused' || t.plannedMission.phase === 'override';
        }
        return prev;
      });

      if (paused) return;

      if (staying) {
        stayTick++;
        const stayTotal = (wps[segIdx]?.stayTimeS ?? 8) * (1000 / 300);
        if (stayTick >= stayTotal) {
          staying = false;
          stayTick = 0;
          segTick = 0;
          segIdx++;
          if (segIdx >= wps.length) {
            if (isLoop) {
              segIdx = 0;
            } else {
              if (flow4IntervalRef.current) clearInterval(flow4IntervalRef.current);
              setTargets(prev => prev.map(t => t.id !== targetId ? t : {
                ...t, name: 'משימה הושלמה', status: 'event_resolved' as const,
                plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'completed' as const } : t.plannedMission,
                flowPhase: undefined, flowType: undefined,
              }));
              setFlow4ActiveRoute(null);
              flow4TrailRef.current = [];
              setTargets(prev => appendLog(prev, targetId, 'משימת רחפן הושלמה'));
              toast.success("משימה הושלמה");
              return;
            }
          }
          fromLat = toLat; fromLon = toLon;
          toLat = wps[segIdx].lat; toLon = wps[segIdx].lon;
        }
        return;
      }

      segTick++;
      const p = Math.min(1, segTick / segTicks);
      const lat = fromLat + (toLat - fromLat) * p;
      const lon = fromLon + (toLon - fromLon) * p;
      const hdg = bearingDegrees(lat, lon, toLat, toLon);

      flow4TrailRef.current = [...flow4TrailRef.current.slice(-80), [lon, lat]];

      setFlow4ActiveRoute(prev => prev ? {
        ...prev, droneLat: lat, droneLon: lon, headingDeg: hdg,
        currentSegment: segIdx, phase: 'active',
        trail: flow4TrailRef.current,
      } : null);

      setTargets(prev => prev.map(t => t.id !== targetId ? t : {
        ...t,
        plannedMission: t.plannedMission ? { ...t.plannedMission, currentWaypointIdx: segIdx, segmentProgress: p } : t.plannedMission,
      }));

      if (p >= 1) {
        staying = true;
        stayTick = 0;
      }
    }, 300);
  };

  const handleMissionPause = (targetId: string) => {
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'paused' as const } : t.plannedMission,
    }));
    toast.info("משימה מושהית");
  };

  const handleMissionResume = (targetId: string) => {
    setControlIndicator(false);
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'active' as const, overrideAutoResumeS: undefined } : t.plannedMission,
    }));
    toast.info("משימה חוזרת לפעילות");
  };

  const handleMissionOverride = (targetId: string) => {
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t,
      plannedMission: t.plannedMission ? { ...t.plannedMission, phase: 'override' as const, overrideAutoResumeS: 30 } : t.plannedMission,
    }));
    setControlIndicator(true);
    toast.info("שליטה ידנית — משימה תחזור אוטומטית בעוד 30 שניות");

    const countdownInterval = setInterval(() => {
      setTargets(prev => {
        const t = prev.find(x => x.id === targetId);
        if (!t?.plannedMission || t.plannedMission.phase !== 'override') {
          clearInterval(countdownInterval);
          return prev;
        }
        const remaining = (t.plannedMission.overrideAutoResumeS ?? 1) - 1;
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          setControlIndicator(false);
          toast.info("שליטה אוטומטית חוזרת — משימה ממשיכה");
          return prev.map(x => x.id !== targetId ? x : {
            ...x,
            plannedMission: x.plannedMission ? { ...x.plannedMission, phase: 'active' as const, overrideAutoResumeS: undefined } : x.plannedMission,
          });
        }
        return prev.map(x => x.id !== targetId ? x : {
          ...x,
          plannedMission: x.plannedMission ? { ...x.plannedMission, overrideAutoResumeS: remaining } : x.plannedMission,
        });
      });
    }, 1000);
  };

  const handleMissionCancel = (targetId: string) => {
    if (flow4IntervalRef.current) clearInterval(flow4IntervalRef.current);
    if (flow4CameraIntervalRef.current) clearInterval(flow4CameraIntervalRef.current);
    setFlow4ActiveRoute(null);
    flow4TrailRef.current = [];
    setControlIndicator(false);
    setCameraLookAtRequest(null);
    setMissionPlanningMode(null);
    setTargets(prev => prev.map(t => t.id !== targetId ? t : {
      ...t, name: 'משימה בוטלה', status: 'expired' as const,
      plannedMission: undefined, flowPhase: undefined, flowType: undefined,
    }));
    setTargets(prev => appendLog(prev, targetId, 'משימה בוטלה'));
    toast.info("משימה בוטלה");
  };

  const handleEscalateCreatePOI = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    toast.success("נקודת עניין נוצרה במיקום המטרה");
  };

  const handleEscalateSendDrone = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    if (flow2IntervalRef.current) clearInterval(flow2IntervalRef.current);
    setControlIndicator(false);
    setCameraLookAtRequest(null);

    const [latStr, lonStr] = target.coordinates.split(',').map(s => s.trim());
    const tLat = parseFloat(latStr);
    const tLon = parseFloat(lonStr);

    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, flowPhase: 'act', flowType: undefined, status: 'detection' as const, name: 'מעקב רחפן פעיל' } : t
    ));
    launchDroneToTarget(targetId, tLat, tLon);
    handleStartMission(targetId, 'surveillance');
    toast.success("רחפן שוגר למעקב");
  };

  // Flow handlers
  const handleCameraLookAt = (_targetId: string, cameraId: string) => {
    const target = targets.find(t => (t.flowType === 1 || t.flowType === 2) && t.flowPhase && ['investigate', 'decide'].includes(t.flowPhase));
    if (!target) return;
    const [lat, lon] = target.coordinates.split(',').map(c => parseFloat(c.trim()));
    setCameraLookAtRequest({ cameraId, targetLat: lat, targetLon: lon });
  };

  const handleTakeControl = (targetId: string) => {
    setTargets(prev => prev.map(t => {
      if (t.id !== targetId) return t;
      const nextPhase = t.flowType === 2 ? t.flowPhase : 'decide';
      return { ...t, controlledByUser: true, flowPhase: nextPhase };
    }));
    setControlIndicator(true);
    setTargets(prev => appendLog(prev, targetId, 'שליטה ידנית הופעלה'));
    toast.success("שליטה ידנית הופעלה");
  };

  const handleReleaseControl = (targetId: string) => {
    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, controlledByUser: false } : t
    ));
    setControlIndicator(false);
    setTargets(prev => appendLog(prev, targetId, 'שליטה שוחררה'));
    toast.info("שליטה שוחררה");
  };

  const handleSensorModeChange = (targetId: string, mode: 'day' | 'thermal') => {
    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, sensorMode: mode } : t
    ));
    toast.info(mode === 'thermal' ? "מצלמה תרמית פעילה" : "מצלמת יום פעילה");
  };

  const launchDroneToTarget = (targetId: string, tLat: number, tLon: number) => {
    if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current);
    flow3TrailRef.current = [];

    const hive = DRONE_HIVE_ASSETS.map(h => ({
      ...h, d: haversineDistanceM(tLat, tLon, h.latitude, h.longitude),
    })).sort((a, b) => a.d - b.d)[0];
    if (!hive) return;

    const battery = Math.round(70 + Math.random() * 25);
    const headingToTarget = bearingDegrees(hive.latitude, hive.longitude, tLat, tLon);
    flow3TrailRef.current = [[hive.longitude, hive.latitude]];
    flow3PhaseRef.current = 'flying';

    setFlow3ActiveDrone({
      currentLat: hive.latitude, currentLon: hive.longitude,
      hiveLat: hive.latitude, hiveLon: hive.longitude,
      targetLat: tLat, targetLon: tLon,
      phase: 'flying', headingDeg: headingToTarget,
      trail: [[hive.longitude, hive.latitude]],
    });

    setTargets(prev => appendLog(prev, targetId, `רחפן ${hive.id} — ממריא ליעד`));

    let tick = 0;
    const totalTicks = 50;
    let currentBattery = battery;

    flow3IntervalRef.current = setInterval(() => {
      tick++;
      const phase = flow3PhaseRef.current;
      if (phase === 'landed' || phase === 'rtb') {
        if (flow3IntervalRef.current) clearInterval(flow3IntervalRef.current);
        return;
      }

      if (phase === 'flying') {
        const progress = Math.min(1, tick / totalTicks);
        const lat = hive.latitude + (tLat - hive.latitude) * progress;
        const lon = hive.longitude + (tLon - hive.longitude) * progress;
        const hdg = bearingDegrees(lat, lon, tLat, tLon);
        currentBattery = Math.max(0, battery - (tick * 0.4));

        flow3TrailRef.current = [...flow3TrailRef.current.slice(-60), [lon, lat]];

        if (progress >= 1) {
          flow3PhaseRef.current = 'on_station';
          setFlow3ActiveDrone({
            currentLat: tLat, currentLon: tLon,
            hiveLat: hive.latitude, hiveLon: hive.longitude,
            targetLat: tLat, targetLon: tLon,
            phase: 'on_station', headingDeg: hdg,
            trail: flow3TrailRef.current,
          });
          setTargets(prev => appendLog(prev, targetId, 'רחפן הגיע ליעד — תצפית פעילה'));
          toast.success("רחפן הגיע ליעד");
        } else {
          setFlow3ActiveDrone({
            currentLat: lat, currentLon: lon,
            hiveLat: hive.latitude, hiveLon: hive.longitude,
            targetLat: tLat, targetLon: tLon,
            phase: 'flying', headingDeg: hdg,
            trail: flow3TrailRef.current,
          });
        }
      } else if (phase === 'on_station') {
        currentBattery = Math.max(0, currentBattery - 0.3);
        const loiterAngle = (tick * 3) % 360;
        const loiterR = 0.0006;
        const lat = tLat + Math.cos((loiterAngle * Math.PI) / 180) * loiterR;
        const lon = tLon + Math.sin((loiterAngle * Math.PI) / 180) * loiterR;
        flow3TrailRef.current = [...flow3TrailRef.current.slice(-60), [lon, lat]];
        setFlow3ActiveDrone(prev => prev ? {
          ...prev, currentLat: lat, currentLon: lon, headingDeg: loiterAngle + 90,
          phase: 'on_station', trail: flow3TrailRef.current,
        } : null);
      }
    }, 300);
  };

  const handlePlaybookSelect = (targetId: string, playbookId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;

    const [latStr, lonStr] = target.coordinates.split(',').map(s => s.trim());
    const tLat = parseFloat(latStr);
    const tLon = parseFloat(lonStr);

    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, flowPhase: 'act', status: 'detection' as const, name: 'משימה בביצוע' } : t
    ));
    setControlIndicator(false);
    setCameraLookAtRequest(null);

    if (playbookId === 'fast-inspect') {
      toast.success("חקירה מהירה — שיגור רחפן + הקלטה");
      launchDroneToTarget(targetId, tLat, tLon);
      handleStartMission(targetId, 'surveillance');
    } else if (playbookId === 'full-response') {
      toast.success("תגובה מלאה — רחפן + כוח תגובה + הקלטה");
      launchDroneToTarget(targetId, tLat, tLon);
      handleStartMission(targetId, 'intercept');
    } else if (playbookId === 'transfer') {
      toast.success("העברת אחריות — נתונים הועברו");
      setTargets(prev => prev.map(t =>
        t.id === targetId ? { ...t, flowPhase: 'closure' } : t
      ));
    }
  };

  const handleAdvanceFlowPhase = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    if (target.flowType === 2) {
      if (flow2IntervalRef.current) clearInterval(flow2IntervalRef.current);
      setTargets(prev => prev.map(t =>
        t.id === targetId ? { ...t, flowPhase: 'closure' } : t
      ));
      setControlIndicator(false);
      setCameraLookAtRequest(null);
      return;
    }
    if (target.flowPhase === 'investigate') {
      setTargets(prev => prev.map(t =>
        t.id === targetId ? { ...t, flowPhase: 'decide' } : t
      ));
    } else if (target.flowPhase === 'decide') {
      setTargets(prev => prev.map(t =>
        t.id === targetId ? { ...t, flowPhase: 'closure' } : t
      ));
      setControlIndicator(false);
      setCameraLookAtRequest(null);
    }
  };

  const handleClosureOutcome = (targetId: string, outcome: IncidentOutcome) => {
    if (flow2IntervalRef.current) clearInterval(flow2IntervalRef.current);
    setTargets(prev => prev.map(t =>
      t.id === targetId ? {
        ...t,
        flowPhase: undefined,
        flowType: undefined,
        controlledByUser: false,
        status: outcome.startsWith('Ignored') ? 'expired' as const : 'event_resolved' as const,
        dismissReason: outcome,
      } : t
    ));
    setControlIndicator(false);
    setCameraLookAtRequest(null);
    setTargets(prev => appendLog(prev, targetId, `אירוע נסגר — ${outcome}`));
    toast.success("אירוע נסגר — " + outcome);
  };

  const handleTargetClick = (target: Detection) => {
      setActiveTargetId(prev => prev === target.id ? null : target.id);
  };

  const handleStartMission = (targetId: string, action: 'intercept' | 'surveillance') => {
      // Logic for starting a mission (Verify + Action combined)
      const missionSteps = action === 'intercept' 
        ? [
            "חישוב נתיב יירוט...",
            "הקצאת משאבים אוויריים...",
            "נעילה על נתוני מטרה...",
            "אישור פרוטוקולי תקיפה...",
            "מוכן לביצוע."
          ]
        : [
            "פריסת רחפן תצפית...",
            "יצירת ערוץ וידאו מאובטח...",
            "ניתוח חתימה תרמית...",
            "הצלבת נתונים מול מאגר...",
            "מעקב פעיל."
          ];

      setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { 
                ...t, 
                status: 'detection', 
                name: action === 'intercept' ? "איום בליסטי" : "מעקב פעיל", 
                type: action === 'intercept' ? 'missile' : 'uav',
                missionStatus: 'planning',
                missionSteps: missionSteps,
                missionProgress: 0
              } 
            : t
      ));

      toast.success("פרוטוקול משימה הופעל");
  };

  const handleDismiss = (targetId: string, reason?: string) => {
      const target = targets.find(t => t.id === targetId);

      if (reason === 'escalate') {
        setTargets(prev => appendLog(prev, targetId, 'דיווח נשלח לגורם ממונה'));
        toast.success(`דיווח נשלח — ${target?.name || 'יעד'}`);
        return;
      }

      const isBirdConfirm = reason === 'bird_confirmed';
      const isFalseAlarm = reason === 'false_alarm';
      const newStatus = isBirdConfirm || isFalseAlarm ? 'event_resolved' as const : 'expired' as const;
      setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, status: newStatus, dismissReason: reason } 
            : t
      ));
      if (activeTargetId === targetId) setActiveTargetId(null);
      const messages: Record<string, string> = {
        bird_confirmed: 'אושר כציפור — זיהוי נסגר',
        false_alarm: 'סומן כאזעקת שווא',
      };
      toast(messages[reason || ''] || (reason ? `הוסר: ${reason}` : "איתור הוסר ממעקב"));
  };

  const handleCancelMission = (targetId: string) => {
      if (jammingTargetId === targetId) {
        setJammingTargetId(null);
        setJammingJammerAssetId(null);
      }
      setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, missionStatus: 'aborted', status: 'tracking' } 
            : t
      ));
      toast.info("משימה בוטלה על ידי המשתמש");
  };

  // Sync attack timeline with map: missile phases drive steps 3–5; impact = validation step done → show end mission button
  const handleMissilePhaseChange = React.useCallback((payload: { targetId: string; missileId: string; phase: 'launched' | 'en_route' | 'impact' }) => {
    const { targetId, phase } = payload;
    setTargets(prev => prev.map(t => {
      if (t.id !== targetId || t.missionType !== 'attack') return t;
      if (phase === 'launched') return { ...t, missionProgress: 3 };
      if (phase === 'en_route') return { ...t, missionProgress: 4 };
      // Impact = validation step (אימות פגיעה) complete → progress past last step so MissionTimeline shows "סיום משימה"
      if (phase === 'impact') return { ...t, missionProgress: 6, missionStatus: 'waiting_confirmation' as const };
      return t;
    }));
  }, []);

  const completeMissionAndClearJammingState = (targetId: string) => {
      if (jammingTargetId === targetId) {
        setJammingTargetId(null);
        setJammingJammerAssetId(null);
      }
      setTargets(prev => prev.map(t => {
          if (t.id !== targetId) return t;
          const newStatus = t.type === 'missile' ? 'event_neutralized' : 'event_resolved';
          return { ...t, missionStatus: 'complete', status: newStatus };
      }));
      toast.success("משימה הושלמה בהצלחה");
  };

  const handleCompleteMission = (targetId: string) => {
      const target = targets.find(t => t.id === targetId);
      if (target?.missionType === 'jamming') {
        setPostJamVerificationTargetId(targetId);
        return;
      }
      if (attackVerificationTargetId === targetId) {
        setAttackVerificationTargetId(null);
        setJammingVerificationActive(null);
      }
      completeMissionAndClearJammingState(targetId);
  };

  const finishMissionAndClearJamming = (targetId: string, method: 'camera' | 'drone' | null) => {
      setPostJamVerificationTargetId(null);
      if (method === null) {
        completeMissionAndClearJammingState(targetId);
        return;
      }
      setJammingVerificationActive({ targetId, method });
  };

  const handleJammingVerificationComplete = () => {
      if (!jammingVerificationActive) return;
      const targetId = jammingVerificationActive.targetId;
      const isAttackVerification = attackVerificationTargetId === targetId;
      setJammingVerificationActive(null);
      if (isAttackVerification) {
        // Drone arrived — don't auto-complete; let user click "סיום משימה"
        return;
      }
      completeMissionAndClearJammingState(targetId);
  };

  const handleSendAttackVerification = (targetId: string) => {
      setAttackVerificationTargetId(targetId);
      setJammingVerificationActive({ targetId, method: 'drone' });
  };

  // --- CUAS Mitigation Handlers ---
  const handleMitigate = useCallback((targetId: string, effectorId: string) => {
    toast.success('שיבוש אלקטרוני הופעל');
    setRegulusEffectors(prev => prev.map(r =>
      r.id === effectorId ? { ...r, status: 'active' as const, activeTargetId: targetId } : r
    ));
    setTargets(prev => appendLog(prev, targetId, `שיבוש — ${effectorId}`).map(t =>
      t.id === targetId ? { ...t, mitigationStatus: 'mitigating' as const, mitigatingEffectorId: effectorId } : t
    ));

    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, 'שיבוש הושלם — יעד נוטרל').map(t =>
        t.id === targetId ? { ...t, mitigationStatus: 'mitigated' as const, status: 'event_neutralized' } : t
      ));
      setRegulusEffectors(prev => prev.map(r =>
        r.id === effectorId ? { ...r, status: 'available' as const, activeTargetId: undefined } : r
      ));
      toast.success('יעד נוטרל בהצלחה');
    }, 10000);
  }, []);

  const JAMMABLE_STATUSES = new Set(['suspicion', 'detection', 'tracking', 'event']);

  const handleMitigateAll = useCallback((targetId?: string) => {
    const available = regulusEffectors.filter(r => r.status === 'available');
    toast.success(`שיבוש מרחבי הופעל — ${available.length} אפקטורים`);

    setRegulusEffectors(prev => prev.map(r =>
      r.status === 'available' ? { ...r, status: 'active' as const, activeTargetId: targetId } : r
    ));

    setTargets(prev => {
      const logged = targetId ? appendLog(prev, targetId, `שיבוש מרחבי — ${available.length} אפקטורים`) : prev;
      return logged.map(t => {
        if (JAMMABLE_STATUSES.has(t.status) && t.mitigationStatus !== 'mitigated') {
          return { ...t, mitigationStatus: 'mitigating' as const, mitigatingEffectorId: 'ALL' };
        }
        return t;
      });
    });

    setTimeout(() => {
      setTargets(prev => {
        const logged = targetId ? appendLog(prev, targetId, 'שיבוש מרחבי הושלם — כל היעדים נוטרלו') : prev;
        return logged.map(t =>
          t.mitigatingEffectorId === 'ALL' && t.mitigationStatus === 'mitigating'
            ? { ...t, mitigationStatus: 'mitigated' as const, status: 'event_neutralized' as const }
            : t
        );
      });
      setRegulusEffectors(prev => prev.map(r => ({ ...r, status: 'available' as const, activeTargetId: undefined })));
      toast.success('כל היעדים נוטרלו בהצלחה');
    }, 10000);
  }, [regulusEffectors]);

  const startBdaSequence = useCallback((targetId: string) => {
    // BDA phases: looking (2s) -> stabilizing (3s) -> observing (5s)
    // Also trigger camera look-at toward target
    const tgt = targets.find(t => t.id === targetId);
    if (tgt) {
      const [latS, lonS] = tgt.coordinates.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(latS) && !isNaN(lonS)) {
        const cam = CAMERA_ASSETS.reduce((best, c) => {
          const d = haversineDistanceM(c.latitude, c.longitude, latS, lonS);
          return (!best || d < best.dist) ? { cam: c, dist: d } : best;
        }, null as { cam: typeof CAMERA_ASSETS[0]; dist: number } | null);
        if (cam && cam.dist <= 3000) {
          setCameraLookAtRequest({ cameraId: cam.cam.id, targetLat: latS, targetLon: lonS });
        }
      }
    }

    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, 'BDA — מתייצב').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'stabilizing' as const } : t
      ));
    }, 2000);
    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, 'BDA — תצפית פעילה').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'observing' as const } : t
      ));
    }, 5000);
  }, [targets]);

  const handleBdaOutcome = useCallback((targetId: string, outcome: 'neutralized' | 'active' | 'lost') => {
    const now = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (outcome === 'neutralized') {
      setTargets(prev => appendLog(prev, targetId, 'BDA — נוטרל').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'complete' as const, status: 'event_neutralized' } : t
      ));
      toast.success('יעד נוטרל בהצלחה');
    } else if (outcome === 'active') {
      setTargets(prev => appendLog(prev, targetId, 'BDA — עדיין פעיל').map(t =>
        t.id === targetId ? { ...t, bdaStatus: undefined, mitigationStatus: 'idle' as const, mitigatingEffectorId: undefined } : t
      ));
      toast.warning('יעד עדיין פעיל — ניתן לשבש שוב');
    } else {
      const tgt = targets.find(t => t.id === targetId);
      setTargets(prev => appendLog(prev, targetId, 'BDA — אבד מגע').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'complete' as const, status: 'expired', lastSeenAt: now, lastSeenCoordinates: tgt?.coordinates } : t
      ));
      toast('יעד אבד — נרשם מיקום אחרון');
    }
    setCameraLookAtRequest(null);
  }, [targets]);

  // --- CUAS Simulation Flow ---
  const cuasIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cuasIntervalRef2 = useRef<NodeJS.Timeout | null>(null);
  const cuasIntervalRef3 = useRef<NodeJS.Timeout | null>(null);
  const cuasMassRefs = useRef<NodeJS.Timeout[]>([]);
  const [cuasGuidedStep, setCuasGuidedStep] = useState<number | null>(null);

  const spawnCuasTarget = useCallback((opts: {
    startLat: number; startLon: number; endLat: number; endLon: number;
    nameSuffix: string; intervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    isBird?: boolean;
    silent?: boolean;
  }) => {
    const targetId = `CUAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const rawDetection: Detection = {
      id: targetId,
      name: `זיהוי ${opts.nameSuffix}`,
      type: 'unknown',
      status: 'detection',
      timestamp: now(),
      coordinates: `${opts.startLat.toFixed(5)}, ${opts.startLon.toFixed(5)}`,
      distance: '3.2 ק״מ',
      entityStage: 'raw_detection',
      confidence: 20,
      contributingSensors: [{
        sensorId: 'RAD-NVT-RADA',
        sensorType: 'Radar',
        firstDetectedAt: now(),
        lastDetectedAt: now(),
      }],
      trail: [{ lat: opts.startLat, lon: opts.startLon, timestamp: now() }],
      actionLog: [{ time: now(), label: 'זיהוי ראשוני — RADA ieMHR' }],
      flowType: 5,
      mitigationStatus: 'idle',
      altitude: '120 מ׳',
    };

    setTargets(prev => [...prev, rawDetection]);

    if (!opts.silent) {
      setActiveTargetId(prev => prev !== null ? prev : targetId);
      if (!activeTargetId) setSidebarOpen(true);
      showTacticalNotification({
        title: 'זיהוי חדש',
        message: `זיהוי לא ידוע — ${rawDetection.contributingSensors?.[0]?.sensorId ?? 'חיישן'}`,
        code: targetId,
        level: 'info',
      });
    }

    let step = 0;
    opts.intervalRef.current = setInterval(() => {
      step++;
      const t = now();
      const progress = Math.min(step / 12, 1);
      const curLat = opts.startLat + (opts.endLat - opts.startLat) * progress;
      const curLon = opts.startLon + (opts.endLon - opts.startLon) * progress;
      const distKm = (3.2 - progress * 2.5).toFixed(1);

      setTargets(prev => prev.map(tgt => {
        if (tgt.id !== targetId) return tgt;
        const updated = { ...tgt };
        updated.coordinates = `${curLat.toFixed(5)}, ${curLon.toFixed(5)}`;
        updated.distance = `${distKm} ק״מ`;
        updated.timestamp = t;
        updated.altitude = `${Math.round(120 + Math.sin(progress * Math.PI) * 30)} מ׳`;
        updated.trail = [...(tgt.trail || []), { lat: curLat, lon: curLon, timestamp: t }];

        if (step === 2 && tgt.entityStage === 'raw_detection') {
          updated.confidence = 45;
          updated.contributingSensors = [
            ...(tgt.contributingSensors || []),
            { sensorId: 'SENS-NVT-MAGOS-N', sensorType: 'Magos', firstDetectedAt: t, lastDetectedAt: t },
          ];
          updated.actionLog = [...(tgt.actionLog || []), { time: t, label: 'חיישן נוסף — Magos North' }];
        }

        if (step === 3 && tgt.entityStage === 'raw_detection') {
          updated.contributingSensors = [
            ...(updated.contributingSensors || []),
            { sensorId: 'RAD-NVT-ELTA', sensorType: 'Radar', firstDetectedAt: t, lastDetectedAt: t },
          ];
          updated.confidence = 65;
          updated.actionLog = [...(updated.actionLog || []), { time: t, label: 'חיישן נוסף — Elta MHR' }];
        }

        if (step === 5 && tgt.entityStage === 'raw_detection') {
          updated.entityStage = 'classified';
          if (opts.isBird) {
            updated.classifiedType = 'bird';
            updated.type = 'unknown';
            updated.name = `ציפור — ${tgt.name}`;
            updated.confidence = 85;
            updated.status = 'suspicion';
          } else {
            updated.classifiedType = 'drone';
            updated.type = 'uav';
            updated.name = `רחפן — ${tgt.name}`;
            updated.confidence = 92;
            updated.status = 'event';
          }
          updated.actionLog = [...(updated.actionLog || []), { time: t, label: opts.isBird ? 'סווג כציפור — ביטחון 85%' : 'סווג כרחפן — ביטחון 92%' }];
          setTimeout(() => {
            showTacticalNotification({
              title: `CUAS — ${updated.name}`,
              message: opts.isBird ? 'זוהה ציפור — ממתין לאישור' : 'איום מסווג — רחפן עוין',
              code: targetId,
              level: opts.isBird ? 'suspect' : 'critical',
            });
          }, 200);
        }

        if (updated.contributingSensors) {
          updated.contributingSensors = updated.contributingSensors.map(s => ({ ...s, lastDetectedAt: t }));
        }

        return updated;
      }));

      if (step >= 12) {
        if (opts.intervalRef.current) clearInterval(opts.intervalRef.current);
      }
    }, 2000);

    return targetId;
  }, []);

  const handleCUASFlow = useCallback(() => {
    setFlowTriggerOpen(false);
    setSidebarOpen(true);
    setCuasGuidedStep(null);

    if (cuasIntervalRef.current) clearInterval(cuasIntervalRef.current);
    if (cuasIntervalRef2.current) clearInterval(cuasIntervalRef2.current);
    if (cuasIntervalRef3.current) clearInterval(cuasIntervalRef3.current);

    // Target 1: From NE
    spawnCuasTarget({
      startLat: 31.235, startLon: 34.695, endLat: 31.210, endLon: 34.665,
      nameSuffix: String(Math.floor(Math.random() * 900) + 100),
      intervalRef: cuasIntervalRef,
    });

    // Target 2: From SW after 15s
    setTimeout(() => {
      spawnCuasTarget({
        startLat: 31.190, startLon: 34.635, endLat: 31.208, endLon: 34.660,
        nameSuffix: String(Math.floor(Math.random() * 900) + 100),
        intervalRef: cuasIntervalRef2,
      });
    }, 15000);

    // Target 3: Bird from N after 25s (false alarm)
    setTimeout(() => {
      spawnCuasTarget({
        startLat: 31.240, startLon: 34.660, endLat: 31.215, endLon: 34.670,
        nameSuffix: String(Math.floor(Math.random() * 900) + 100),
        intervalRef: cuasIntervalRef3,
        isBird: true,
      });
    }, 25000);
  }, [spawnCuasTarget]);

  const GUIDED_STEPS = [
    'זיהוי לא ידוע — צפה בנקודה על המפה',
    'אלגוריתם מסווג — חיישנים נוספים מאשרים',
    'סיווג הושלם — פתח את כרטיס היעד',
    'היעד סווג כרחפן — לחץ "שיבוש"',
    'אשר שיבוש — לחץ "אישור" ולאחר מכן "הפעל שיבוש"',
    'שיבוש פעיל — המתן לסיום',
    'BDA — סמן תוצאה',
    'סיום — היעד נסגר',
  ];

  const handleCUASGuided = useCallback(() => {
    setFlowTriggerOpen(false);
    setSidebarOpen(true);
    setCuasGuidedStep(0);

    if (cuasIntervalRef.current) clearInterval(cuasIntervalRef.current);

    spawnCuasTarget({
      startLat: 31.235, startLon: 34.695, endLat: 31.210, endLon: 34.665,
      nameSuffix: 'G1',
      intervalRef: cuasIntervalRef,
    });
  }, [spawnCuasTarget]);

  const handleCUASMassDetection = useCallback(() => {
    setFlowTriggerOpen(false);
    setSidebarOpen(true);
    setCuasGuidedStep(null);

    cuasMassRefs.current.forEach(ref => clearInterval(ref));
    cuasMassRefs.current = [];

    const baseLat = 31.210;
    const baseLon = 34.665;
    const count = 20;

    for (let i = 0; i < count; i++) {
      const delay = i * 400 + Math.random() * 300;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 0.025 + Math.random() * 0.015;
      const startLat = baseLat + Math.cos(angle) * radius;
      const startLon = baseLon + Math.sin(angle) * radius;
      const endLat = baseLat + (Math.random() - 0.5) * 0.008;
      const endLon = baseLon + (Math.random() - 0.5) * 0.008;
      const isBird = Math.random() < 0.3;

      setTimeout(() => {
        const ref: React.MutableRefObject<NodeJS.Timeout | null> = { current: null };
        spawnCuasTarget({
          startLat, startLon, endLat, endLon,
          nameSuffix: String(100 + i),
          intervalRef: ref,
          isBird,
          silent: true,
        });
        if (ref.current) cuasMassRefs.current.push(ref.current);
      }, delay);
    }

    setTimeout(() => {
      showTacticalNotification({
        title: 'התראת נחיל',
        message: `${count} זיהויים בו-זמנית — מצב חירום`,
        code: 'SWARM',
        level: 'critical',
      });
    }, 300);
  }, [spawnCuasTarget]);

  const handleEngage = (targetId: string, method: 'jamming' | 'attack') => {
      const message = method === 'jamming' ? "הופעל שיבוש אלקטרוני" : "אישור ירי התקבל";
      toast.success(message);

      if (method === 'jamming') {
        const target = targets.find(t => t.id === targetId);
        if (target) {
          const [latStr, lonStr] = target.coordinates.split(',').map(s => s.trim());
          const lat = parseFloat(latStr);
          const lon = parseFloat(lonStr);
          if (!isNaN(lat) && !isNaN(lon)) {
            const closest = getClosestAssetsForTarget(lat, lon, 5).find(a => a.id !== 'DRONE-MOCK');
            if (closest) setJammingJammerAssetId(closest.id);
          }
          setJammingTargetId(targetId);
        }
        const jammingSteps = ['שיבוש אלקטרוני פעיל'];
        setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { 
                ...t, 
                status: 'event', 
                missionType: 'jamming',
                missionStatus: 'waiting_confirmation',
                missionSteps: jammingSteps,
                missionProgress: 1,
              }
            : t
        ));
      }

      if (method === 'attack') {
        // Timeline steps 0–2 auto-advance; 3–5 are driven by map (launched → en_route → impact)
        const attackSteps = [
          "אישור פרוטוקול ירי...",
          "חישוב מסלול בליסטי...",
          "פתיחת מסילות שיגור...",
          "שיגור טיל וייצוב מסלול...",
          "טיל בדרך למטרה...",
          "אימות פגיעה במטרה..."
        ];

        setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { 
                ...t, 
                status: 'event',
                type: 'missile',
                name: t.name || "איום בליסטי",
                missionType: 'attack',
                missionStatus: 'planning',
                missionSteps: attackSteps,
                missionProgress: 0,
              }
            : t
        ));

        // Trigger a missile launch simulation on the map
        const target = targets.find(t => t.id === targetId);
        if (target) {
          const [latStr, lonStr] = target.coordinates.split(',');
          const endLat = parseFloat(latStr.trim());
          const endLon = parseFloat(lonStr.trim());

          // Find nearest launcher to the target so missile visually leaves from a launcher site
          let startLat = 31.80;
          let startLon = 34.70;
          if (LAUNCHER_ASSETS.length > 0) {
            let bestDistSq = Number.POSITIVE_INFINITY;
            for (const l of LAUNCHER_ASSETS) {
              const dLat = l.latitude - endLat;
              const dLon = l.longitude - endLon;
              const distSq = dLat * dLat + dLon * dLon;
              if (distSq < bestDistSq) {
                bestDistSq = distSq;
                startLat = l.latitude;
                startLon = l.longitude;
              }
            }
          }

          const launch: MissileLaunchRequest = {
            id: `MISSILE-${Date.now()}-${targetId}`,
            targetId,
            startLat,
            startLon,
            endLat,
            endLon,
          };
          setPendingMissileLaunch(launch);
        }
      }
  };

  return (
    <div className="relative flex w-full h-screen overflow-hidden text-white font-sans selection:bg-red-500/30" dir="rtl">
      
      {/* Left Side Nav */}
      <nav className="flex flex-col w-14 sm:w-16 flex-shrink-0 h-full bg-[#1a1a1a] backdrop-blur border-l border-white/10 z-20" dir="ltr">
        {/* Logo */}
        <div className="flex items-center justify-center py-4 border-b border-white/10 h-[60px] w-full">
          <div className="text-white scale-75 origin-center">
            <C2Logo />
          </div>
        </div>

        {/* Nav: list, simulation — fills space */}
        <div className="flex flex-col items-center gap-0.5 py-3 flex-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={sidebarOpen ? 'סגור רשימת מערכות' : 'פתח רשימת מערכות'}
          >
            <List size={20} strokeWidth={1.5} />
          </button>
          <div data-mission-planner>
            <button
              ref={missionPlannerBtnRef}
              onClick={toggleMissionPlanner}
              className={`p-2.5 rounded-lg transition-colors ${
                missionPlannerOpen || missionPlanningMode
                  ? 'text-violet-400 bg-violet-500/20'
                  : 'text-gray-400 hover:text-violet-300 hover:bg-violet-500/10'
              }`}
              title="תכנון משימה"
            >
              <Route size={20} strokeWidth={1.5} />
            </button>
          </div>
          <div data-flow-trigger>
            <button
              ref={flowTriggerBtnRef}
              onClick={toggleFlowTrigger}
              className="p-2.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-colors"
              title="סימולציות"
            >
              <PlayCircle size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Storybook + Notifications at bottom */}
        <div className="border-t border-white/10 flex flex-col items-center gap-0.5 py-2">
          <a
            href="http://localhost:6006"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-lg text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 transition-colors w-full flex justify-center"
            title="Storybook"
          >
            <BookOpen size={20} strokeWidth={1.5} />
          </a>
          <NotificationCenter
            trigger={
              <button
                className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors w-full flex justify-center"
                title="התראות"
              >
                <Bell size={20} strokeWidth={1.5} />
              </button>
            }
          />
        </div>
      </nav>

      {/* Map (full bleed behind content) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <TacticalMap 
          focusCoords={focusCoords} 
          targets={targets}
          activeTargetId={activeTargetId}
          onMarkerClick={(id) => { setActiveTargetId(id); setSidebarOpen(true); }}
          missileLaunchRequest={pendingMissileLaunch}
          highlightedSensorIds={highlightedSensorIds}
          onMissilePhaseChange={handleMissilePhaseChange}
          hoveredSensorIdFromCard={hoveredSensorIdFromCard}
          sensorFocusId={sensorFocusId}
          onContextMenuAction={(action, elementType, elementId) => {
            if (elementType === 'target') {
              if (action === 'open-card') { setActiveTargetId(elementId); setSidebarOpen(true); }
              else if (action === 'mitigate') { setActiveTargetId(elementId); setSidebarOpen(true); }
              else if (action === 'mitigate-all') { handleMitigateAll(elementId); }
              else if (action === 'dismiss') { handleDismiss(elementId); }
              else if (action === 'track') { setActiveTargetId(elementId); setSidebarOpen(true); }
              else if (action === 'investigate') { setActiveTargetId(elementId); setSidebarOpen(true); }
            }
          }}
          jammingTargetId={jammingTargetId}
          jammingJammerAssetId={jammingJammerAssetId}
          jammingVerification={jammingVerificationActive}
          onJammingVerificationComplete={handleJammingVerificationComplete}
          cameraLookAtRequest={cameraLookAtRequest}
          controlIndicator={controlIndicator}
          fitBoundsPoints={fitBoundsPoints}
          activeDrone={flow3ActiveDrone}
          missionRoute={flow4ActiveRoute}
          planningMode={!!missionPlanningMode && missionPlanningMode.missionType === 'drone'}
          planningMissionType={missionPlanningMode?.missionType}
          planningScanViz={missionPlanningMode?.missionType === 'ptz' && missionPlanningMode?.selectedCameraId
            ? (() => {
                const cam = CAMERA_ASSETS.find(c => c.id === missionPlanningMode.selectedCameraId);
                if (!cam) return null;
                const center = missionPlanningMode.scanCenterDeg ?? 0;
                const width = missionPlanningMode.scanWidthDeg ?? 60;
                const steps = missionPlanningMode.scanSteps ?? 4;
                const half = width / 2;
                const bearings = Array.from({ length: steps }, (_, i) => {
                  const angle = center - half + (width / (steps - 1)) * i;
                  return Math.round(((angle % 360) + 360) % 360);
                });
                return { cameraLat: cam.latitude, cameraLon: cam.longitude, bearings };
              })()
            : null
          }
          selectedAssetId={missionPlanningMode?.selectedCameraId ?? null}
          onMapClick={handlePlanningMapClick}
          regulusEffectors={regulusEffectors}
        />

        {/* Right Sidebar - List of Systems */}
        <aside 
          className={`
            absolute top-0 bottom-0 w-96 bg-[#141414]/90 backdrop-blur border-l border-white/10 flex flex-col transition-all duration-300 ease-in-out z-10
            ${sidebarOpen ? 'translate-x-0 right-0' : 'translate-x-full right-0'}
          `}
        >
          <div className="p-3 border-b border-white/5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">מערכות פעילות ({targets.length})</h2>
          </div>
          {postJamVerificationTargetId && (
              <div className="p-3 border-b border-amber-500/30 bg-amber-950/20" dir="rtl">
                <p className="text-xs font-medium text-amber-200 mb-3">
                  אימות שיבוש: האם להפנות מצלמה או לשלוח רחפן לאימות שיבוש הרחפן?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => finishMissionAndClearJamming(postJamVerificationTargetId, 'camera')}
                    className="w-full px-3 py-2 text-xs font-medium rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                  >
                    הפנה מצלמה לאימות
                  </button>
                  <button
                    onClick={() => finishMissionAndClearJamming(postJamVerificationTargetId, 'drone')}
                    className="w-full px-3 py-2 text-xs font-medium rounded border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    שלח רחפן לאימות
                  </button>
                  <button
                    onClick={() => finishMissionAndClearJamming(postJamVerificationTargetId, null)}
                    className="w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    סיים בלי אימות
                  </button>
                </div>
              </div>
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <ListOfSystems 
              className="flex flex-col gap-2" 
              targets={targets}
              activeTargetId={activeTargetId}
              onTargetClick={handleTargetClick}
              onVerify={handleStartMission}
              onDismiss={handleDismiss}
              onCancelMission={handleCancelMission}
              onCompleteMission={handleCompleteMission}
              onEngage={handleEngage}
              onSendDroneVerification={handleSendAttackVerification}
              droneVerifyingTargetId={attackVerificationTargetId}
              onSensorHover={setHoveredSensorIdFromCard}
              onCameraLookAt={handleCameraLookAt}
              onTakeControl={handleTakeControl}
              onReleaseControl={handleReleaseControl}
              onSensorModeChange={handleSensorModeChange}
              onPlaybookSelect={handlePlaybookSelect}
              onClosureOutcome={handleClosureOutcome}
              onAdvanceFlowPhase={handleAdvanceFlowPhase}
              nearbyCameras={nearbyCameras}
              nearbyHives={nearbyHives}
              onEscalateCreatePOI={handleEscalateCreatePOI}
              onEscalateSendDrone={handleEscalateSendDrone}
              onDroneSelect={handleDroneSelect}
              onDroneOverride={handleDroneOverride}
              onDroneResume={handleDroneResume}
              onDroneRTB={handleDroneRTB}
              onMissionActivate={handleMissionActivate}
              onMissionPause={handleMissionPause}
              onMissionResume={handleMissionResume}
              onMissionOverride={handleMissionOverride}
              onMissionCancel={handleMissionCancel}
              missionPlanningMode={missionPlanningMode}
              onPlanningRemoveWaypoint={handlePlanningRemoveWaypoint}
              onPlanningToggleLoop={handlePlanningToggleLoop}
              onPlanningFinalize={handlePlanningFinalize}
              onPlanningUpdateWaypoint={handlePlanningUpdateWaypoint}
              onPlanningSetRepetitions={handlePlanningSetRepetitions}
              onPlanningSetDwellTime={handlePlanningSetDwellTime}
              onPlanningSetScanCenter={handlePlanningSetScanCenter}
              onPlanningSetScanWidth={handlePlanningSetScanWidth}
              onPlanningSetScanSteps={handlePlanningSetScanSteps}
              onPlanningSelectCamera={handlePlanningSelectCamera}
              onPlanningZoomCameras={handlePlanningZoomCameras}
              onMitigate={handleMitigate}
              onMitigateAll={handleMitigateAll}
              regulusEffectors={regulusEffectors}
              onBdaOutcome={handleBdaOutcome}
              cameraActiveTargetId={cameraLookAtRequest ? targets.find(t => {
                const [lat, lon] = t.coordinates.split(',').map(s => parseFloat(s.trim()));
                return Math.abs(lat - cameraLookAtRequest.targetLat) < 0.01 && Math.abs(lon - cameraLookAtRequest.targetLon) < 0.01;
              })?.id ?? null : null}
              onSensorFocus={(sensorId) => {
                setSensorFocusId(sensorId);
                setTimeout(() => setSensorFocusId(null), 2000);
              }}
            />
          </div>
          <div className="p-3 border-t border-white/5 bg-black/20 text-[10px] text-gray-600 font-mono text-center" dir="ltr">
            SYSTEM V.2.4.1 // SECURE
          </div>
        </aside>

        <main className="flex-1 relative pointer-events-none min-h-0" />
      </div>

      <NotificationSystem />

      {/* Jam All modal — auto-triggered by 10+ rapid detections */}
      <AlertDialog open={showJamAllModal} onOpenChange={setShowJamAllModal}>
        <AlertDialogContent className="bg-[#141414] border-red-500/30 text-white max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400 text-lg">
              <Zap size={20} className="text-red-400" />
              זוהו איומים מרובים
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm leading-relaxed">
              {burstDetectionCount} זיהויים ב-10 שניות האחרונות.
              <br />
              הפעלת שיבוש מרחבי תנטרל את כל היעדים הפעילים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:flex-row-reverse">
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                handleMitigateAll();
                setShowJamAllModal(false);
                jamAllModalDismissedRef.current = true;
                setTimeout(() => { jamAllModalDismissedRef.current = false; }, 30_000);
              }}
            >
              הפעל שיבוש מרחבי
            </AlertDialogAction>
            <AlertDialogCancel
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              onClick={() => {
                setShowJamAllModal(false);
                jamAllModalDismissedRef.current = true;
                setTimeout(() => { jamAllModalDismissedRef.current = false; }, 30_000);
              }}
            >
              ביטול
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flow Trigger Panel (portal to escape stacking contexts) */}
      {flowTriggerOpen && flowTriggerRect && createPortal(
        <div
          data-flow-panel
          className="fixed w-52 rounded-lg border border-white/15 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl py-1.5 select-none"
          style={{ top: flowTriggerRect.top, left: flowTriggerRect.left, zIndex: 99999 }}
          dir="rtl"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/10 mb-1">סימולציות</div>
          <button onClick={handleFlow1} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-right">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <span>התרעה → חקירה → פעולה</span>
          </button>
          <button onClick={handleFlow2} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-right">
            <CrosshairIcon size={14} className="text-zinc-400 shrink-0" />
            <span>מעקב ידני ושליטה</span>
          </button>
          <button onClick={handleFlow3} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-right">
            <span className="shrink-0 opacity-70"><MapDroneIcon size={14} fill="currentColor" /></span>
            <span>שיגור רחפן</span>
          </button>
          <div className="border-t border-white/10 mt-1 pt-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">CUAS</div>
            <button onClick={handleCUASFlow} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-right">
              <ShieldAlert size={14} className="shrink-0 text-zinc-400" />
              <span>תרחיש מלא (3 יעדים)</span>
            </button>
            <button onClick={handleCUASGuided} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-right">
              <Route size={14} className="shrink-0 text-zinc-400" />
              <span>הדגמה מודרכת (צעד אחר צעד)</span>
            </button>
            <button onClick={handleCUASMassDetection} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-right">
              <Radar size={14} className="shrink-0 text-zinc-400" />
              <span>תרחיש נחיל (20 יעדים)</span>
            </button>
          </div>
          <div className="border-t border-white/10 mt-1 pt-1">
            <button onClick={() => { setFlowTriggerOpen(false); handleSimulateDetection(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-colors text-right">
              <PlayCircle size={14} className="shrink-0" />
              <span>סימולציית זיהוי (4 חשודים)</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Mission Planner Panel (portal) */}
      {missionPlannerOpen && missionPlannerRect && createPortal(
        <div
          data-mission-planner-panel
          className="fixed w-[260px] rounded-lg border border-violet-500/20 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl p-3 select-none"
          style={{ top: missionPlannerRect.top, left: missionPlannerRect.left, zIndex: 99999 }}
          dir="rtl"
        >
          <div className="text-[11px] font-bold text-zinc-400 mb-3">תכנון משימה</div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMissionPlannerSelect('drone')}
              className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <MapDroneIcon size={18} fill="currentColor" className="text-violet-400" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold text-white">מסלול רחפן</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">סימון נקודות ציון על המפה</div>
              </div>
            </button>
            <button
              onClick={() => handleMissionPlannerSelect('ptz')}
              className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Camera size={18} className="text-cyan-400" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold text-white">סריקת מצלמה</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">סריקת PTZ אוטומטית</div>
              </div>
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* CUAS Guided Demo Step Indicator */}
      {cuasGuidedStep !== null && cuasGuidedStep < GUIDED_STEPS.length && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto" dir="rtl">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-emerald-500/30 rounded-xl shadow-2xl px-5 py-3 max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-[11px] font-bold shrink-0">
                {cuasGuidedStep + 1}
              </div>
              <div className="text-[12px] font-semibold text-white">{GUIDED_STEPS[cuasGuidedStep]}</div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-0.5 flex-1">
                {GUIDED_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full flex-1 transition-colors ${i <= cuasGuidedStep ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                ))}
              </div>
              <button
                onClick={() => setCuasGuidedStep(prev => prev !== null && prev < GUIDED_STEPS.length - 1 ? prev + 1 : null)}
                className="px-3 py-1.5 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {cuasGuidedStep < GUIDED_STEPS.length - 1 ? 'הבא ←' : 'סיום'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};