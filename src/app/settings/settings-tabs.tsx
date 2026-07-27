'use client'

import { useState } from 'react'
import { User, Bell, Palette, Shield, Download, HelpCircle } from 'lucide-react'
import { usePrefs } from '@/components/theme-provider'

interface SettingsTabsProps {
  initialUser: {
    id: string
    name: string
    email: string
    role: string
    preferredLang: string
    examDate: string | null
    dailyMins: number
    avatar: string | null
  }
}

type Tab = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'data' | 'help'

export function SettingsTabs({ initialUser }: SettingsTabsProps) {
  const [tab, setTab] = useState<Tab>('profile')
  const { pref, setPref } = usePrefs()

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'privacy', label: 'Privacy', icon: Shield },
    { key: 'data', label: 'Data', icon: Download },
    { key: 'help', label: 'Help', icon: HelpCircle },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm">{initialUser.name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm">{initialUser.email}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm capitalize">{initialUser.role}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Preferred Language</label>
              <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm">{initialUser.preferredLang}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Daily Study Goal (minutes)</label>
              <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm">{initialUser.dailyMins} minutes</p>
            </div>
            <p className="text-xs text-muted-foreground">
              To edit your profile, visit the <a href="/profile" className="text-primary hover:underline">Profile page</a>.
            </p>
          </div>
        )}

        {tab === 'appearance' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Theme</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPref({ appearance: mode })}
                    className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      pref.appearance === mode
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Color Palette</label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {(['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPref({ palette: p })}
                    className={`rounded-md border px-2 py-2 text-xs font-medium capitalize transition-colors ${
                      pref.palette === p
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Motion</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['full', 'reduced', 'none'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPref({ motion: m })}
                    className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      pref.motion === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Notification preferences will be available here once the notification system is fully configured.
            </p>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your data is private and never shared with third parties.
            </p>
            <div className="rounded-md border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Account Actions</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                To export or delete your data, use the Data tab.
              </p>
            </div>
          </div>
        )}

        {tab === 'data' && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Export your data</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Download a JSON file with all your progress, bookmarks, and activity.
              </p>
              <a
                href="/api/user/export"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                <Download className="h-3 w-3" />
                Export data
              </a>
            </div>
          </div>
        )}

        {tab === 'help' && (
          <div className="space-y-3">
            <a href="/help" className="block rounded-md border border-border bg-card p-4 hover:bg-accent transition-colors">
              <h3 className="text-sm font-semibold">Help Center</h3>
              <p className="mt-1 text-xs text-muted-foreground">Browse articles and tutorials.</p>
            </a>
            <a href="/support" className="block rounded-md border border-border bg-card p-4 hover:bg-accent transition-colors">
              <h3 className="text-sm font-semibold">Contact Support</h3>
              <p className="mt-1 text-xs text-muted-foreground">Get help from the Lernio team.</p>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
