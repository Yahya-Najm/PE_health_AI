"use client"

import Link from "next/link"
import { useLang } from "@/lib/LangContext"
import { LANG } from "@/lib/lang"

export default function Navbar() {
  const { lang, setLang } = useLang()
  const t = LANG[lang]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white h-16 flex items-center px-6 shadow-md">
      <span className="text-lg font-bold tracking-tight mr-8 text-sky-400">
        {t.app_title}
      </span>
      <div className="flex gap-6 flex-1">
        <Link
          href="/patient"
          className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          {t.patient_portal}
        </Link>
        <Link
          href="/doctor"
          className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          {t.doctor_portal}
        </Link>
      </div>
      <button
        onClick={() => setLang(lang === "en" ? "ru" : "en")}
        className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs font-semibold tracking-widest transition-colors"
      >
        {lang === "en" ? "RU" : "EN"}
      </button>
    </nav>
  )
}
