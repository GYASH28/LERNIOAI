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
    a: 'Any diploma student with an email address can create an account directly. You do not need an invite code. Academic details such as programme, semester, division and roll number are optional at signup and can be completed later.',
  },
  {
    q: 'How do CRs get access?',
    a: 'CR (Class Representative) access is granted by the admin via invite codes. The admin creates a CR invite for a specific class, shares the code with the chosen student, and the student redeems it during sign-up to become the CR for that class.',
  },
  {
    q: 'Which subjects are available today?',
    a: 'The production seed currently covers the Computer Engineering Semester 3 pilot: Data Structures, OOP with C++, Microprocessors and Programming, and Data Communication. The CWIT Academic Intelligence OS blueprint expands this into a verified branch-semester catalogue as sources are approved.',
  },
  {
    q: 'Does the AI Tutor use Lernio material?',
    a: 'Yes. The AI Tutor retrieves approved Lernio lessons from the database, expands them into citable chunks, and injects them into the prompt. Grounded answers reference real lesson rows instead of guessing.',
  },
  {
    q: 'Does the Coding Lab execute code?',
    a: 'Not yet. The Coding Lab is honestly labelled as a syntax-learning playground: it performs local syntax checks and never claims to compile or execute your code. A real isolated runner is on the roadmap.',
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes. You can export a full JSON of your account data at any time, and you can permanently delete your account from the Profile page. Deletion removes your attempts, tutor sessions, revision cards and XP.',
  },
  {
    q: 'Is every topic complete?',
    a: 'No, and Lernio is explicit about that. Incomplete topics show an honest empty state and related resources instead of pretending a full lesson exists.',
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
