import React, { useState, useEffect } from 'react';
import { TacticalMap } from './TacticalMap';
import { NotificationSystem, showTacticalNotification } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import ListOfSystems, { MOCK_TARGETS, TargetSystem } from '@/imports/ListOfSystems';
import { 
  Menu, 
  Globe, 
  Wifi, 
  Battery, 
  Clock,
  PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const C2Dashboard = () => {
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Simulation State
  const [targets, setTargets] = useState<TargetSystem[]>(MOCK_TARGETS);

  // Derived State
  const activeTarget = targets.find(t => t.id === activeTargetId);
  const focusCoords = activeTarget 
    ? { 
        lat: parseFloat(activeTarget.coordinates.split(',')[0]), 
        lon: parseFloat(activeTarget.coordinates.split(',')[1]) 
      }
    : null;

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

  // --- Mission Logic ---
  useEffect(() => {
      const missionInterval = setInterval(() => {
          setTargets(prev => prev.map(t => {
              if (t.missionStatus === 'planning' || t.missionStatus === 'executing') {
                  const currentProgress = t.missionProgress || 0;
                  const totalSteps = t.missionSteps?.length || 0;
                  
                  if (currentProgress < totalSteps) {
                      return { ...t, missionProgress: currentProgress + 1 };
                  } else {
                      // Don't auto-complete. Set to waiting_confirmation or stay at last step.
                      // We will use 'waiting_confirmation' to trigger the UI button.
                      return { ...t, missionStatus: 'waiting_confirmation' };
                  }
              }
              return t;
          }));
      }, 2000); // Advance step every 2 seconds

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
          const latOffset = (Math.random() - 0.5) * 0.1;
          const lonOffset = (Math.random() - 0.5) * 0.1;

          const newTarget: TargetSystem = {
              id: newId,
              name: "חשד לזיהוי",
              type: "unknown",
              status: "suspect",
              timestamp: new Date().toLocaleTimeString('he-IL', { hour12: false }),
              coordinates: `${(baseLat + latOffset).toFixed(4)}, ${(baseLon + lonOffset).toFixed(4)}`,
              distance: `${(Math.random() * 5).toFixed(1)} ק״מ`,
              isNew: true
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

  const handleDismiss = (targetId: string) => {
      setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, status: 'expired' } 
            : t
      ));
      if (activeTargetId === targetId) setActiveTargetId(null);
      toast("מטרה הוסרה ממעקב");
  };

  const handleCancelMission = (targetId: string) => {
      setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, missionStatus: 'aborted', status: 'tracking' } 
            : t
      ));
      toast.info("משימה בוטלה על ידי המשתמש");
  };

  const handleCompleteMission = (targetId: string) => {
      setTargets(prev => prev.map(t => {
          if (t.id !== targetId) return t;

          // If tracking mission -> success (cleared)
          // If intercept mission -> neutralized (cleared)
          const newStatus = t.type === 'missile' ? 'neutralized' : 'success';
          
          return { 
              ...t, 
              missionStatus: 'complete', 
              status: newStatus 
          };
      }));
      toast.success("משימה הושלמה בהצלחה");
  };

  const handleEngage = (targetId: string, method: 'jamming' | 'attack') => {
      const message = method === 'jamming' ? "הופעל שיבוש אלקטרוני" : "אישור ירי התקבל";
      toast.success(message);

      // Update status to engaged
       setTargets(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, status: 'engaged', missionStatus: 'complete' }
            : t
      ));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans selection:bg-red-500/30" dir="rtl">
      
      {/* Background Map with dynamic focus */}
      <TacticalMap 
        focusCoords={focusCoords} 
        targets={targets}
        activeTargetId={activeTargetId}
        onMarkerClick={setActiveTargetId}
      />

      {/* Header / Top Bar */}
      <header className="absolute top-0 left-0 right-0 h-16 bg-[#141414]/80 backdrop-blur border-b border-white/10 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <Globe className="text-blue-500 animate-pulse" size={20} />
            <h1 className="text-lg font-bold tracking-widest uppercase flex items-center gap-2">
              <span>שו"ב</span>
              <span className="text-red-500">מבצעי</span>
            </h1>
          </div>

          <div className="h-6 w-[1px] bg-white/10 mx-2" />

          {/* Simulation Trigger Button (Visible for Demo) */}
          <button 
            onClick={handleSimulateDetection}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded text-blue-300 text-xs font-bold hover:bg-blue-900/50 transition-colors"
          >
            <PlayCircle size={14} />
            סימולציית זיהוי
          </button>
        </div>

        <div className="flex items-center gap-4">
           {/* Status Indicators */}
           <div className="flex items-center gap-3 text-xs font-mono text-gray-500 ml-4 border-l border-white/10 pl-4 h-8" dir="ltr">
              <div className="flex items-center gap-1.5">
                 <Wifi size={14} className="text-green-500" />
                 <span>ONLINE</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <Battery size={14} className="text-green-500" />
                 <span>100%</span>
              </div>
              <div className="flex items-center gap-1.5 w-20 justify-end">
                 <Clock size={14} />
                 <span>{currentTime.toLocaleTimeString('he-IL', { hour12: false })}</span>
              </div>
           </div>

           {/* Notification Center */}
           <NotificationCenter />
           
           {/* User Profile (Placeholder) */}
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-white/20 shadow-lg" />
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-full pt-16">
        
        {/* Right Sidebar - List of Systems */}
        <aside 
          className={`
            w-96 bg-[#141414]/90 backdrop-blur border-l border-white/10 flex flex-col transition-all duration-300 ease-in-out z-10
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full absolute h-full right-0'}
          `}
        >
           <div className="p-3 border-b border-white/5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">מערכות פעילות ({targets.length})</h2>
           </div>
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
              />
           </div>
           
           {/* System Footer */}
           <div className="p-3 border-t border-white/5 bg-black/20 text-[10px] text-gray-600 font-mono text-center" dir="ltr">
              SYSTEM V.2.4.1 // SECURE
           </div>
        </aside>

        {/* Center Area - Map is background */}
        <main className="flex-1 relative pointer-events-none">
           {/* Empty main area - map is behind everything */}
        </main>
      </div>

      {/* Notification System (Toasts + Vignette) */}
      <NotificationSystem />

    </div>
  );
};