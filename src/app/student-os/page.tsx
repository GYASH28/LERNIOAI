import { redirect } from 'next/navigation'

/**
 * Compatibility route for existing bookmarks and shared links.
 * The complete student Learning OS now lives directly at /learn.
 */
export default function StudentOSPage() {
  redirect('/learn')
}
