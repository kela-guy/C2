import { useState, useCallback, useEffect } from 'react';
import type { Step, CallBackProps, Styles } from 'react-joyride';
import { ACTIONS, EVENTS, STATUS } from 'react-joyride';

const STORAGE_KEY = 'c1flow-tour-completed';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="nav-bar"]',
    content: 'ברוכים הבאים ל-C1Flow — מסוף טקטי לניהול מטרות. זהו סרגל הניווט הראשי. מכאן תפעילו סימולציות, תפתחו את רשימת המערכות, ותגיעו ל-Storybook.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="simulations-trigger"]',
    content: 'לחצו כאן כדי להפעיל תרחישים — זיהוי חשודים, תרחיש CUAS מלא, הדגמה מודרכת, או תרחיש נחיל.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="tactical-map"]',
    content: 'המפה הטקטית מציגה מטרות, חיישנים, מצלמות ומשגרים. לחצו על סמן כדי לפתוח כרטיס, או לחצו ימני לתפריט פעולות.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-toggle"]',
    content: 'לחצו כאן כדי לפתוח או לסגור את פאנל המערכות הפעילות.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="detection-tabs"]',
    content: 'כאן מוצגות כל הזיהויים. עברו בין לשונית \'פעילות\' ל\'הושלמו\'. השתמשו בחיפוש ובמסננים לסינון.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="first-card"]',
    content: 'כל זיהוי מוצג ככרטיס. לחצו לפתיחה — בפנים תמצאו פרטים, טלמטריה, חיישנים, לוג פעולות וכפתורי פעולה.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="notification-bell"]',
    content: 'התראות מופיעות כאן. זיהויים קריטיים יציגו התראה אדומה על המסך. לחצו לצפייה בהיסטוריה.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="storybook-link"]',
    content: 'לחצו כאן לפתיחת Storybook — שם תוכלו לצפות בכל רכיבי הממשק, לבדוק מצבים שונים ולקרוא תיעוד.',
    placement: 'left',
    disableBeacon: true,
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

const TOUR_LOCALE = {
  back: 'הקודם',
  close: 'סגור',
  last: 'סיום',
  next: 'הבא',
  open: 'פתח',
  skip: 'דלג',
};

interface OnboardingTourState {
  run: boolean;
  stepIndex: number;
  steps: Step[];
  styles: Styles;
  locale: typeof TOUR_LOCALE;
  handleCallback: (data: CallBackProps) => void;
  startTour: () => void;
}

export function useOnboardingTour(
  onBeforeStep?: (stepIndex: number) => void,
): OnboardingTourState {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem(STORAGE_KEY, 'true');
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;

      if (nextIndex >= TOUR_STEPS.length) {
        setRun(false);
        setStepIndex(0);
        localStorage.setItem(STORAGE_KEY, 'true');
        return;
      }

      if (nextIndex >= 0) {
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
      }
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
  }, [onBeforeStep]);

  return {
    run,
    stepIndex,
    steps: TOUR_STEPS,
    styles: TOUR_STYLES,
    locale: TOUR_LOCALE,
    handleCallback,
    startTour,
  };
}
