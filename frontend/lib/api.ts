const BASE = "http://localhost:8000"

export async function saveSession(data: {
  date: string
  reps: number
  max_angle: number
  quality_score: number
  pain_level: number
}) {
  const res = await fetch(`${BASE}/session/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getHistory(): Promise<SessionRecord[]> {
  const res = await fetch(`${BASE}/session/history`)
  return res.json()
}

export async function scoreRep(data: {
  max_angle: number
  rep_duration: number
  knee_wobble: number
}) {
  const res = await fetch(`${BASE}/ml/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function analyzeFrame(base64Frame: string) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frame: base64Frame }),
  })
  return res.json()
}

export interface SessionRecord {
  date: string
  reps: number
  max_angle: number
  quality_score: number
  pain_level: number
}
