/**
 * ResultCard — shown when the model is confident (uncertain=false).
 *
 * Props:
 *   result   — the full JSON response from /predict
 *   imageUrl — object URL of the uploaded image (for preview)
 *   onReset  — called when user clicks "Upload another photo"
 */

const SEVERITY_STYLES = {
  none:     { badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', label: '✓ Healthy' },
  moderate: { badge: 'bg-amber-500/20  text-amber-300  border border-amber-500/30',    label: '⚠ Moderate' },
  severe:   { badge: 'bg-red-500/20    text-red-300    border border-red-500/30',       label: '✕ Severe' },
}

const CONFIDENCE_COLOR = (pct) => {
  if (pct >= 80) return 'from-emerald-500 to-green-400'
  if (pct >= 60) return 'from-amber-500  to-yellow-400'
  return               'from-red-500    to-orange-400'
}

export default function ResultCard({ result, imageUrl, onReset }) {
  const { disease, confidence, severity, symptoms, treatment } = result
  const sev = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.moderate

  return (
    <div id="result-card" className="animate-slide-up space-y-5">

      {/* ── Header row ──────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Uploaded leaf"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 ring-2 ring-white/10"
          />
        )}

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Severity badge */}
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sev.badge}`}>
            {sev.label}
          </span>

          {/* Disease name */}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight break-words">
            {disease}
          </h2>
        </div>
      </div>

      {/* ── Confidence bar ──────────────────────────────────────── */}
      <div id="confidence-section" className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/50 font-medium">AI Confidence</span>
          <span className="text-white font-bold tabular-nums">{confidence}%</span>
        </div>

        {/* Track */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          {/* Animated fill bar — uses CSS custom property set via inline style */}
          <div
            className={`h-full rounded-full bg-gradient-to-r confidence-bar ${CONFIDENCE_COLOR(confidence)}`}
            style={{ '--bar-width': `${confidence}%` }}
            role="progressbar"
            aria-valuenow={confidence}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <p className="text-xs text-white/30">
          The model is {confidence >= 80 ? 'very confident' : 'moderately confident'} in this diagnosis.
          Always confirm with a local agronomist for critical decisions.
        </p>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="border-t border-white/8" />

      {/* ── Symptoms ────────────────────────────────────────────── */}
      <div id="symptoms-section" className="space-y-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          Symptoms to look for
        </h3>
        <ul className="space-y-2">
          {symptoms.map((symptom, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
              <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </span>
              {symptom}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="border-t border-white/8" />

      {/* ── Treatment ───────────────────────────────────────────── */}
      <div id="treatment-section" className="space-y-3">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recommended Treatment
        </h3>
        <p className="text-sm text-white/80 leading-relaxed">
          {treatment}
        </p>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <button
        id="upload-another-button"
        onClick={onReset}
        className="
          w-full mt-2 py-3 rounded-xl text-sm font-medium
          bg-white/5 hover:bg-white/10 active:bg-white/8
          text-white/70 hover:text-white
          border border-white/10 hover:border-white/20
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-white/20
        "
      >
        ↑ Upload another photo
      </button>
    </div>
  )
}
