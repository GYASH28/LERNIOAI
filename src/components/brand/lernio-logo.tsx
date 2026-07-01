import Link from 'next/link'
import type { ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'

export const LERNIO_LOGO_SYMBOL_SRC = '/brand/lernio-logo-symbol.webp'
export const LERNIO_LOGO_FULL_SRC = '/brand/lernio-logo-transparent.webp'

const tileSize: Record<LogoSize, { className: string; pixels: number }> = {
  sm: { className: 'rounded-lg', pixels: 32 },
  md: { className: 'rounded-xl', pixels: 44 },
  lg: { className: 'rounded-2xl', pixels: 64 },
}

const nameSize: Record<LogoSize, string> = {
  sm: 'text-base',
  md: 'text-base',
  lg: 'text-xl',
}

const subtitleSize: Record<LogoSize, string> = {
  sm: 'text-[0.6875rem]',
  md: 'text-xs',
  lg: 'text-sm',
}

export function LernioLogoTile({
  className,
  markClassName,
  size = 'md',
}: {
  className?: string
  markClassName?: string
  size?: LogoSize
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden bg-[#10131c] shadow-[0_12px_30px_rgba(226,52,151,0.20)] ring-1 ring-border',
        tileSize[size].className,
        className,
      )}
      style={{ width: tileSize[size].pixels, height: tileSize[size].pixels }}
    >
      <img
        src={LERNIO_LOGO_SYMBOL_SRC}
        alt=""
        className={cn('block h-[88%] w-[88%] object-contain drop-shadow-[0_8px_18px_rgba(226,52,151,0.28)]', markClassName)}
        draggable={false}
      />
    </span>
  )
}

export function LernioBrandLockup({
  href,
  size = 'md',
  subtitle = 'Diploma learning OS',
  className,
}: {
  href?: string
  size?: LogoSize
  subtitle?: string
  className?: string
}) {
  const content = (
    <>
      <LernioLogoTile size={size} />
      <span className="min-w-0">
        <span className={cn('block font-extrabold leading-none tracking-tight text-foreground', nameSize[size])}>
          Lernio
        </span>
        <span className={cn('mt-1 block font-semibold uppercase tracking-wider text-muted-foreground', subtitleSize[size])}>
          {subtitle}
        </span>
      </span>
    </>
  )

  const classes = cn('inline-flex min-w-0 items-center gap-2.5 rounded-md', className)

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Lernio home">
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}

export function LernioFullLogoImage({
  className,
  alt = 'Lernio logo',
  loading,
  priority = false,
  fetchPriority,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  priority?: boolean
}) {
  return (
    <img
      src={LERNIO_LOGO_FULL_SRC}
      alt={alt}
      loading={priority ? 'eager' : loading}
      decoding="async"
      fetchPriority={priority ? 'high' : fetchPriority}
      className={className}
      draggable={false}
      {...props}
    />
  )
}
