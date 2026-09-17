/**
 * UncertainCard — shown when the model's confidence is below 60%.
 *
 * Props:
 *   confidence — the confidence percentage (e.g. 42.0)
 *   onReset    — called when user clicks "Try again"
 */

const PHOTO_TIPS = [
  { icon: '☀️', tip: 'Shoot in natural daylight or bright indirect light' },
  { icon: '🔍', tip: 'Get close — the leaf should fill most of the frame' },
  { icon: '🎯', tip: 'Keep the camera steady and the image in sharp focus' },
  { icon: '🌿', tip: 'Show the affected area (spots, lesions, discoloration)' },
  { icon: '📐', tip: 'Lay the leaf flat on a plain background if possible' },
]

export default function UncertainCard({ confidence, onReset }) {
  return (
    <div id="uncertain-card" className="animate-slide-up space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Warning icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div className="space-y-0.5">
          <p className="text-xs text-amber-400/80 font-semibold uppercase tracking-wider">Low confidence</p>
          <h2 className="text-xl font-bold text-white">
            Only {confidence}% sure
          </h2>
          <p className="text-sm text-white/50">
            The model couldn't make a confident diagnosis
          </p>
        </div>
      </div>

      {/* ── Mini confidence bar ──────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 confidence-bar"
            style={{ '--bar-width': `${confidence}%` }}
          />
        </div>
        <p className="text-xs text-white/30">
          Minimum required confidence: 60% · You got: {confidence}%
        </p>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="border-t border-white/8" />

      {/* ── Tips ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          How to get a better result
        </h3>
        <ul className="space-y-2.5">
          {PHOTO_TIPS.map(({ icon, tip }, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/75">
              <span className="text-base leading-tight flex-shrink-0">{icon}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3 text-xs text-amber-300/80 leading-relaxed">
        <strong>Note:</strong> This model was trained on lab-condition photos. Real-world photos 
        with mixed lighting, angles, or unclear symptoms may produce lower confidence scores.
      </div>

      {/* ── Try again button ─────────────────────────────────────── */}
      <button
        id="try-again-button"
        onClick={onReset}
        className="
          w-full py-3 rounded-xl text-sm font-semibold
          bg-amber-500 hover:bg-amber-400 active:bg-amber-600
          text-white transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-transparent
        "
      >
        Try with a new photo
      </button>
    </div>
  )
}
