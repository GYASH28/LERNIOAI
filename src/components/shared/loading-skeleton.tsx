import { LearningIllustration } from '@/components/engagement/learning-illustration'

/**
 * Shared loading state for student-facing routes.
 * It remains lightweight and theme-safe while communicating that context is
 * being prepared, rather than showing an unexplained spinner on a blank page.
 */
export function LoadingSkeleton({
  title = 'Preparing your workspace',
  message = 'Keeping your learning context while the page gets ready.',
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center px-5" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-5 text-center shadow-sm sm:p-7">
        <LearningIllustration variant="transition" animated className="mx-auto max-w-[320px]" />
        <h2 className="mt-1 text-xl font-black tracking-tight">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mx-auto mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-primary motion-safe:animate-[loadingTravel_1.1s_ease-in-out_infinite]" />
        </div>
        <style>{`
          @keyframes loadingTravel {
            0%, 100% { transform: translateX(-70%); }
            50% { transform: translateX(170%); }
          }
          @keyframes learningFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}</style>
      </div>
    </div>
  )
}
