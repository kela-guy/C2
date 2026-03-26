import type { Detection } from '@/imports/ListOfSystems';

export const flow1_suspicion: Detection = {
  id: 't-001',
  name: 'חשד תנועה - גזרה צפונית',
  type: 'unknown',
  status: 'suspicion',
  timestamp: '00:10:22',
  createdAtMs: Date.now() - 120_000,
  coordinates: '32.0853° N, 34.7818° E',
  distance: '2.4 ק״מ',
  flowType: 1,
  flowPhase: 'trigger',
  detectedBySensors: [
    { id: 's1', typeLabel: 'Pixelsight', latitude: 32.09, longitude: 34.78 },
  ],
  actionLog: [{ time: '00:10:22', label: 'זוהתה תנועה חשודה' }],
};

export const flow1_investigation: Detection = {
  ...flow1_suspicion,
  id: 't-002',
  status: 'detection',
  flowPhase: 'investigate',
  actionLog: [
    { time: '00:10:22', label: 'זוהתה תנועה חשודה' },
    { time: '00:10:45', label: 'התחלת חקירה' },
  ],
};

export const flow1_decide: Detection = {
  ...flow1_investigation,
  id: 't-003',
  flowPhase: 'decide',
  actionLog: [
    ...flow1_investigation.actionLog!,
    { time: '00:11:02', label: 'אימות ויזואלי' },
    { time: '00:11:15', label: 'החלטה נדרשת' },
  ],
};

export const flow1_act: Detection = {
  ...flow1_decide,
  id: 't-004',
  flowPhase: 'act',
  status: 'detection',
  name: 'משימה בביצוע',
  missionStatus: 'executing',
  missionType: 'surveillance',
  missionSteps: ['שיגור רחפן', 'טיסה ליעד', 'סריקה', 'חזרה'],
  missionProgress: 1,
  actionLog: [
    ...flow1_decide.actionLog!,
    { time: '00:11:30', label: 'נבחר: חקירה מהירה' },
    { time: '00:11:31', label: 'רחפן שוגר' },
  ],
};

export const flow2_investigate: Detection = {
  id: 't-009',
  name: 'תח״ש — תצפיתן',
  type: 'unknown',
  status: 'suspicion',
  timestamp: '00:09:00',
  createdAtMs: Date.now() - 120_000,
  coordinates: '32.0880° N, 34.7900° E',
  distance: '1.5 ק״מ',
  flowType: 2,
  flowPhase: 'investigate',
  detectedBySensors: [
    { id: 's1', typeLabel: 'Pixelsight', latitude: 32.09, longitude: 34.78 },
  ],
  actionLog: [
    { time: '00:09:00', label: 'תנועה חשודה דווחה' },
    { time: '00:09:05', label: 'מעקב ידני פעיל' },
  ],
};

export const flow2_tracking: Detection = {
  id: 't-010',
  name: 'מטרה מסווגת - רחפן',
  type: 'uav',
  status: 'tracking',
  timestamp: '00:08:15',
  createdAtMs: Date.now() - 120_000,
  coordinates: '32.1120° N, 34.8050° E',
  distance: '1.8 ק״מ',
  flowType: 2,
  flowPhase: 'orient',
  entityStage: 'classified',
  classifiedType: 'drone',
  confidence: 0.92,
  altitude: '85 מ׳',
  mitigationStatus: 'idle',
  detectedBySensors: [
    { id: 's1', typeLabel: 'Pixelsight', latitude: 32.09, longitude: 34.78 },
    { id: 's2', typeLabel: 'Regulus', latitude: 32.10, longitude: 34.79 },
  ],
};

export const flow2_mitigating: Detection = {
  ...flow2_tracking,
  id: 't-011',
  status: 'event',
  flowPhase: 'act',
  mitigationStatus: 'mitigating',
  mitigatingEffectorId: 'eff-1',
};

export const flow2_mitigated: Detection = {
  ...flow2_tracking,
  id: 't-012',
  status: 'event_neutralized',
  flowPhase: 'closure',
  mitigationStatus: 'mitigated',
  bdaStatus: 'pending',
};

export const flow3_flying: Detection = {
  id: 't-020',
  name: 'חשד חדירה - מגזר מזרחי',
  type: 'unknown',
  status: 'detection',
  timestamp: '00:05:30',
  createdAtMs: Date.now() - 120_000,
  coordinates: '32.0950° N, 34.8200° E',
  distance: '3.1 ק״מ',
  flowType: 3,
  flowPhase: 'investigate',
  droneDeployment: {
    droneId: 'drone-1',
    hiveId: 'hive-1',
    hiveLat: 32.085,
    hiveLon: 34.78,
    targetLat: 32.095,
    targetLon: 34.82,
    currentLat: 32.09,
    currentLon: 34.80,
    phase: 'flying',
    battery: 85,
    overridden: false,
  },
};

export const flow3_onStation: Detection = {
  ...flow3_flying,
  id: 't-021',
  droneDeployment: {
    ...flow3_flying.droneDeployment!,
    phase: 'on_station',
    currentLat: 32.095,
    currentLon: 34.82,
    battery: 72,
  },
};

export const flow4_mission: Detection = {
  id: 't-030',
  name: 'משימת סריקה - אזור B',
  type: 'uav',
  status: 'event',
  timestamp: '00:12:00',
  createdAtMs: Date.now() - 120_000,
  coordinates: '32.0800° N, 34.7700° E',
  distance: '1.2 ק״מ',
  flowType: 4,
  missionStatus: 'executing',
  missionType: 'attack',
  missionSteps: ['נעילת מטרה', 'אישור ירי', 'שיגור', 'פגיעה', 'אימות'],
  missionProgress: 2,
};

export const flow4_complete: Detection = {
  ...flow4_mission,
  id: 't-031',
  missionStatus: 'complete',
  missionProgress: 5,
  status: 'event_neutralized',
};

export const flow5_mitigated: Detection = {
  id: 't-040',
  name: 'רחפן נוטרל - אזור דרומי',
  type: 'uav',
  status: 'event_neutralized',
  timestamp: '00:03:45',
  createdAtMs: Date.now() - 120_000,
  coordinates: '31.9800° N, 34.7500° E',
  distance: '4.2 ק״מ',
  flowType: 5,
  flowPhase: 'closure',
  entityStage: 'classified',
  classifiedType: 'drone',
  mitigationStatus: 'mitigated',
  bdaStatus: 'complete',
};

// --- CUAS lifecycle mocks ---

export const cuas_raw: Detection = {
  id: 'cuas-001',
  name: 'זיהוי חדש',
  type: 'uav',
  status: 'detection',
  timestamp: '00:14:10',
  createdAtMs: Date.now() - 60_000,
  coordinates: '32.0950° N, 34.8100° E',
  distance: '3.2 ק״מ',
  entityStage: 'raw_detection',
  altitude: '120 מ׳',
  detectedBySensors: [
    { id: 's1', typeLabel: 'Pixelsight', latitude: 32.09, longitude: 34.78 },
  ],
  contributingSensors: [
    { sensorId: 's1', sensorType: 'EO/IR', firstDetectedAt: '00:14:10', lastDetectedAt: '00:14:10' },
  ],
  actionLog: [{ time: '00:14:10', label: 'זיהוי ראשוני — סיווג בתהליך' }],
};

export const cuas_classified: Detection = {
  ...cuas_raw,
  id: 'cuas-002',
  name: 'רחפן מסווג — DJI Mavic',
  entityStage: 'classified',
  classifiedType: 'drone',
  confidence: 0.94,
  mitigationStatus: 'idle',
  contributingSensors: [
    { sensorId: 's1', sensorType: 'EO/IR', firstDetectedAt: '00:14:10', lastDetectedAt: '00:14:18' },
    { sensorId: 's2', sensorType: 'RF', firstDetectedAt: '00:14:12', lastDetectedAt: '00:14:18' },
  ],
  actionLog: [
    { time: '00:14:10', label: 'זיהוי ראשוני' },
    { time: '00:14:18', label: 'סיווג: רחפן — DJI Mavic — ביטחון 94%' },
  ],
};

export const cuas_classified_bird: Detection = {
  ...cuas_raw,
  id: 'cuas-003',
  name: 'ציפור מסווגת',
  entityStage: 'classified',
  classifiedType: 'bird',
  confidence: 0.88,
  mitigationStatus: 'idle',
  actionLog: [
    { time: '00:14:10', label: 'זיהוי ראשוני' },
    { time: '00:14:16', label: 'סיווג: ציפור — ביטחון 88%' },
  ],
};

export const cuas_mitigating: Detection = {
  ...cuas_classified,
  id: 'cuas-004',
  status: 'event',
  mitigationStatus: 'mitigating',
  mitigatingEffectorId: 'eff-1',
  actionLog: [
    ...cuas_classified.actionLog!,
    { time: '00:14:25', label: 'שיבוש פעיל — Regulus-1' },
  ],
};

export const cuas_mitigated: Detection = {
  ...cuas_classified,
  id: 'cuas-005',
  status: 'event_neutralized',
  mitigationStatus: 'mitigated',
  bdaStatus: 'pending',
  actionLog: [
    ...cuas_classified.actionLog!,
    { time: '00:14:25', label: 'שיבוש פעיל — Regulus-1' },
    { time: '00:14:32', label: 'מטרה נוטרלה' },
  ],
};

export const cuas_bda_complete: Detection = {
  ...cuas_mitigated,
  id: 'cuas-006',
  status: 'event_resolved',
  bdaStatus: 'complete',
  actionLog: [
    ...cuas_mitigated.actionLog!,
    { time: '00:14:45', label: 'אימות פגיעה — הושלם' },
  ],
};

export const CUAS_LIFECYCLE = [
  cuas_raw,
  cuas_classified,
  cuas_classified_bird,
  cuas_mitigating,
  cuas_mitigated,
  cuas_bda_complete,
];


export const ALL_DETECTIONS = [
  flow1_suspicion,
  flow1_investigation,
  flow1_decide,
  flow1_act,
  flow2_investigate,
  flow2_tracking,
  flow2_mitigating,
  flow2_mitigated,
  flow3_flying,
  flow3_onStation,
  flow4_mission,
  flow4_complete,
  flow5_mitigated,
];
