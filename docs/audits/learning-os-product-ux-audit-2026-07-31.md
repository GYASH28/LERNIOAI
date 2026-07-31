# Learnio Learning OS — Product, UI and UX Audit

**Date:** 31 July 2026  
**Branch:** `fix/learning-os-experience-redesign`  
**Scope:** Learn home, subject journey, lesson workspace, global student navigation, empty/loading states, page transitions and public opening sequence.

## Product diagnosis

The previous implementation had a technically large feature surface but did not create a strong learning product. It behaved like a catalogue of capabilities rather than a guided student workflow.

### Main problems found

1. **The Learn page tried to explain the whole app at once.**
   - Hero, six statistics, daily missions, focus timer, adaptive paths, six semesters, tools, mascots and profile controls competed on one page.
   - A student could see many actions but could not immediately tell which action mattered.

2. **Feature quantity replaced hierarchy.**
   - Practice, Revision, LEO, Games, Notebook, Coding and Planner were presented as equal destinations.
   - The page did not clearly communicate that these tools should support a specific lesson.

3. **The student journey was fragmented.**
   - Learn, Materials and the former Student OS looked like separate products.
   - `/student-os` and `/learn` competed as learning homes.
   - Mobile navigation also reflected this duplicate mental model.

4. **The visual language was too card-heavy and plain.**
   - Most sections used the same bordered rectangle pattern.
   - There was little visual storytelling, illustration or emotional pacing.
   - Empty and loading states looked unfinished.

5. **Engagement additions were not sufficiently contextual.**
   - Gamification, mascots and missions existed, but they were not consistently tied to the student’s next lesson.
   - More engagement widgets would have made the problem worse without a product hierarchy.

6. **The original cinematic intro was too long and operationally risky.**
   - It used a large canvas renderer and a long multi-second timeline.
   - It attempted a live DOM handoff to a hero book element.
   - The landing page could become visible before the client-side intro decision completed.
   - The animation was visually separate from the actual product story.

7. **Page transitions had no meaning.**
   - Routes changed with generic loading or abrupt swaps.
   - The student received no confirmation that subject and lesson context were being preserved.

8. **Global student states were inconsistent.**
   - Some routes used a plain spinner.
   - Empty states used large emoji and sometimes ignored `action.href`.
   - These states made otherwise functional pages feel unfinished.

9. **The Learn page mixed curriculum navigation and utility navigation.**
   - Semester subjects and app tools were treated as the same kind of choice.
   - This increases decision fatigue, particularly on mobile.

10. **Mobile density was too high.**
    - Several dense grids and secondary controls appeared before the student reached the curriculum.
    - Cards contained too much metadata at once.

## Product principle adopted

> Learnio should show the student one useful next move, preserve context through the learning loop, and reveal tools only when their purpose is clear.

The primary loop is now:

1. Choose or continue a lesson.
2. Understand it through the lesson workspace.
3. Practise to identify gaps.
4. Ask LEO when another explanation is needed.
5. Save important mistakes or formulas.
6. Revise the lesson when it becomes due.

Games, Coding Lab and Planner remain supporting environments—not competing learning homes.

## Changes implemented

### Learn home redesign

The Learn page now has five intentional layers:

1. **Next useful study move**
   - Time-aware greeting
   - Current programme and semester
   - One primary continue action
   - Current subject, lesson and streak context
   - Visual journey illustration
   - Mascot coach note

2. **Today’s route**
   - Maximum five visible steps
   - Clear ordering and next-step badge
   - Real completion controls
   - Visible finish line and progress dial
   - Explanation for why the selected adaptive path was chosen

3. **Semester workspace**
   - Compact semester switching
   - Subject search
   - Visual subject cards
   - Lesson, video, credit and detailed-note status
   - Direct entry into the ordered subject journey

4. **Contextual learning tools**
   - Practice, Revision, LEO and Notebook only
   - Each card explains when the tool is useful
   - Secondary tools remain available in navigation without overwhelming Learn

5. **Weekly balance**
   - Daily and weekly study targets
   - Revision due count
   - Planned lessons
   - Account XP
   - Planner and learning-profile access

### Twenty engagement and usability improvements

1. Time-aware personalised greeting.
2. One primary “next useful move” action.
3. Clear recommendation rationale.
4. Five-step maximum daily route.
5. Explicit “Next” step marker.
6. Mission completion with immediate next-step feedback.
7. Visual progress dial.
8. Adaptive-path selector placed next to its explanation.
9. Focus room with 15, 25 and 45-minute presets.
10. Persistent focus-session statistics.
11. Contextual coach notes.
12. Short, non-disruptive learning jokes.
13. Custom vector learning illustrations.
14. Subject-specific illustration selection.
15. Searchable semester workspace.
16. Detailed-notes readiness badge.
17. Specific-video availability badge.
18. Weekly workload summary.
19. Contextual tool descriptions.
20. Celebration illustration after completing the daily route.
21. Illustrated empty states.
22. Empty-state links now work when `action.href` is supplied.
23. Illustrated loading state.
24. Route-specific transition messages.
25. Route-specific transition jokes.
26. Lightweight static visual atmosphere across authenticated pages.
27. Reduced-motion and low-power safeguards.
28. Old `/student-os` links remain compatible while redirecting to Learn.

### Global UI changes

- Added a reusable SVG illustration system for journey, focus, practice, revision, coding, planner, Tutor, celebration, empty and transition states.
- Added a CSS-only route atmosphere instead of bringing back the removed animated canvas background.
- Added short page-transition stories that explain what context is moving into the next workspace.
- Added route-specific micro-jokes without interrupting the student’s task.
- Rebuilt shared empty states with functional actions, better copy and illustrations.
- Rebuilt the shared loading state so it communicates what is happening.

### Opening sequence replacement

The old canvas intro is no longer mounted by the landing page.

The new sequence:

- Uses a deterministic HTML/CSS motion design structure compatible with HyperFrames.
- Has a matching HyperFrames source composition at `motion/hyperframes/lernio-opening.html`.
- Runs for approximately 3.4 seconds on capable desktop devices.
- Uses a shorter 2.4-second sequence on mobile, save-data and low-power contexts.
- Uses a reduced 850ms brand reveal for reduced-motion users.
- Plays once per browser session.
- Includes a clear Skip control.
- Hides landing content before first paint when the sequence should play.
- Avoids previewing the app before the opening animation.
- Avoids canvas rendering and live DOM element handoff.
- Tells the product story: Learn → Practise → Revise → Understand.

## What was deliberately not added

The redesign does not add random decorative widgets, autoplay audio, heavy WebGL backgrounds, forced daily popups, fake achievements, artificial XP or jokes inside serious exam actions.

These would increase novelty while reducing practicality.

## Remaining content dependency

A complete lesson-specific video catalogue still depends on expanding playlist-only curriculum sources into direct video IDs and reviewing uncertain mappings. The runtime must continue showing an honest “no verified direct video” state instead of repeating playlists.

## Validation requirements

Before merging:

- ESLint
- TypeScript
- Unit tests
- Production build
- Playwright desktop and mobile routes
- Keyboard navigation
- Reduced-motion behaviour
- Landing intro first-visit and returning-visit behaviour
- Learn page at 360px, 390px, 768px, 1180px and 1440px widths
- Subject and lesson navigation for DCOMP and DCIOT
- Vercel preview when account build capacity is available
