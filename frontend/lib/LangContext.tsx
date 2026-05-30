"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { type Lang } from "./lang"

type LangContextType = { lang: Lang; setLang: (l: Lang) => void }

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en")

  useEffect(() => {
    const saved = localStorage.getItem("rehab-lang") as Lang | null
    if (saved === "en" || saved === "ru") setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem("rehab-lang", l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
