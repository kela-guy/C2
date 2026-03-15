export const CARD_TOKENS = {
  container: {
    bgColor: '#1A1A1A',
    borderColor: '#333333',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    completedOpacity: 0.65,
  },
  header: {
    paddingX: 8,
    paddingY: 6,
    hoverBgOpacity: 0.05,
    selectedBgOpacity: 0.05,
    gap: 6,
  },
  selectedRing: {
    ringWidth: 1,
    ringColor: '#ffffff',
    ringOpacity: 0.1,
  },
  title: {
    fontSize: 13,
    color: '#dee2e6',
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
  },
  iconBox: {
    size: 30,
    borderRadius: 4,
    iconSize: 15,
    defaultBg: '#333333',
    activeBg: '#ef4444',
    activeBgOpacity: 0.2,
  },
  content: {
    bgColor: '#141414',
    borderColor: '#333333',
    paddingX: 8,
    paddingY: 6,
  },
  animation: {
    expandDuration: 0.2,
    chevronSize: 18,
  },
  spine: {
    width: 3,
    colors: {
      idle: '#52525b',
      suspicion: '#f59e0b',
      detection: '#fa5252',
      tracking: '#fd7e14',
      mitigating: '#ef4444',
      active: '#74c0fc',
      resolved: '#12b886',
      expired: '#3f3f46',
    },
  },
  timeline: {
    dotSize: 8,
    activeDotSize: 10,
    lineWidth: 2,
    gap: 6,
  },
  actions: {
    gap: 4,
    gridMinCols: 2,
  },
} as const;

export type ThreatAccent = keyof typeof CARD_TOKENS.spine.colors;
