import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function MarketingSectionHeader({
  eyebrow,
  title,
  description,
  id,
  width = 'normal',
  children,
}: {
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  id?: string
  width?: 'wide' | 'normal' | 'narrow'
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        width === 'wide' && 'max-w-3xl',
        width === 'normal' && 'max-w-2xl',
        width === 'narrow' && 'max-w-xl',
      )}
    >
      <p className="marketing-eyebrow">{eyebrow}</p>
      <h2 id={id} className="marketing-h2 mt-3 text-balance">
        {title}
      </h2>
      {description ? (
        <p className="marketing-lede mt-4 text-pretty">{description}</p>
      ) : null}
      {children}
    </div>
  )
}
