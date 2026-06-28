'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { LernioLogoTile } from '@/components/brand/lernio-logo'
import { Heart, Github, Shield } from 'lucide-react'

const AiCopilot = dynamic(
  () => import('@/components/ai/ai-copilot').then((module) => module.AiCopilot),
  { ssr: false },
)

export function Footer() {
  const [copilotReady, setCopilotReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setCopilotReady(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <footer className="mt-auto border-t border-border bg-card/50">
        <div className="app-footer-inner py-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <LernioLogoTile size="sm" />
              <span className="text-sm font-semibold text-foreground">
                Lernio AI 2.0
              </span>
              <span className="text-xs text-muted-foreground">
                CWIT - G Scheme 2023
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:justify-end">
              <Link
                href="/privacy"
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Shield className="h-3 w-3" />
                Privacy
              </Link>
              <a
                href="https://github.com/GYASH28/LERNIOAI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Github className="h-3 w-3" />
                GitHub
              </a>
              <span className="flex items-center gap-1">
                Made with <Heart className="h-3 w-3 fill-destructive text-destructive" /> for diploma students
              </span>
            </div>
          </div>
        </div>
      </footer>
      {copilotReady ? <AiCopilot /> : null}
    </>
  )
}
