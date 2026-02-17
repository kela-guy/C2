import React, { useState, useEffect } from 'react';
import { TacticalMap, findDetectingSensors, LAUNCHER_ASSETS, getClosestAssetsForTarget } from './TacticalMap';
import type { MissileLaunchRequest } from './TacticalMap';
import { NotificationSystem, showTacticalNotification } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import ListOfSystems, { TargetSystem } from '@/imports/ListOfSystems';
import { List, Bell, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  const [targets, setTargets] = useState<TargetSystem[]>([]);
  const [pendingMissileLaunch, setPendingMissileLaunch] = useState<MissileLaunchRequest | null>(null);
  const [hoveredSensorIdFromCard, setHoveredSensorIdFromCard] = useState<string | null>(null);
  const [hoveredAvailableAssetId, setHoveredAvailableAssetId] = useState<string | null>(null);
  /** When user clicks שיבוש: target being jammed and the map asset (antenna) doing the jamming. Cleared on "סיום משימה". */
  const [jammingTargetId, setJammingTargetId] = useState<string | null>(null);
  const [jammingJammerAssetId, setJammingJammerAssetId] = useState<string | null>(null);
  /** After "סיום משימה" on a jamming mission: show verification choice (camera / drone / skip). */
  const [postJamVerificationTargetId, setPostJamVerificationTargetId] = useState<string | null>(null);
  /** When user chose camera or drone: active verification to show on map; cleared when map calls onJammingVerificationComplete. */
  const [jammingVerificationActive, setJammingVerificationActive] = useState<{ targetId: string; method: 'camera' | 'drone' } | null>(null);

  // Derived State
  const activeTarget = targets.find(t => t.id === activeTargetId);
  const focusCoords = activeTarget 
    ? { 
        lat: parseFloat(activeTarget.coordinates.split(',')[0]), 
        lon: parseFloat(activeTarget.coordinates.split(',')[1]) 
      }
    : null;

  // Sensors currently associated with suspect targets (for map highlighting)
  const highlightedSensorIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const t of targets) {
      if (t.status === 'suspect' && t.detectedBySensors) {
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

    window.addEventListener('trigger-critical-alert', handleCritical);
    window.addEventListener('trigger-suspect-alert', handleSuspect);
    window.addEventListener('toast-clicked', handleToastClick);
    
    return () => {
        window.removeEventListener('trigger-critical-alert', handleCritical);
        window.removeEventListener('trigger-suspect-alert', handleSuspect);
        window.removeEventListener('toast-clicked', handleToastClick);
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

          const newTarget: TargetSystem = {
              id: newId,
              name: "חשד לזיהוי",
              type: "unknown",
              status: "suspect",
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
              title: "חשד לזיהוי חדש",
              message: `זוהתה תנועה חשודה בגזרה. נ״צ ${newTarget.coordinates}`,
              level: "suspect",
              code: newId
          });

          count++;
      }, 1500); // Add one every 1.5 seconds
  };

  const handleTargetClick = (target: TargetSystem) => {
      setActiveTargetId(target.id);
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
                status: 'active', 
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
      setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, status: 'expired' as const, dismissReason: reason } 
            : t
      ));
      if (activeTargetId === targetId) setActiveTargetId(null);
      toast(reason ? `הוסר: ${reason}` : "מטרה הוסרה ממעקב");
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
          const newStatus = t.type === 'missile' ? 'neutralized' : 'success';
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
      setJammingVerificationActive(null);
      completeMissionAndClearJammingState(targetId);
  };

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
                status: 'engaged', 
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
                status: 'engaged',
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
          <button
            onClick={handleSimulateDetection}
            className="p-2.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-colors"
            title="סימולציית זיהוי"
          >
            <PlayCircle size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Notifications at bottom */}
        <div className="border-t border-white/10 flex justify-center py-2">
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
          onMarkerClick={setActiveTargetId}
          missileLaunchRequest={pendingMissileLaunch}
          highlightedSensorIds={highlightedSensorIds}
          onMissilePhaseChange={handleMissilePhaseChange}
          hoveredSensorIdFromCard={hoveredSensorIdFromCard}
          hoveredAvailableAssetId={hoveredAvailableAssetId}
          jammingTargetId={jammingTargetId}
          jammingJammerAssetId={jammingJammerAssetId}
          jammingVerification={jammingVerificationActive}
          onJammingVerificationComplete={handleJammingVerificationComplete}
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
              getClosestAssets={(t) => {
                const parts = t.coordinates.split(',').map(s => parseFloat(s.trim()));
                if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return [];
                return getClosestAssetsForTarget(parts[0], parts[1], 5);
              }}
              onSensorHover={setHoveredSensorIdFromCard}
              onAvailableAssetHover={setHoveredAvailableAssetId}
            />
          </div>
          <div className="p-3 border-t border-white/5 bg-black/20 text-[10px] text-gray-600 font-mono text-center" dir="ltr">
            SYSTEM V.2.4.1 // SECURE
          </div>
        </aside>

        <main className="flex-1 relative pointer-events-none min-h-0" />
      </div>

      <NotificationSystem />
    </div>
  );
};