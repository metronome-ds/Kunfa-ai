import Image from 'next/image'

interface KunfaLogoProps {
  /** Height in pixels — width scales automatically */
  height?: number
  /** Use inverted (white) version for dark backgrounds */
  inverted?: boolean
  className?: string
}

/**
 * Official Kunfa logo using PNG image files.
 * - Light backgrounds: use default (black text logo)
 * - Dark backgrounds: use inverted={true} (applies CSS invert filter)
 *
 * Logo files expected at:
 *   /images/kunfa-logo-nav.png  (28px height, for nav bars)
 *   /images/kunfa-logo.png      (30px height, general use)
 */
export default function KunfaLogo({ height = 28, inverted = false, className = '' }: KunfaLogoProps) {
  return (
    <Image
      src="/images/kunfa-logo-nav.png"
      alt="Kunfa"
      height={height}
      width={Math.round(height * 3.5)}
      className={`object-contain ${inverted ? 'brightness-0 invert' : ''} ${className}`}
      priority
    />
  )
}
