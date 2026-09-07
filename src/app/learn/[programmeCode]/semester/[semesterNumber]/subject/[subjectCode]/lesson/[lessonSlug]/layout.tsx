import '@/styles/notes-reader-v4.css'

export default function LessonReaderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="lesson-notes-v4">{children}</div>
}
