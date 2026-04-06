import React from 'react';

export const DRONE_PATH =
  'M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z';

export const MISSILE_PATH =
  'M35.7881 8.51465L33.9658 14.873L33.9268 15.0107L33.9658 15.1484L35.7793 21.4941L34.5547 21.4873C32.4701 19.9119 30.3741 18.3513 28.2656 16.8076L28.1338 16.7119L27.9707 16.7109C26.6359 16.7083 23.6595 16.7249 21.0195 16.7422C19.699 16.7508 18.4618 16.7599 17.5547 16.7666C17.1013 16.7699 16.7303 16.7725 16.4727 16.7744C16.3439 16.7754 16.2431 16.7768 16.1748 16.7773C16.1407 16.7776 16.1142 16.7772 16.0967 16.7773C16.0881 16.7774 16.0816 16.7783 16.0771 16.7783H16.0703L15.5225 16.7822L15.5762 17.3271L15.7178 18.7539L13.7783 17.0059L13.6299 16.8721L13.4307 16.8779H13.4189C10.0969 16.9674 7.22056 17.026 4.76758 15.0088C7.26362 13.0467 10.1759 13.0243 13.4678 13.1396L13.6748 13.1475L13.8252 13.0068L15.7217 11.249L15.5762 12.7812L15.5244 13.3291H28.1211L28.25 13.2402C30.3251 11.8056 32.595 10.0053 34.6641 8.50195L35.7881 8.51465Z';

/**
 * Card-compatible versions of the tactical map SVG icons.
 * Adapted for use in CardHeader (size prop, currentColor fill, no stroke).
 */

export const DroneCardIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="2 -2 22 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d={DRONE_PATH} fill="currentColor" />
  </svg>
);

export const JamWaveIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M22 12C19.5 10.5 19.5 5 17.5 5C15.5 5 15.5 10 13 10C10.5 10 10.5 2 8 2C5.5 2 5 10.5 2 12C5 13.5 5.5 22 8 22C10.5 22 10.5 14 13 14C15.5 14 15.5 19 17.5 19C19.5 19 19 13.5 22 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MissileCardIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="2 6 36 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d={MISSILE_PATH} fill="currentColor" />
  </svg>
);

export const CAR_PATH =
  'M19.5 17H21C21.5523 17 22 16.5523 22 16V10.8198C22 10.3431 21.6635 9.93271 21.1961 9.83922L17.3746 9.07493C17.1334 9.02668 16.9184 8.89118 16.7708 8.69435L14.3 5.4C14.1111 5.14819 13.8148 5 13.5 5H3C2.44771 5 2 5.44772 2 6V16C2 16.5523 2.44772 17 3 17H4.5';

export const CarIcon = ({ color = '#ff3d40', size = 22 }: { color?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-lg"
    aria-hidden="true"
  >
    <path d={CAR_PATH} fill={color} stroke="#0a0a0a" strokeWidth="1" strokeLinecap="round" />
    <path d="M9.5 17H14.5" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7" cy="16.75" r="2.25" fill={color} />
    <circle cx="17" cy="16.75" r="2.25" fill={color} />
  </svg>
);

export const CarCardIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d={CAR_PATH} fill="currentColor" />
    <path d="M9.5 17H14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="7" cy="16.75" r="2.25" fill="currentColor" />
    <circle cx="17" cy="16.75" r="2.25" fill="currentColor" />
  </svg>
);
