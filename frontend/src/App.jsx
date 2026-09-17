/**
 * App.jsx — The top-level component and state machine.
 *
 * The entire app has exactly 4 states:
 *
 *   'empty'     → Show the upload zone
 *   'loading'   → Show spinner while waiting for /predict
 *   'result'    → Show disease name, confidence, symptoms, treatment
 *   'uncertain' → Show "confidence too low" card with photo tips
 *
 * All state transitions happen here. Child components receive props
 * and call callback functions — they never manage global state themselves.
 * This is the standard React pattern: "lift state up".
 */

import { useCallback, useState } from 'react'
import { predictDisease } from './api.js'
import UploadZone     from './components/UploadZone.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import ResultCard     from './components/ResultCard.jsx'
import UncertainCard  from './components/UncertainCard.jsx'

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────
  const [uiState, setUiState]   = useState('empty')   // 'empty' | 'loading' | 'result' | 'uncertain'
  const [result,  setResult]    = useState(null)       // API response object
  const [error,   setError]     = useState(null)       // User-facing error message string
  const [imageUrl, setImageUrl] = useState(null)       // Object URL for image preview thumbnail

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleFileSelected = useCallback(async (file) => {
    // 1. Clear any previous state and show loading
    setError(null)
    setResult(null)
    setUiState('loading')

    // 2. Create a local object URL so we can show a thumbnail in ResultCard
    //    URL.createObjectURL() creates a temporary in-browser URL for the file
    //    (no upload needed — it's just a pointer to the file in memory)
    if (imageUrl) URL.revokeObjectURL(imageUrl)  // free previous object URL
    setImageUrl(URL.createObjectURL(file))

    // 3. Call the API
    try {
      const data = await predictDisease(file)

      setResult(data)
      // Route to the correct UI state based on the response
      setUiState(data.uncertain ? 'uncertain' : 'result')
    } catch (err) {
      // Network error, server down, validation error from backend, etc.
      setError(err.message || 'Something went wrong. Please try again.')
      setUiState('empty')
    }
  }, [imageUrl])

  const handleReset = useCallback(() => {
    setUiState('empty')
    setResult(null)
    setError(null)
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
      setImageUrl(null)
    }
  }, [imageUrl])

  const handleError = useCallback((message) => {
    setError(message)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950/40 to-slate-900 flex flex-col">

      {/* ── Decorative background blobs ─────────────────────────── */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2s4-4 4-4c-3.18 1.32-5.83 3.33-7 5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">PlantGuard</h1>
            <p className="text-xs text-white/40 leading-none mt-0.5">AI Plant Disease Detector</p>
          </div>

          {/* Pill badge */}
          <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            38 diseases
          </span>
        </div>
      </header>

      {/* ── Main card ──────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-lg">

          {/* Glass card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl p-6 sm:p-8">

            {/* ── State: empty ──────────────────────────────────────── */}
            {uiState === 'empty' && (
              <div className="space-y-4 animate-fade-in">
                {/* Page headline */}
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Diagnose your plant
                  </h2>
                  <p className="text-white/50 text-sm">
                    Upload a clear leaf photo to get instant disease identification and treatment advice
                  </p>
                </div>

                <UploadZone
                  onFileSelected={handleFileSelected}
                  onError={handleError}
                />

                {/* Error banner */}
                {error && (
                  <div
                    id="error-banner"
                    role="alert"
                    className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-300 animate-fade-in"
                  >
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── State: loading ────────────────────────────────────── */}
            {uiState === 'loading' && <LoadingSpinner />}

            {/* ── State: result ─────────────────────────────────────── */}
            {uiState === 'result' && result && (
              <ResultCard
                result={result}
                imageUrl={imageUrl}
                onReset={handleReset}
              />
            )}

            {/* ── State: uncertain ──────────────────────────────────── */}
            {uiState === 'uncertain' && result && (
              <UncertainCard
                confidence={result.confidence}
                onReset={handleReset}
              />
            )}
          </div>

          {/* ── Supported plants footer note ───────────────────────── */}
          {uiState === 'empty' && (
            <p className="text-center text-xs text-white/20 mt-4 animate-fade-in">
              Supports: Apple · Cherry · Corn · Grape · Orange · Peach · Pepper · Potato · Raspberry · Soybean · Squash · Strawberry · Tomato
            </p>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-4 text-center text-xs text-white/15">
        Powered by MobileNetV2 · HuggingFace Transformers · FastAPI
      </footer>
    </div>
  )
}
