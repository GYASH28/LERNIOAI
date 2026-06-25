'use client'

import { LernioLogoTile } from '@/components/brand/lernio-logo'
import { useAppStore } from '@/store/app-store'
import { Heart, Github, Shield } from 'lucide-react'

export function Footer() {
  const { setView } = useAppStore()
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <LernioLogoTile size="sm" />
            <span className="text-sm font-semibold text-foreground">Lernio AI 2.0</span>
            <span className="text-xs text-muted-foreground">- Cusrow Wadia Institute of Technology (CWIT) - G Scheme 2023</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => setView('profile')} className="hover:text-foreground transition-colors flex items-center gap-1">
              <Shield className="h-3 w-3" /> Privacy
            </button>
            <a href="https://github.com/GYASH28/LERNIOAI" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Github className="h-3 w-3" /> GitHub
            </a>
            <span className="flex items-center gap-1">
              Made with <Heart className="h-3 w-3 fill-red-500 text-red-500" /> for diploma students
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
