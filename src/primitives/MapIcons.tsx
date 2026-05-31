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

export const CarIcon = ({ color = '#ff3d40', size = 32 }: { color?: string; size?: number }) => (
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

// Tank — Body paths painted in `color` (severity-driven on markers,
// `currentColor` on cards). Hull outline + treads stay black so the
// shape stays readable on any severity tint.
const TANK_HULL_PATH =
  'M6.72423 5.741V3H7.51035V5.58725H12.9848C14.0572 6.39575 14.771 7.62811 14.8831 9.02777H5.01936C5.12464 7.71412 5.75997 6.54782 6.72423 5.741ZM19.3626 4.10019L21.1094 3.64448L21.8034 6.16685L20.0568 6.62257L19.3626 4.10019ZM14.6813 6.22866L18.8364 5.14456L19.1393 6.24524L15.2553 7.25869C15.1015 6.89672 14.9091 6.55148 14.6813 6.22866ZM3.0461 11.6438L6.34218 10.1266L12.9344 10.1266C15.6301 10.6728 20.6386 11.9889 20.6386 13.657L19.8262 13.3944H3.812L3.04619 13.7038L3.0461 11.6438Z';
const TANK_TREAD_PATH =
  'M4.73671 14.5721C3.2252 14.5986 2 15.8085 2 17.2863C2 18.7805 3.25246 20 4.78706 20C9.59563 20 14.4045 20 19.2129 20C20.7475 20 22 18.7805 22 17.2863C22 15.7807 20.7188 14.5734 19.1782 14.5734L4.73671 14.5721Z';

const TANK_WHEELS = (
  <>
    <circle cx="4.787" cy="17.166" r="1.928" fill="#0a0a0a" />
    <circle cx="9.587" cy="17.166" r="1.928" fill="#0a0a0a" />
    <circle cx="14.425" cy="17.166" r="1.928" fill="#0a0a0a" />
    <circle cx="19.213" cy="17.166" r="1.928" fill="#0a0a0a" />
  </>
);

export const TankIcon = ({ color = '#ffffff', size = 32 }: { color?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-lg"
    aria-hidden="true"
  >
    <path d={TANK_HULL_PATH} fill={color} stroke="#0a0a0a" strokeWidth="0.6" strokeLinejoin="round" />
    <path d={TANK_TREAD_PATH} fill={color} stroke="#0a0a0a" strokeWidth="0.6" />
    {TANK_WHEELS}
  </svg>
);

export const TankCardIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d={TANK_HULL_PATH} fill="currentColor" />
    <path d={TANK_TREAD_PATH} fill="currentColor" />
  </svg>
);

// Truck — Same color-vs-detail split. Cab body + trailer body + wheel
// hubs paint in `color`; the cab window cut-out + outline stroke stay
// black.
const TRUCK_CAB_PATH =
  'M2.20722 5.05081C6.03795 5.05066 10.371 4.96236 14.2014 5.0189C14.2014 5.0189 14.2231 12.9278 14.2014 16.619C12.661 16.5974 11.1202 16.6059 9.57968 16.6059C9.32503 16.6062 9.06904 16.6091 8.81419 16.6059C8.28182 16.598 8.37053 16.1211 8.23405 15.7119C7.51801 13.5647 4.4094 13.6599 3.84879 15.8754C3.80845 16.0347 3.70552 16.2316 3.61757 16.3738C3.25478 16.3738 2 16.3738 2 16.3738L2.20722 5.05081Z';
const TRUCK_TRAILER_PATH =
  'M22 16.5569H21.0483C20.715 16.4783 20.7355 16.1387 20.6651 15.866C20.1246 13.7704 17.146 13.5481 16.2401 15.4669C16.118 15.7043 16.0811 15.9666 16.0236 16.2241C15.9181 16.6948 15.037 16.619 15.037 16.619C15.0504 13.583 15.037 7.46114 15.037 7.46114C16.1443 7.45177 18.3878 7.47988 18.3878 7.47988C19.4839 8.7717 22 11.9337 22 11.9337V16.5569Z';
const TRUCK_WINDOW_PATH = 'M17.914 8.3074L20.3289 11.1239H15.5886V8.29184L17.914 8.3074Z';

export const TruckIcon = ({ color = '#ffffff', size = 32 }: { color?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-lg"
    aria-hidden="true"
  >
    <path d={TRUCK_CAB_PATH} fill={color} stroke="#0a0a0a" strokeWidth="0.6" strokeLinejoin="round" />
    <path d={TRUCK_TRAILER_PATH} fill={color} stroke="#0a0a0a" strokeWidth="0.6" strokeLinejoin="round" />
    <path d={TRUCK_WINDOW_PATH} fill="#0a0a0a" />
    <circle cx="6.124" cy="16.475" r="2.04" fill={color} stroke="#0a0a0a" strokeWidth="0.6" />
    <circle cx="18.379" cy="16.475" r="2.04" fill={color} stroke="#0a0a0a" strokeWidth="0.6" />
    <circle cx="6.124" cy="16.475" r="0.9" fill="#0a0a0a" />
    <circle cx="18.379" cy="16.475" r="0.9" fill="#0a0a0a" />
  </svg>
);

export const TruckCardIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d={TRUCK_CAB_PATH} fill="currentColor" />
    <path d={TRUCK_TRAILER_PATH} fill="currentColor" />
    <circle cx="6.124" cy="16.475" r="2.04" fill="currentColor" />
    <circle cx="18.379" cy="16.475" r="2.04" fill="currentColor" />
  </svg>
);
