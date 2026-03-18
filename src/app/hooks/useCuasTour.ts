import { useState, useCallback, useEffect, useRef } from 'react';
import type { Step, CallBackProps, Styles } from 'react-joyride';
import { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import type { Detection } from '@/imports/ListOfSystems';

const STORAGE_KEY = 'cuas-tour-completed';

type AdvanceMode = 'manual' | 'click-through' | 'auto';

interface CuasTourStep extends Step {
  advanceMode: AdvanceMode;
  autoCondition?: (target: Detection | null) => boolean;
}

const TOUR_STEPS: CuasTourStep[] = [
  {
    target: '[data-tour="cuas-map"]',
    title: 'ברוכים הבאים למערכת CUAS',
    content: 'מכאן תנטרו ותשבשו רחפנים עוינים. הסיור הזה ידריך אתכם דרך מחזור מלא — מזיהוי ועד נטרול.',
    placement: 'center',
    disableBeacon: true,
    advanceMode: 'manual',
  },
  {
    target: '[data-cuas-sim-menu]',
    title: 'הפעלת סימולציה',
    content: 'לחצו על כפתור הסימולציה כדי לפתוח את תפריט התרחישים.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'click-through',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="cuas-single-sim"]',
    title: 'בחירת תרחיש',
    content: 'לחצו כאן להפעלת יעד בודד. נעקוב אחריו יחד צעד אחר צעד.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'click-through',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="cuas-map"]',
    title: 'זיהוי ראשוני',
    content: 'נקודה חדשה הופיעה על המפה — זהו זיהוי גולמי מהרדאר. המערכת עוקבת אחריו אוטומטית.',
    placement: 'center',
    disableBeacon: true,
    advanceMode: 'auto',
    autoCondition: (t) => t != null,
  },
  {
    target: '[data-tour="first-card"]',
    title: 'מבנה הכרטיס',
    content: 'כל זיהוי מוצג ככרטיס. בחלק העליון — שם, סטטוס ורמת ביטחון. למטה — חיישנים תורמים, מרחק וגובה.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'manual',
  },
  {
    target: '[data-tour="first-card"]',
    title: 'חיישנים פעילים',
    content: 'החיישנים משלבים נתונים ומעלים את רמת הביטחון. צפו כיצד חיישנים נוספים מצטרפים לזיהוי — רדאר, מגוס ואלתא.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'manual',
  },
  {
    target: '[data-tour="first-card"]',
    title: 'סיווג בתהליך...',
    content: 'המערכת מנתחת את הנתונים מכל החיישנים ומסווגת את היעד. המתינו לסיום הסיווג.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'auto',
    autoCondition: (t) => t?.entityStage === 'classified',
  },
  {
    target: '[data-tour="first-card"]',
    title: 'סיווג הושלם!',
    content: 'היעד סווג כרחפן עם ביטחון 92%. הכרטיס התעדכן עם הסיווג, והמערכת ממליצה על פעולה.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'manual',
  },
  {
    target: '[data-tour="cuas-cta-mitigate"]',
    title: 'הפעלת שיבוש',
    content: 'לחצו על "שיבוש" כדי להפעיל אפקטור נגד הרחפן. השיבוש ישבש את תקשורת הרחפן.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'click-through',
    spotlightClicks: true,
    autoCondition: (t) => t?.mitigationStatus === 'mitigating' || t?.mitigationStatus === 'mitigated',
  },
  {
    target: '[data-tour="first-card"]',
    title: 'שיבוש פעיל',
    content: 'האפקטור פועל נגד הרחפן. המתינו לסיום השיבוש — הכרטיס יתעדכן אוטומטית.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'auto',
    autoCondition: (t) => t?.mitigationStatus === 'mitigated',
  },
  {
    target: '[data-tour="cuas-cta-bda"]',
    title: 'אימות פגיעה (BDA)',
    content: 'השיבוש הושלם! כעת לחצו "הפנה מצלמה לאימות" כדי לכוון מצלמה ולוודא שהרחפן נוטרל.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'click-through',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="cuas-cta-complete"]',
    title: 'סיום משימה',
    content: 'המצלמה מכוונת לרחפן. כעת לחצו "סיום משימה" כדי לסגור את האירוע ולהעביר אותו לרשימת ההושלמו.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'click-through',
    spotlightClicks: true,
    autoCondition: (t) => t?.status === 'event_neutralized' && t?.missionStatus === 'complete',
  },
  {
    target: '[data-tour="cuas-completed-tab"]',
    title: 'לשונית הושלמו',
    content: 'האירוע הועבר ללשונית "הושלמו". לחצו כאן כדי לצפות באירועים שטופלו בהצלחה.',
    placement: 'left',
    disableBeacon: true,
    advanceMode: 'click-through',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="cuas-map"]',
    title: 'מחזור הושלם!',
    content: 'עברתם מחזור CUAS מלא — מזיהוי ראשוני, דרך סיווג ושיבוש, אימות פגיעה, וסגירת אירוע. המערכת מוכנה לאיום הבא.',
    placement: 'center',
    disableBeacon: true,
    advanceMode: 'manual',
  },
];

const TOUR_STYLES: Styles = {
  options: {
    arrowColor: '#1a1a1a',
    backgroundColor: '#1a1a1a',
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    primaryColor: '#22b8cf',
    textColor: '#e4e4e7',
    spotlightShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
    zIndex: 100000,
  },
  tooltip: {
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontFamily: "'Heebo', sans-serif",
    fontSize: 14,
    padding: '16px 20px',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
  },
  tooltipContainer: {
    textAlign: 'right' as const,
  },
  tooltipContent: {
    padding: '8px 0',
    lineHeight: 1.7,
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: 600,
    textAlign: 'right' as const,
  },
  buttonNext: {
    backgroundColor: '#22b8cf',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
  },
  buttonBack: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: 500,
    marginLeft: 0,
    marginRight: 8,
  },
  buttonSkip: {
    color: '#71717a',
    fontSize: 12,
  },
  buttonClose: {
    color: '#71717a',
  },
  spotlight: {
    borderRadius: 8,
  },
};

const AUTO_STYLES: Styles = {
  ...TOUR_STYLES,
  buttonNext: {
    ...TOUR_STYLES.buttonNext,
    display: 'none',
  },
};

const TOUR_LOCALE = {
  back: 'הקודם',
  close: 'סגור',
  last: 'סיום',
  next: 'הבא',
  open: 'פתח',
  skip: 'דלג',
};

export interface CuasTourState {
  run: boolean;
  stepIndex: number;
  steps: Step[];
  styles: Styles;
  locale: typeof TOUR_LOCALE;
  handleCallback: (data: CallBackProps) => void;
  startTour: () => void;
  updateTargetState: (target: Detection | null) => void;
  notifySimMenuOpened: () => void;
  notifyTargetSpawned: () => void;
  notifyBdaClicked: () => void;
  notifyCompletedTabClicked: () => void;
  currentAdvanceMode: AdvanceMode | null;
}

export function useCuasTour(
  onBeforeStep?: (stepIndex: number) => void,
): CuasTourState {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const targetRef = useRef<Detection | null>(null);

  const currentStep = run ? TOUR_STEPS[stepIndex] : null;
  const currentAdvanceMode = currentStep?.advanceMode ?? null;

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const advanceTo = useCallback((nextIndex: number) => {
    if (nextIndex >= TOUR_STEPS.length) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem(STORAGE_KEY, 'true');
      return;
    }
    onBeforeStep?.(nextIndex);
    requestAnimationFrame(() => {
      const nextStep = TOUR_STEPS[nextIndex];
      const target = typeof nextStep.target === 'string'
        ? document.querySelector(nextStep.target)
        : nextStep.target;
      if (!target && nextIndex < TOUR_STEPS.length - 1) {
        setStepIndex(nextIndex + 1);
      } else {
        setStepIndex(nextIndex);
      }
    });
  }, [onBeforeStep]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem(STORAGE_KEY, 'true');
      return;
    }

    const step = TOUR_STEPS[index];

    if (type === EVENTS.STEP_AFTER && step.advanceMode === 'manual') {
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      if (nextIndex >= 0) advanceTo(nextIndex);
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + 1;
      if (nextIndex < TOUR_STEPS.length) {
        setStepIndex(nextIndex);
      } else {
        setRun(false);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    }
  }, [advanceTo]);

  const updateTargetState = useCallback((target: Detection | null) => {
    targetRef.current = target;
  }, []);

  useEffect(() => {
    if (!run) return;
    const step = TOUR_STEPS[stepIndex];
    if (!step.autoCondition) return;

    const iv = setInterval(() => {
      if (step.autoCondition!(targetRef.current)) {
        clearInterval(iv);
        advanceTo(stepIndex + 1);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [run, stepIndex, advanceTo]);

  const notifySimMenuOpened = useCallback(() => {
    if (run && stepIndex === 1) {
      setTimeout(() => advanceTo(2), 300);
    }
  }, [run, stepIndex, advanceTo]);

  const notifyTargetSpawned = useCallback(() => {
    if (run && stepIndex === 2) {
      advanceTo(3);
    }
  }, [run, stepIndex, advanceTo]);

  const notifyBdaClicked = useCallback(() => {
    if (run && stepIndex === 10) {
      setTimeout(() => advanceTo(11), 500);
    }
  }, [run, stepIndex, advanceTo]);

  const notifyCompletedTabClicked = useCallback(() => {
    if (run && stepIndex === 12) {
      setTimeout(() => advanceTo(13), 300);
    }
  }, [run, stepIndex, advanceTo]);

  const activeStep = TOUR_STEPS[stepIndex];
  const isAutoOrClickThrough = activeStep?.advanceMode === 'auto' || activeStep?.advanceMode === 'click-through';

  return {
    run,
    stepIndex,
    steps: TOUR_STEPS as Step[],
    styles: isAutoOrClickThrough ? AUTO_STYLES : TOUR_STYLES,
    locale: TOUR_LOCALE,
    handleCallback,
    startTour,
    updateTargetState,
    notifySimMenuOpened,
    notifyTargetSpawned,
    notifyBdaClicked,
    notifyCompletedTabClicked,
    currentAdvanceMode,
  };
}
