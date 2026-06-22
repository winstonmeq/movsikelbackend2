import styles from './landing.module.css';

/**
 * Animated, transparent "map navigation" line layered behind the page content.
 * A glowing ocean-green route draws itself between two pins, with a vehicle dot
 * travelling along it. Pointer-events: none — purely decorative.
 */
export default function MapBackground() {
  return (
    <div className={styles.mapBg} aria-hidden="true">
      <svg
        className={styles.mapSvg}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00b67a" />
            <stop offset="100%" stopColor="#007a5a" />
          </linearGradient>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint secondary roads */}
        <path className={styles.roadFaint} d="M-50 220 C 320 180, 520 420, 900 360 S 1380 250, 1500 420" />
        <path className={styles.roadFaint} d="M120 -40 C 200 260, 480 380, 560 640 S 720 980, 980 940" />

        {/* main animated route */}
        <path
          id="mainRoute"
          className={styles.route}
          d="M120 760 C 300 700, 360 520, 560 500 S 860 540, 980 380 S 1180 180, 1340 160"
          stroke="url(#routeGrad)"
          filter="url(#routeGlow)"
        />

        {/* origin + destination pins */}
        <circle className={styles.pinStart} cx="120" cy="760" r="9" />
        <circle className={styles.pinEnd} cx="1340" cy="160" r="11" />

        {/* moving vehicle dot following the route */}
        <circle className={styles.vehicle} r="8">
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#mainRoute" />
          </animateMotion>
        </circle>
        {/* pulsing halo on the vehicle */}
        <circle className={styles.vehicleHalo} r="8">
          <animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#mainRoute" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
}
