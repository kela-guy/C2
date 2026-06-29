/**
 * SVG glyphs owned by the Devices Panel.
 *
 * `DevicesIcon` is the rail/launcher button used by the dashboard shell. The
 * remaining glyphs are the device-row action set (play/pause, mute, show on
 * map, watch stream, calibrate, wipers, etc.). All shapes use `currentColor`
 * so the parent drives the colour, and share a `size` + `className` API.
 */

interface IconProps {
  size?: number;
  className?: string;
}

export function DevicesIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M4 5C4 4.44772 4.44772 4 5 4H9C9.55228 4 10 4.44772 10 5V9C10 9.55228 9.55228 10 9 10H5C4.44772 10 4 9.55228 4 9V5Z"
        stroke="currentColor"
        strokeWidth="1.995"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15C4 14.4477 4.44772 14 5 14H9C9.55228 14 10 14.4477 10 15V19C10 19.5523 9.55228 20 9 20H5C4.44772 20 4 19.5523 4 19V15Z"
        stroke="currentColor"
        strokeWidth="1.995"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V9C20 9.55228 19.5523 10 19 10H15C14.4477 10 14 9.55228 14 9V5Z"
        stroke="currentColor"
        strokeWidth="1.995"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 17C14 15.3431 15.3431 14 17 14C18.6569 14 20 15.3431 20 17C20 18.6569 18.6569 20 17 20C15.3431 20 14 18.6569 14 17Z"
        stroke="currentColor"
        strokeWidth="1.995"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Solid filled play triangle — speaker Play (idle). */
export function PlayFilledIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.6667 7.99999L3.33333 1.33333V14.6667L14.6667 7.99999Z" fill="currentColor" />
    </svg>
  );
}

/** Pause bars — speaker Playing state. */
export function PauseIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 3H10V21H4V3Z" fill="currentColor" />
      <path d="M14 3H20V21H14V3Z" fill="currentColor" />
    </svg>
  );
}

/** Sound-wave bars — now-playing / track-sound indicator. */
export function SoundWavesBarsIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 12H4.66666V4H6V12Z" fill="currentColor" />
      <path d="M11.3333 10.6667H10V5.33333H11.3333V10.6667Z" fill="currentColor" />
      <path d="M8.66667 9.33334H7.33334V6.66667H8.66667V9.33334Z" fill="currentColor" />
      <path d="M3.33333 9H2V7H3.33333V9Z" fill="currentColor" />
      <path d="M14 9H12.6667V7H14V9Z" fill="currentColor" />
    </svg>
  );
}

/** Bell — notifications on / mute idle (filled). */
export function NotificationIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.80754 9.46301C5.20136 5.78731 8.30327 3 12 3C15.6967 3 18.7986 5.78732 19.1925 9.46301L20 17H4L4.80754 9.46301Z"
        fill="currentColor"
      />
      <path
        d="M9.26794 18.5C9.61337 19.6961 10.7146 20.5 12 20.5C13.2854 20.5 14.3866 19.6961 14.7321 18.5H9.26794Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Bell with slash — muted state (filled). */
export function NotificationMutedIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.80754 9.46301C5.20136 5.78731 8.30327 3 12 3C15.6967 3 18.7986 5.78732 19.1925 9.46301L20 17H4L4.80754 9.46301Z"
        fill="currentColor"
      />
      <path
        d="M9.26794 18.5C9.61337 19.6961 10.7146 20.5 12 20.5C13.2854 20.5 14.3866 19.6961 14.7321 18.5H9.26794Z"
        fill="currentColor"
      />
      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Map pin — show / center on map. */
export function MapPinIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5926 21.8055L12.5944 21.8042L12.6 21.8001L12.6185 21.7863C12.6341 21.7746 12.6562 21.758 12.6844 21.7365C12.7406 21.6937 12.8211 21.6316 12.9223 21.5514C13.1245 21.3909 13.4102 21.1574 13.7514 20.8594C14.4326 20.2647 15.3426 19.407 16.2553 18.3551C18.0477 16.2895 20 13.3052 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 13.3052 5.95225 16.2895 7.74471 18.3551C8.65744 19.407 9.5674 20.2647 10.2486 20.8594C10.5898 21.1574 10.8755 21.3909 11.0777 21.5514C11.1789 21.6316 11.2594 21.6937 11.3156 21.7365C11.3438 21.758 11.3659 21.7746 11.3815 21.7863L11.4 21.8001L11.4056 21.8042L11.4081 21.806L12 22.2401L12.5926 21.8055ZM11.9978 12.5C13.3785 12.5 14.4978 11.3807 14.4978 10C14.4978 8.61929 13.3785 7.5 11.9978 7.5C10.6171 7.5 9.4978 8.61929 9.4978 10C9.4978 11.3807 10.6171 12.5 11.9978 12.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Monitor with play triangle — watch stream / pin to feed (filled). */
export function WatchStreamIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Solid screen with the play triangle knocked out (evenodd) + stand. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4C2.89543 4 2 4.89543 2 6V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V6C22 4.89543 21.1046 4 20 4H4ZM10 8.5C10 8.10583 10.4332 7.86523 10.7682 8.07294L16.4 11.573C16.7178 11.7701 16.7178 12.2299 16.4 12.427L10.7682 15.9271C10.4332 16.1348 10 15.8942 10 15.5V8.5Z"
        fill="currentColor"
      />
      <path
        d="M12 18V21M9 21H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wrench — calibrate (filled). */
export function CalibrationIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14.5 16C18.0899 16 21 13.0899 21 9.5C21 8.75038 20.8731 8.03041 20.6396 7.36037L18 10C16.8954 11.1046 15.1046 11.1046 14 10C12.8954 8.89543 12.8954 7.10457 14 6L16.6396 3.36037C15.9696 3.12689 15.2496 3 14.5 3C10.9101 3 8 5.91015 8 9.5C8 10.3864 8.17743 11.2314 8.4987 12.0013L3 17.5L6.5 21L11.9987 15.5013C12.7686 15.8226 13.6136 16 14.5 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Drone-over-dock glyph — Pathfinder "return to dock" (RTB). Shared with the
 * video HUD bottom chrome so the action reads identically everywhere it appears.
 */
export function DockIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M13.6409 1.18815L13.7192 4.44135L14.4518 4.81672L14.6176 5.52909C14.8468 6.51427 14.2527 7.50847 13.272 7.76107L11.316 8.265L12.3906 10.2885L9.57159 11.034L6.65013 9.46293L3.29606 10.2543C2.65793 10.4048 1.99493 10.1482 1.6212 9.61013C1.1804 8.97567 1.25206 8.11473 1.79293 7.56273L2.86946 6.46402C3.1068 6.22183 3.404 6.04919 3.73413 5.9653C4.84413 5.68323 8.18313 4.83344 9.59077 4.46116C9.84308 4.39443 10.0532 4.21685 10.1629 3.97306L11.1158 1.85599L13.6409 1.18815Z"
        fill="currentColor"
      />
      <path d="M14.6666 12.3335V13.3335H1.33327V12.3335H14.6666Z" fill="currentColor" />
    </svg>
  );
}

/** Wiper sweep — wipers. */
export function WipeIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 4C14.0429 4 16.0657 4.45797 17.9531 5.34668C19.8404 6.23537 21.5555 7.53767 23 9.17969L15.2393 18.0029C14.867 17.5798 14.4338 17.2329 13.959 16.9775L13.7529 16.874C13.2667 16.6451 12.7501 16.5128 12.2256 16.4834L12 16.4775C11.973 16.4775 11.946 16.4789 11.9189 16.4795L12.3828 17.4326C12.7924 17.5394 13.1549 17.817 13.3545 18.2275C13.7166 18.9725 13.4061 19.8702 12.6611 20.2324C11.9162 20.5945 11.0185 20.2839 10.6562 19.5391C10.4679 19.1515 10.4624 18.7229 10.6045 18.3496L9.95898 17.0234C9.51637 17.2739 9.11132 17.6044 8.76074 18.0029L1 9.17969C2.35432 7.64012 3.94638 6.399 5.69531 5.51758L6.04688 5.34668C7.93424 4.45795 9.95713 4.00003 12 4ZM12 6C10.2581 6.00003 8.52512 6.3893 6.89844 7.15527C5.77009 7.68663 4.70485 8.39409 3.7334 9.25977L9.0127 15.2617C9.03647 15.2485 9.06104 15.2366 9.08496 15.2236L6 8.87793L7.79883 8.00293L10.9873 14.5625C11.3206 14.5059 11.6592 14.4776 12 14.4775C12.9025 14.4775 13.789 14.68 14.6055 15.0645C14.735 15.1255 14.8616 15.1923 14.9863 15.2617L20.2666 9.25977C19.2951 8.39413 18.2299 7.6866 17.1016 7.15527C15.4748 6.3893 13.7419 6 12 6Z"
        fill="currentColor"
      />
    </svg>
  );
}
