/**
 * LoadingSpinner — shown while waiting for the /predict response.
 */
export default function LoadingSpinner() {
  return (
    <div
      id="loading-state"
      className="flex flex-col items-center justify-center gap-6 py-16 animate-fade-in"
      aria-live="polite"
      aria-label="Analyzing plant image, please wait"
    >
      {/* Spinning leaf ring */}
      <div className="relative w-20 h-20">
        {/* Outer spinning ring */}
        <svg
          className="absolute inset-0 animate-spin-slow text-green-400"
          viewBox="0 0 80 80"
          fill="none"
        >
          <circle
            cx="40" cy="40" r="34"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="50 164"
          />
        </svg>
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse-slow">
            {/* Leaf icon */}
            <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2s4-4 4-4c-3.18 1.32-5.83 3.33-7 5z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <p className="text-white/90 font-semibold text-lg">Analyzing your plant…</p>
        <p className="text-white/40 text-sm">Running AI model — usually takes 1–3 seconds</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-green-400/60"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}
