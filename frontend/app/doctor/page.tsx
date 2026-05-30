"use client"

import { useState, useEffect } from "react"
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useLang } from "@/lib/LangContext"
import { LANG } from "@/lib/lang"
import { getHistory, type SessionRecord } from "@/lib/api"

function MLImage({
  src,
  alt,
  fallback,
}: {
  src: string
  alt: string
  fallback: string
}) {
  const [errored, setErrored] = useState(false)
  return errored ? (
    <div className="h-44 flex items-center justify-center">
      <p className="text-xs text-slate-400 text-center">{fallback}</p>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-44 object-contain"
      onError={() => setErrored(true)}
    />
  )
}

export default function DoctorPage() {
  const { lang } = useLang()
  const t = LANG[lang]
  const [sessions, setSessions] = useState<SessionRecord[]>([])

  useEffect(() => {
    getHistory().then(setSessions).catch(() => {})
  }, [])

  const total      = sessions.length
  const avgQuality = total > 0 ? sessions.reduce((a, s) => a + s.quality_score, 0) / total : null
  const bestAngle  = total > 0 ? Math.max(...sessions.map((s) => s.max_angle)) : null

  // Count consecutive poor-quality sessions from the most recent end
  let consecutivePoor = 0
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].quality_score < 0.5) consecutivePoor++
    else break
  }
  const showRiskWarning = consecutivePoor >= 2

  const chartData = sessions.map((s, i) => ({
    session: `#${i + 1}`,
    quality: parseFloat((s.quality_score * 100).toFixed(1)),
    reps:    s.reps,
    angle:   parseFloat(s.max_angle.toFixed(1)),
  }))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t.doctor_portal}</h1>

      {/* Risk warning */}
      {showRiskWarning && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
          <span className="shrink-0">⚠</span>
          <span>{t.risk_warning}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label={t.total_sessions} value={total.toString()} icon="📋" />
        <StatCard
          label={t.avg_quality}
          value={avgQuality !== null ? `${(avgQuality * 100).toFixed(1)}%` : "—"}
          icon="📊"
        />
        <StatCard
          label={t.best_angle}
          value={bestAngle !== null ? `${bestAngle}°` : "—"}
          icon="📐"
        />
      </div>

      {/* Session history table */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">{t.session_history}</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">{t.no_sessions}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Reps</th>
                  <th className="px-4 py-3 text-left font-semibold">Max Angle</th>
                  <th className="px-4 py-3 text-left font-semibold">Quality</th>
                  <th className="px-4 py-3 text-left font-semibold">Pain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s, i) => (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-slate-50 ${
                      s.quality_score < 0.5 ? "bg-red-50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-700">{s.date}</td>
                    <td className="px-4 py-3 text-slate-700">{s.reps}</td>
                    <td className="px-4 py-3 text-slate-700">{s.max_angle}°</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${
                        s.quality_score >= 0.7 ? "text-emerald-600"
                        : s.quality_score >= 0.5 ? "text-amber-600"
                        : "text-red-600"
                      }`}>
                        {(s.quality_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.pain_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Session analytics (only when data exists) ── */}
      {sessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Session Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <ChartCard label="AI Quality Score">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, "Quality"]} />
                  <Line type="monotone" dataKey="quality" stroke="#0ea5e9" strokeWidth={2}
                    dot={{ r: 3, fill: "#0ea5e9" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard label="Repetition Adherence">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, "Reps"]} />
                  <Bar dataKey="reps" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard label="Range of Motion (Max Angle)">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 180]} tick={{ fontSize: 11 }} unit="°" />
                  <Tooltip formatter={(v) => [`${v}°`, "Max Angle"]} />
                  <Line type="monotone" dataKey="angle" stroke="#f59e0b" strokeWidth={2}
                    dot={{ r: 3, fill: "#f59e0b" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        </div>
      )}

      {/* ── ML Model Analytics (always visible) ── */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">ML Model Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <ChartCard label="Feature Importance">
            <MLImage
              src="http://localhost:8000/ml/feature-importance"
              alt="Feature Importance"
              fallback="Run ml/train_model.py to generate this chart"
            />
          </ChartCard>

          <ChartCard label="AUC-ROC Curve">
            <MLImage
              src="http://localhost:8000/ml/roc-curve"
              alt="AUC-ROC Curve"
              fallback="Run ml/train_model.py to generate this chart"
            />
          </ChartCard>

        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function ChartCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</p>
      {children}
    </div>
  )
}
