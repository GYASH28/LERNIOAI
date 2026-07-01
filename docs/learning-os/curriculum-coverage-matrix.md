# Curriculum Coverage Matrix

## Verification Status Legend

- `official_verified`: backed by official CWIT R23 curriculum PDF/source page.
- `candidate`: present in prompt, pasted research, timetable, or curated PDF but not yet parsed from official curriculum.
- `needs_official_source`: must not be published to students.

## Starting Index From Prompt and Inputs

Semester 1 shared CP/CI official targets:

| Subject | CP code | CI code | Status |
|---|---:|---:|---|
| Basic Mathematics | R23CP1701 | R23CI1701 | structure_verified |
| Basic Science | R23CP2701 | R23CI2701 | structure_verified |
| Communication Skills | R23CP1702 | R23CI1702 | structure_verified |
| Engineering Graphics | R23CP2201 | R23CI2201 | structure_verified |
| Engineering Workshop Practice | R23CP6401 | R23CI6601 | structure_verified |
| Fundamentals of ICT | R23CP6402 | R23CI6602 | structure_verified |
| Yoga and Meditation | R23CP4701 | R23CI4701 | structure_verified |

Semester 2 shared/branch-specific targets:

| Subject | CP code | CI code | Status |
|---|---:|---:|---|
| Applied Mathematics | R23CP1703 | R23CI1703 | structure_verified |
| Basic Electrical and Electronics Engineering | R23CP1301 | R23CI1301 | structure_verified |
| Programming in C | R23CP1401 | R23CI1601 | structure_verified |
| Linux Basics | R23CP2401 | R23CI2601 | structure_verified |
| Web Page Designing | R23CP6403 | R23CI6603 | structure_verified |
| Professional Communication | R23CP6701 | R23CI6701 | structure_verified |
| Social and Life Skills | R23CP4401 | R23CI4601 | structure_verified |

Official-source correction:

- The official COMP Semester 2 structure PDF includes Basic Electrical and Electronics Engineering as `R23CP1301`.
- This overrides the prompt's planning note that treated BEEE as CIOT-only.

Advanced-semester candidates:

| Subject | CP code | CI code | Status |
|---|---:|---:|---|
| Data Structures | R23CP2402 | R23CI2602 | candidate |
| Object Oriented Programming with C++ | R23CP6404 | R23CI6604 | candidate |
| Microprocessors and Its Programming | R23CP2403 | n/a | candidate |
| Digital Techniques and Microcontroller | n/a | R23CI2603 from PDF candidate | candidate |
| Data Communication | R23CP2404 | n/a | candidate |
| IoT and Its Application | n/a | R23CI2604 | candidate |
| Operating System | CP code pending parse | n/a | candidate |
| Embedded Operating Systems | n/a | R23CI2606 candidate | candidate |
| Database Management System | code pending parse | code pending parse | candidate |
| Software Engineering | R23CP2409 | R23CI2610 | candidate |

## Current Database Coverage

- Existing destructive seed creates only one DCOMP Semester 3 scheme.
- Existing subject codes are generic `CS201`, `CS202`, `CS203`, `CS204`, not official R23 codes.
- Phase 4 created structure-verified Semester 1-2 manifests for COMP and CIOT:
  - `content/curriculum/cwit-r23/comp/semester-1.json`
  - `content/curriculum/cwit-r23/comp/semester-2.json`
  - `content/curriculum/cwit-r23/ciot/semester-1.json`
  - `content/curriculum/cwit-r23/ciot/semester-2.json`
- Phase 8 added structure-verified COMP Semester 3-6 manifests from the official COMP R23 curriculum PDF:
  - `content/curriculum/cwit-r23/comp/semester-3.json`
  - `content/curriculum/cwit-r23/comp/semester-4.json`
  - `content/curriculum/cwit-r23/comp/semester-5.json`
  - `content/curriculum/cwit-r23/comp/semester-6.json`
- CIOT Semester 3-6 manifests are present as explicit empty blockers with `verificationStatus: needs_official_source` until semester placement is verified from an official semester structure/source rather than inferred from a category-ordered curriculum index.
- The manifest schema lives at `content/curriculum/cwit-r23/schemas/curriculum.schema.json`.
- `npm run curriculum:validate` validates required evidence, duplicate codes, governed statuses and semester bounds.
- `npm run coverage:learning` writes the machine-readable coverage report at `content/reports/cwit-r23-learning-coverage.json`.
- `npm run coverage:learning` remains offline/manifests-first by default; `npx tsx scripts/build-learning-coverage-report.ts --with-db` attaches live published database coverage when PostgreSQL is reachable, and `--require-db` makes that snapshot mandatory for release checks.
- Review-only official structure extraction report:
  - `content/curriculum/cwit-r23/extraction-reports/official-structure-candidates.json`
  - `npm run curriculum:extract-units`
  - Candidate unit extraction is noisy for some PDF tables and must be reviewed before promotion into manifests.
  - The extraction report includes `unitQuality` blockers for non-consecutive, duplicate, truncated, mojibake and table-noise unit titles.
- Review-only official unit candidate queue:
  - `content/curriculum/cwit-r23/extraction-reports/official-unit-candidate-review-queue.json`
  - `npm run curriculum:unit-review-queue`
  - `/admin/learning/unit-candidates`
  - The queue converts extraction blockers into reviewer statuses and does not mutate manifests or the database.
- Review-only official timetable evidence report:
  - `content/curriculum/cwit-r23/extraction-reports/official-timetable-evidence.json`
  - `tmp/pdfs/official/Winter-Examination-2025.columns.json`
  - `npm run curriculum:extract-timetable-columns`
  - `npm run curriculum:extract-timetable`
  - Source: official CWIT Winter Examination 2025 Time Table PDF.
  - The report records exact whole-page and fixed-column text-extracted CP/CI R23 code appearances only.
  - It has `publicationReadySemesterManifests: 0` and must not be used to infer CIOT Semester 3-6 placement.
- Review-only official course catalog report:
  - `content/curriculum/cwit-r23/extraction-reports/official-course-catalog.json`
  - `npm run curriculum:extract-catalog`
  - `/admin/learning/course-catalog`
  - The report extracts source-backed course codes and course names from official curriculum PDF course blocks.
  - It records 81 official courses, 59 local manifest subject codes and 26 unplaced official courses.
  - All 26 unplaced official courses are CIOT entries; they remain blocked until an official semester-placement manifest/source is obtained.
- `npm run curriculum:promote-official-structure` dry-runs official course-outcome promotion.
- `npx tsx scripts/promote-curriculum-official-structure.ts --write --overwrite` promoted 51 official subject outcome sets from the official curriculum PDFs. Unit promotion remains gated behind `--units` and has not been run.

Latest local coverage report:

- 2 target programmes and 12 semester slots are reported.
- 12 of 12 semester manifests are present.
- CIOT Semester 3-6 are explicit draft-only blocker manifests with 0 subjects until official semester-placement evidence is obtained.
- 59 subject structures are present.
- 51 subject structures have official course outcomes promoted into the manifests.
- 27 subject structures have review-only unit-title candidates in the extraction report.
- The official catalog report records 81 official course entries and 26 unplaced official CIOT entries.
- 0 subject structures currently pass the strict automatic unit-promotion quality gate.
- The unit review queue reports 0 subjects ready for promotion, 27 needing manual review and 32 blocked by missing course blocks or no extracted unit candidates.
- 0 subject structures have promoted unit structures.
- 0 units, topics and lessons are promoted into publishable manifests yet.
- 131 YouTube candidate rows match current manifest subject codes in the coverage report, all draft/unpublished.
- 100 metadata-checked YouTube candidates are represented in the reviewer queue as 252 subject mappings.
- 0 YouTube subject mappings are ready for lesson-level mapping because verified lessons are absent.
- 18 YouTube subject mappings are blocked by missing manifest subjects absent from the current official catalog report.
- 65 YouTube subject mappings are blocked by official CIOT course identities that remain unplaced until official semester-placement evidence is obtained.
- 169 YouTube subject mappings are blocked by missing verified lesson structure.
- 131 of those matching candidate rows have current link-health checks and all 131 are reachable.
- 41 CP/CI R23 code appearances are recorded from the official Winter 2025 timetable: 7 whole-page text matches and 34 fixed-column crop matches.
- These appearances resolve to 34 unique timetable evidence codes: 17 COMP and 17 CIOT.
- 0 timetable code appearances are publication-ready for semester manifest promotion.
- 194 verification items remain pending across explicit CIOT advanced-semester blocker manifests, structure-only curriculum rows and draft resource candidates.

## Required Manifest Gates

Each manifest import must fail on:

- duplicate subject code within a scheme;
- invalid semester number;
- missing source evidence or page range;
- unit/topic order gaps;
- subject marked published while verification is incomplete;
- CIOT-only subjects attached to DCOMP;
- DCOMP-only subjects attached to DCIOT.
