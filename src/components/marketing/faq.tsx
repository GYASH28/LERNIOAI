import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: 'Is Lernio free?',
    a: 'Yes. Lernio is free for students. You can sign up, learn, practise, use the AI Tutor, and sit mock exams without paying anything.',
  },
  {
    q: 'Who can create an account?',
    a: 'Any diploma student with an email address can create an account directly. You do not need an invite code. Academic details (programme, semester, division, roll number) are optional at signup and can be completed later.',
  },
  {
    q: 'Do teachers need an invite?',
    a: 'Yes. Elevated roles — CR, teacher, coordinator, reviewer, moderator and admin — are only granted through a cryptographically-strong invite code issued by an existing admin. Students can never self-escalate to a staff role.',
  },
  {
    q: 'Which subjects are available?',
    a: 'Lernio currently covers four Semester-3 subjects: Data Structures (CS201), OOP with C++ (CS202), Microprocessors & Programming (CS203), and Data Communication (CS204). More semesters and subjects are on the roadmap.',
  },
  {
    q: 'Does the AI Tutor use Lernio material?',
    a: 'Yes. The AI Tutor retrieves approved Lernio lessons from the database, expands them into citable chunks, and injects them into the prompt. Every answer that is marked "grounded" has retrieved evidence — citations reference real Lesson rows you can open.',
  },
  {
    q: 'Does the Coding Lab execute code?',
    a: 'Not yet. The Coding Lab is honestly labelled as a syntax-learning playground: it performs local syntax checks (brace matching, int main(), return 0;) and never claims to compile or execute your code. A real isolated C++ runner is on the roadmap.',
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes. You can export a full JSON of your account data at any time, and you can permanently delete your account from the Profile page. Deletion removes your attempts, tutor sessions, revision cards and XP — no hidden retention.',
  },
  {
    q: 'Is every topic complete?',
    a: 'No, and we are honest about it. Today, 11 of 64 Semester-3 topics have full five-mode lessons. The remaining topics show an honest "No lesson yet" state with links to related resources, so you never land on an empty page pretending to be content.',
  },
] as const

export function FAQ() {
  return (
    <section
      id="faq"
      className="marketing-section border-b border-border"
      aria-labelledby="faq-heading"
    >
      <div className="marketing-container max-w-3xl">
        <p className="marketing-eyebrow">FAQ</p>
        <h2 id="faq-heading" className="marketing-h2 mt-3">
          Questions, answered honestly.
        </h2>

        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold text-foreground">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-6 text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
