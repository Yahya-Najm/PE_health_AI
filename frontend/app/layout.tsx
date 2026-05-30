import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { LangProvider } from "@/lib/LangContext"
import Sidebar from "@/components/Sidebar"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

export const metadata: Metadata = {
  title: "RehabTrack",
  description: "Knee rehabilitation tracking app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-screen bg-gray-50 font-sans">
        <LangProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen">
              {children}
            </main>
          </div>
        </LangProvider>
      </body>
    </html>
  )
}
