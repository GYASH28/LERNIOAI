import { redirect } from 'next/navigation'

/**
 * Compatibility route kept for old bookmarks.
 * The Student OS is now integrated directly into /learn.
 */
export default function StudentOSPage() {
  redirect('/learn')
}
