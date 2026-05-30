"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLang } from "@/lib/LangContext"
import { LANG } from "@/lib/lang"

function PatientIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function DoctorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-sky-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const { lang, setLang } = useLang()
  const t = LANG[lang]
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-slate-900 flex flex-col z-50 shadow-xl">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-0.5">
          <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-lg font-bold text-white tracking-tight">{t.app_title}</span>
        </div>
        <p className="text-xs text-slate-500 pl-8">Knee Rehabilitation</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 mb-2">
          Portals
        </p>
        <NavLink
          href="/patient"
          label={t.patient_portal}
          icon={<PatientIcon />}
          active={pathname === "/patient"}
        />
        <NavLink
          href="/doctor"
          label={t.doctor_portal}
          icon={<DoctorIcon />}
          active={pathname === "/doctor"}
        />
      </nav>

      {/* Language toggle + footer */}
      <div className="px-4 py-5 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Language</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                lang === "en"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ru")}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                lang === "ru"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              RU
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-700 text-center">Phase 4 — ML Powered</p>
      </div>
    </aside>
  )
}
