import { useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_MB = 10

/**
 * UploadZone — drag-drop area + file picker button.
 *
 * Props:
 *   onFileSelected(file: File) — called when the user picks a valid file
 *   onError(message: string)  — called when validation fails (wrong type/size)
 */
export default function UploadZone({ onFileSelected, onError }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // ── Validation (client-side, mirrors backend rules) ──────────────────────
  function validateAndSubmit(file) {
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError(`"${file.name}" is not a JPG or PNG image. Please upload a leaf photo.`)
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      onError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`)
      return
    }

    onFileSelected(file)
  }

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault()      // Required to allow dropping
    setIsDragOver(true)
  }

  function handleDragLeave(e) {
    // Only clear if leaving the zone itself (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    validateAndSubmit(file)
  }

  // ── File input handler ────────────────────────────────────────────────────
  function handleFileInput(e) {
    const file = e.target.files[0]
    validateAndSubmit(file)
    // Reset input so the same file can be re-selected after an error
    e.target.value = ''
  }

  return (
    <div
      id="upload-zone"
      role="button"
      tabIndex={0}
      aria-label="Upload zone: drag and drop a plant leaf photo, or click to browse"
      onClick={() => fileInputRef.current.click()}
      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'relative flex flex-col items-center justify-center gap-5 cursor-pointer select-none',
        'rounded-2xl border-2 border-dashed transition-all duration-200',
        'p-12 sm:p-16 text-center',
        isDragOver
          ? 'drop-zone-active scale-[1.01]'
          : 'border-white/20 hover:border-green-400/60 hover:bg-white/[0.03]',
      ].join(' ')}
    >
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
      />

      {/* Upload icon */}
      <div className={`
        w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200
        ${isDragOver ? 'bg-green-400/20' : 'bg-white/5'}
      `}>
        {isDragOver ? (
          /* Arrow-down icon when dragging */
          <svg className="w-9 h-9 text-green-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        ) : (
          /* Cloud upload icon at rest */
          <svg className="w-9 h-9 text-green-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        )}
      </div>

      {/* Text */}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white/90">
          {isDragOver ? 'Drop your leaf photo here' : 'Drop your leaf photo here'}
        </p>
        <p className="text-sm text-white/40">or</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current.click() }}
          className="
            px-5 py-2 rounded-lg text-sm font-medium
            bg-green-500 hover:bg-green-400 active:bg-green-600
            text-white transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-transparent
          "
          id="browse-files-button"
        >
          Browse files
        </button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-white/30 tracking-wide">
        JPG or PNG · Max {MAX_SIZE_MB} MB · Leaf should fill most of the frame
      </p>

      {/* Pulsing ring animation when dragging */}
      {isDragOver && (
        <span className="absolute inset-0 rounded-2xl border-2 border-green-400/40 animate-ping pointer-events-none" />
      )}
    </div>
  )
}
