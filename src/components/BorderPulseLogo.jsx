export default function BorderPulseLogo({ size = 40, className = '', solid = true }) {
  const radius = size * 0.22;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {solid && <rect width="64" height="64" rx={radius * (64 / size)} fill="#0b0b0b" />}
      <line x1="10" y1="32" x2="54" y2="32" stroke={solid ? '#2e2e2e' : 'currentColor'} strokeOpacity={solid ? 1 : 0.3} strokeWidth="1.5" />
      <polyline
        points="10,32 22,32 26,22 30,42 34,26 38,32 54,32"
        fill="none"
        stroke="#8a9a7b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
