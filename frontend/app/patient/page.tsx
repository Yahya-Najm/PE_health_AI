"use client"

import { useState, useEffect, useRef } from "react"
import { useLang } from "@/lib/LangContext"
import { LANG } from "@/lib/lang"
import { saveSession, getHistory, analyzeFrame, scoreRep, type SessionRecord } from "@/lib/api"

const DAILY_TASKS = {
  en: [
    "10 reps of straight leg raises",
    "5 min ice pack after session",
    "Log pain level honestly",
  ],
  ru: [
    "10 повторений подъёма прямой ноги",
    "5 мин пакет со льдом после сеанса",
    "Честно оцените уровень боли",
  ],
}

const EXERCISE_STEPS = {
  en: [
    "Sit in a sturdy chair with feet flat on the floor.",
    "Slowly extend your right leg until straight, hold 3 seconds.",
    "Lower slowly. Repeat 10 times, then switch legs.",
    "Rest 60 seconds between sets. Complete 3 sets total.",
  ],
  ru: [
    "Сядьте на устойчивый стул, поставив ступни на пол.",
    "Медленно выпрямите правую ногу до конца, удержите 3 секунды.",
    "Опустите медленно. Повторите 10 раз, затем смените ногу.",
    "Отдыхайте 60 секунд между подходами. Всего 3 подхода.",
  ],
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length)
}

type MLResult = { quality: string; confidence: number; score: number }

export default function PatientPage() {
  const { lang } = useLang()
  const t = LANG[lang]

  // UI state
  const [tasks, setTasks] = useState([false, false, false])
  const [painLevel, setPainLevel] = useState(3)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [mlResult, setMlResult] = useState<MLResult | null>(null)

  // Webcam display state
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [angle, setAngle] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [repCount, setRepCount] = useState(0)
  const [maxAngle, setMaxAngle] = useState(0)

  // Refs — mutable values that must not cause re-renders or stale closures
  const videoRef         = useRef<HTMLVideoElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const wasExtendedRef   = useRef(false)
  const repCountRef      = useRef(0)
  const maxAngleRef      = useRef(0)
  const painLevelRef     = useRef(painLevel)
  const sessionStartRef  = useRef(0)
  const angleReadingsRef = useRef<number[]>([])

  useEffect(() => { painLevelRef.current = painLevel }, [painLevel])

  useEffect(() => {
    getHistory().then(setSessions).catch(() => {})
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      // Reset all tracking
      wasExtendedRef.current   = false
      repCountRef.current      = 0
      maxAngleRef.current      = 0
      sessionStartRef.current  = Date.now()
      angleReadingsRef.current = []
      setRepCount(0)
      setMaxAngle(0)
      setAngle(0)
      setFeedback("")
      setMlResult(null)
      setIsSessionActive(true)

      intervalRef.current = setInterval(async () => {
        const video  = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 2) return

        canvas.width  = video.videoWidth  || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.drawImage(video, 0, 0)
        const base64 = canvas
          .toDataURL("image/jpeg", 0.6)
          .replace("data:image/jpeg;base64,", "")

        try {
          const result = await analyzeFrame(base64)
          const a: number = result.angle ?? 0

          setAngle(a)
          setFeedback(result.feedback ?? "")
          angleReadingsRef.current.push(a)

          if (a > maxAngleRef.current) {
            maxAngleRef.current = a
            setMaxAngle(a)
          }

          // Rep counted when knee extends past 160° then returns below 110°
          if (a > 160) {
            wasExtendedRef.current = true
          } else if (a < 110 && wasExtendedRef.current) {
            wasExtendedRef.current = false
            repCountRef.current += 1
            setRepCount(repCountRef.current)
          }
        } catch {
          // skip frames that fail to process
        }
      }, 150)
    } catch (err) {
      console.error("Camera access denied:", err)
    }
  }

  const handleStop = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsSessionActive(false)

    // Compute biomechanical metrics from the session
    const totalSeconds = (Date.now() - sessionStartRef.current) / 1000
    const repDuration  = repCountRef.current > 0 ? totalSeconds / repCountRef.current : 2.5
    const wobble       = stdDev(angleReadingsRef.current)

    setSaving(true)
    try {
      // Call ML model for quality scoring; fall back to angle-based heuristic
      let qualityScore = parseFloat(Math.min(maxAngleRef.current / 160, 1.0).toFixed(3))
      try {
        const ml = await scoreRep({
          max_angle:    parseFloat(maxAngleRef.current.toFixed(2)),
          rep_duration: parseFloat(repDuration.toFixed(2)),
          knee_wobble:  parseFloat(wobble.toFixed(2)),
        })
        if (!ml.error) {
          setMlResult(ml as MLResult)
          qualityScore = parseFloat((ml as MLResult).score.toFixed(3))
        }
      } catch {
        // ML service unavailable — keep angle-based fallback
      }

      await saveSession({
        date:          new Date().toISOString().split("T")[0],
        reps:          repCountRef.current,
        max_angle:     parseFloat(maxAngleRef.current.toFixed(2)),
        quality_score: qualityScore,
        pain_level:    painLevelRef.current,
      })
      const updated = await getHistory()
      setSessions(updated)
    } finally {
      setSaving(false)
    }
  }

  const recent = [...sessions].reverse().slice(0, 3)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t.patient_portal}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* ── Left column ── */}
        <div className="space-y-4">
          {/* Daily tasks */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {t.daily_tasks}
            </h2>
            <ul className="space-y-2.5">
              {DAILY_TASKS[lang].map((task, i) => (
                <li key={i} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tasks[i]}
                    onChange={() =>
                      setTasks((prev) => prev.map((v, j) => (j === i ? !v : v)))
                    }
                    className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                  />
                  <span className={`text-sm ${tasks[i] ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {task}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Collapsible exercise instructions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setInstructionsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-700">{t.exercise_instructions}</span>
              <span className="text-slate-400 text-sm">{instructionsOpen ? "▲" : "▼"}</span>
            </button>
            {instructionsOpen && (
              <ol className="px-5 pb-5 space-y-2 list-decimal list-inside border-t border-slate-100">
                {EXERCISE_STEPS[lang].map((step, i) => (
                  <li key={i} className="text-sm text-slate-600 pt-2">{step}</li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Pain level slider */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {t.pain_level}
            </h2>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <span className="text-2xl font-bold text-slate-800 w-8 text-center">{painLevel}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
              <span>1</span><span>10</span>
            </div>
          </div>

          {/* Webcam card */}
          <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-52 object-cover bg-slate-900"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Live angle — top-left */}
              {isSessionActive && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-3xl font-bold tabular-nums leading-none">
                    {angle.toFixed(0)}°
                  </span>
                </div>
              )}

              {/* Rep counter — top-right */}
              {isSessionActive && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 text-center min-w-[52px]">
                  <div className="text-white text-xl font-bold tabular-nums leading-none">{repCount}</div>
                  <div className="text-slate-400 text-xs mt-0.5">reps</div>
                </div>
              )}

              {/* Max angle — bottom-left */}
              {isSessionActive && (
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded px-2 py-0.5">
                  <span className="text-slate-300 text-xs tabular-nums">max {maxAngle.toFixed(0)}°</span>
                </div>
              )}

              {/* Idle overlay */}
              {!isSessionActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  <span className="text-sm font-medium">Press Start to begin</span>
                </div>
              )}
            </div>

            {/* Real-time feedback strip */}
            {isSessionActive && feedback && (
              <div className={`px-4 py-2 text-sm font-semibold text-center transition-colors ${
                feedback === "Good extension!"
                  ? "text-emerald-400 bg-emerald-950/50"
                  : "text-amber-400 bg-amber-950/50"
              }`}>
                {feedback}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start / Stop & Save */}
      {!isSessionActive ? (
        <button
          onClick={handleStart}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-xl transition-colors mb-4 text-sm"
        >
          {t.start_session}
        </button>
      ) : (
        <button
          onClick={handleStop}
          disabled={saving}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mb-4 text-sm"
        >
          {saving ? "Scoring & saving…" : `${t.save_session} & Stop`}
        </button>
      )}

      {/* ML quality result badge — shown after session ends */}
      {!isSessionActive && mlResult && (
        <div className={`flex items-center justify-between rounded-xl px-5 py-3 mb-6 border ${
          mlResult.quality === "good"
            ? "bg-emerald-50 border-emerald-200"
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-lg ${mlResult.quality === "good" ? "text-emerald-500" : "text-red-500"}`}>
              {mlResult.quality === "good" ? "✓" : "✗"}
            </span>
            <span className={`font-semibold text-sm ${
              mlResult.quality === "good" ? "text-emerald-700" : "text-red-700"
            }`}>
              {mlResult.quality === "good" ? "Good form" : "Poor form"}
            </span>
          </div>
          <span className="text-sm text-slate-500">
            {(mlResult.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
      )}

      {/* Last 3 sessions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">{t.session_history}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">{t.no_sessions}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Reps</th>
                  <th className="px-4 py-3 text-left font-semibold">Max Angle</th>
                  <th className="px-4 py-3 text-left font-semibold">Quality</th>
                  <th className="px-4 py-3 text-left font-semibold">Pain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((s, i) => (
                  <tr key={i} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{s.date}</td>
                    <td className="px-4 py-3 text-slate-700">{s.reps}</td>
                    <td className="px-4 py-3 text-slate-700">{s.max_angle}°</td>
                    <td className="px-4 py-3 text-slate-700">{(s.quality_score * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-slate-700">{s.pain_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
