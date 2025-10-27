export function BrainIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 8C24 8 18 14 18 22C18 24 18.5 25.8 19.3 27.4C17.3 28.9 16 31.3 16 34C16 37.9 18.7 41.1 22.3 42.3C23.1 48.8 28 54 34 55.2V56H30V58H34V58H38V56H34V55.2C40 54 44.9 48.8 45.7 42.3C49.3 41.1 52 37.9 52 34C52 31.3 50.7 28.9 48.7 27.4C49.5 25.8 50 24 50 22C50 14 44 8 36 8C35.3 8 34.7 8.1 34 8.2C33.3 8.1 32.7 8 32 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="26" cy="28" r="2" fill="currentColor" />
      <circle cx="38" cy="28" r="2" fill="currentColor" />
      <path
        d="M24 20C24 20 26 18 28 18M40 20C40 20 38 18 36 18M28 36C28 36 30 38 32 38C34 38 36 36 36 36"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrystalBallIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="32"
        cy="28"
        r="16"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <ellipse
        cx="32"
        cy="26"
        rx="10"
        ry="6"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M20 42C20 42 24 40 32 40C40 40 44 42 44 42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 44L46 44L44 52C44 54 42 56 40 56H24C22 56 20 54 20 52L18 44Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="28" cy="22" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="36" cy="28" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function DollarSignIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M32 14V50M38 20C38 20 36 18 32 18C28 18 26 20 26 23C26 26 28 27 32 28C36 29 38 30 38 33C38 36 36 38 32 38C28 38 26 36 26 36"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrokenMirrorIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="14"
        y="10"
        width="36"
        height="44"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M32 10L28 30L32 38L36 26L32 10Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line
        x1="14"
        y1="24"
        x2="50"
        y2="32"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="14"
        y1="38"
        x2="50"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="20" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="40" cy="28" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="26" cy="44" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
