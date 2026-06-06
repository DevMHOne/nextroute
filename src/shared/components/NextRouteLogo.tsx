/**
 * NextRoute logo — stylized route/signal mark.
 * A bold "N" with an arrow-through motif: speed + routing.
 */
type NextRouteLogoProps = {
  size?: number;
  className?: string;
};

export default function NextRouteLogo({ size = 20, className = "" }: NextRouteLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background pill */}
      <rect x="0" y="0" width="32" height="32" rx="9" fill="currentColor" fillOpacity="0.12" />
      {/* Bold N strokes */}
      <path
        d="M7 24V8L16 20V8"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right stem + arrow */}
      <path
        d="M16 20V8H25"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Speed slash accent */}
      <path
        d="M21 16H27"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <path
        d="M24.5 13.5L27 16L24.5 18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
    </svg>
  );
}
