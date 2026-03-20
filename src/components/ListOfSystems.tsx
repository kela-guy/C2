import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Clock,
  MapPin,
  Ruler,
  Mountain,
  Activity,
  Camera,
  Radio,
  Satellite,
  Crosshair,
  Eye,
} from "lucide-react";
import { AccordionSection } from "./AccordionSection";
import { TelemetryRow } from "./TelemetryRow";
import { CompactSystemRow } from "./CompactSystemRow";
import { StatusChip } from "./StatusChip";
import { ActionButton } from "./ActionButton";
import { VideoOverlay } from "./VideoOverlay";

export function ListOfSystems() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div
      className="w-[340px] flex flex-col gap-0 bg-[#1a1a1a] rounded-lg shadow-[0_0_0_1px_#333] overflow-hidden"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <button className="text-zinc-500 hover:text-white transition-colors">
            <ArrowRight size={16} />
          </button>
          <StatusChip text={formatTime(elapsed)} />
        </div>
        <h2 className="text-sm font-semibold text-zinc-200">פרטי אירוע</h2>
      </div>

      {/* Video Section */}
      <AccordionSection title="זיהוי ויזואלי" icon={Camera} defaultOpen>
        <VideoOverlay cameraLabel="מצלמה 03" />
      </AccordionSection>

      {/* Telemetry Section */}
      <AccordionSection title="נתוני טלמטריה" icon={Activity} defaultOpen>
        <div className="flex flex-col gap-0.5 py-1">
          <TelemetryRow label="מיקום" value="32.0853° N, 34.7818° E" icon={MapPin} />
          <TelemetryRow label="מרחק" value="2.4 ק״מ" icon={Ruler} />
          <TelemetryRow label="גובה" value="120 מ׳" icon={Mountain} />
          <TelemetryRow label="מהירות" value="45 קמ״ש" icon={Activity} />
          <TelemetryRow label="זמן זיהוי" value="00:10:22" icon={Clock} />
        </div>
      </AccordionSection>

      {/* Detecting Systems */}
      <AccordionSection title="מערכות מזהות" icon={Satellite}>
        <div className="flex flex-col py-1">
          <CompactSystemRow time="00:10:22" name="Pixelsight" icon={Camera} />
          <CompactSystemRow time="00:10:25" name="Regulus" icon={Radio} />
          <CompactSystemRow time="00:10:28" name="Rafael Drone Dome" icon={Satellite} />
        </div>
      </AccordionSection>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-t border-[#333]">
        <ActionButton label="חקירה" icon={Eye} />
        <ActionButton label="נטרל" icon={Crosshair} />
      </div>
    </div>
  );
}
