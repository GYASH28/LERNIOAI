"""Extract CWIT R23 unit topics and outcomes from the official curriculum tables.

The generated file is curriculum evidence, not AI-authored notes. It is used as
the source for honest Materials fallbacks when a richer reviewed note document
does not exist yet.
"""

from __future__ import annotations

import json
import re
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
CURRICULUM_ROOT = ROOT / "content" / "curriculum" / "cwit-r23"
OUTPUT_PATH = CURRICULUM_ROOT / "official-course-content.json"
PDF_BY_DEPARTMENT = {
    "COMP": ROOT / "tmp" / "pdfs" / "cwit-r23-computer-engineering.pdf",
    "CIOT": ROOT / "tmp" / "pdfs" / "cwit-r23-computer-engineering-iot.pdf",
}
SOURCE_URL_BY_DEPARTMENT = {
    "COMP": "https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf",
    "CIOT": "https://cwit.mespune.org/wp-content/uploads/2023/07/IOTR23_ALL_Curriculam-FINALV.pdf",
}


@dataclass
class ExtractedUnit:
    order: int
    title_hint: str | None = None
    topic_parts: list[str] = field(default_factory=list)
    outcome_parts: list[str] = field(default_factory=list)
    teaching_hours: str | None = None
    theory_marks: str | None = None
    mapped_outcome: str | None = None
    source_pages: set[int] = field(default_factory=set)


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\u00a0", " ").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(" .\n\t")


def parse_unit_number(value: Any) -> int | None:
    match = re.match(
        r"^\s*(?:UNIT\s*(?:NO\.)?\s*[-:–]?\s*)?([1-9]\d*|VI|IV|III|II|I|V)(?!\.\d)\.?\b",
        clean_text(value),
        re.I,
    )
    if not match:
        return None
    label = match.group(1).upper()
    romans = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}
    return romans.get(label, int(label) if label.isdigit() else None)


def parse_unit_title_hint(value: Any) -> str | None:
    text = clean_text(value)
    if parse_unit_number(text) is None:
        return None
    candidate = re.sub(
        r"^\s*(?:UNIT\s*(?:NO\.)?\s*[-:–]?\s*)?(?:[1-9]\d*|VI|IV|III|II|I|V)(?![A-Za-z0-9]|\.\d)\.?\s*[-:–]?\s*",
        "",
        text,
        count=1,
        flags=re.I,
    )
    candidate = clean_text(candidate)
    return candidate if 3 <= len(candidate) <= 120 else None


def split_learning_outcomes(value: str) -> list[str]:
    normalized = clean_text(value)
    if not normalized:
        return []
    matches = list(re.finditer(r"\b(?:TLO|UO|LO)\s*\d+(?:\.\d+)?", normalized, re.I))
    if not matches:
        return [normalized]
    outcomes: list[str] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(normalized)
        outcome = clean_text(normalized[match.start():end])
        if outcome:
            outcomes.append(outcome)
    return outcomes


def compact_empty_columns(table: list[list[Any]]) -> list[list[Any]]:
    """Remove PDF-artifact columns that are blank in every row."""
    if not table:
        return table
    width = max(len(row) for row in table)
    keep = [
        index for index in range(width)
        if any(index < len(row) and bool(clean_text(row[index])) for row in table)
    ]
    return [[row[index] if index < len(row) else None for index in keep] for row in table]


def derive_unit_title(content: str, fallback: str) -> str:
    """Prefer the table's bold topic heading over a fragmented manifest title."""
    normalized = clean_text(content)
    if not normalized:
        return fallback
    first_lines = " ".join(normalized.splitlines()[:4])
    first_lines = re.sub(
        r"^\s*(?:Unit\s*(?:No\.)?\s*)?(?:VI|IV|III|II|I|V|\d+)(?![A-Za-z0-9]|\.\d)\s*[-:.]?\s*",
        "",
        first_lines,
        flags=re.I,
    )
    first_lines = re.sub(r"^\s*\d+\.\d+\s*", "", first_lines)
    before_number = re.split(r"\s+[1-6]\.\d+\s*", first_lines, maxsplit=1)
    first_lines = before_number[0].rstrip(" :")
    if len(before_number) > 1 and 3 <= len(first_lines) <= 120 and len(first_lines.split()) <= 16:
        return first_lines
    heading_match = re.match(r"^(.{3,120}?):(?:\s|$)", first_lines)
    if heading_match:
        candidate = clean_text(heading_match.group(1))
        if 1 < len(candidate.split()) <= 16:
            return candidate
    first_line = clean_text(normalized.splitlines()[0])
    first_line = re.sub(r"^\s*\d+\.\d+\s*", "", first_line)
    first_line = re.sub(r"\s+\d+\s*$", "", first_line)
    if 3 <= len(first_line) <= 90:
        return first_line.rstrip(":")
    return fallback


def normalize_unit_title(title: str, fallback: str) -> str:
    candidate = re.sub(r"\s+", " ", clean_text(title))
    candidate = re.sub(r"^\d+\.\d+\s*", "", candidate)
    candidate = re.sub(r"^\d+\.\s*(?=[A-Za-z])", "", candidate)
    candidate = candidate.strip(" .:-")
    if len(candidate) < 3 or not re.search(r"[A-Za-z]", candidate):
        candidate = re.sub(r"\s+", " ", clean_text(fallback)).strip(" .:-")
    return candidate


def table_columns(
    table: list[list[Any]],
    continuation_allowed: bool,
) -> tuple[int, int, int, int, int, int, int] | None:
    for row_index, row in enumerate(table[:3]):
        cells = [clean_text(cell).lower() for cell in row]
        topic_index = next((
            i for i, cell in enumerate(cells)
            if re.search(r"topics?\s+and\s+sub(?:-|\s)?topics?", cell)
        ), -1)
        outcome_index = next((i for i, cell in enumerate(cells) if "unit outcome" in cell or "learning outcome" in cell), -1)
        unit_index = next((
            i for i, cell in enumerate(cells)
            if ("unit" in cell and "no" in cell) or re.search(r"\bsr\.?\s*no\.?\b", cell)
        ), -1)
        if topic_index >= 0 and outcome_index >= 0 and unit_index >= 0 and len({unit_index, topic_index, outcome_index}) == 3:
            remaining = [i for i in range(len(cells)) if i not in {unit_index, topic_index, outcome_index}]
            hours_index = next((i for i in remaining if "hrs" in cells[i] or cells[i] == "cl"), -1)
            marks_index = next((i for i in remaining if "fa-th" in cells[i] or "max" in cells[i]), -1)
            mapped_index = next((i for i in remaining if "mapped" in cells[i]), -1)
            return row_index, unit_index, topic_index, outcome_index, hours_index, marks_index, mapped_index
    # PDF table extraction often omits the repeated header on continuation
    # pages. Course-content tables still have six stable columns and TLO/UO
    # text in the third column, so recover those rows without treating the
    # later five-column practical tables as curriculum content.
    if table and all(len(row) in {4, 5, 6, 7} for row in table[: min(3, len(table))]):
        sample = table[: min(3, len(table))]
        looks_like_content = any(
            re.search(r"\b(?:TLO|UO|LO)\s*\d", clean_text(row[2]), re.I)
            for row in sample
        ) or (
            continuation_allowed
            and any(
                (
                    bool(re.search(r"\b[1-6]\.\d+", clean_text(row[1])))
                    and bool(re.search(r"\b[1-6]\.\d+", clean_text(row[2])))
                )
                or (
                    parse_unit_number(row[0]) is not None
                    and (
                        bool(re.search(r"\b[1-6]\.\d+", clean_text(row[1])))
                        or bool(re.search(r"\b[1-6](?:\.\s*|\s*)[a-z]\.", clean_text(row[2]), re.I))
                    )
                    and bool(clean_text(row[1]))
                    and bool(clean_text(row[2]))
                )
                for row in sample
            )
        )
        if looks_like_content:
            width = len(sample[0])
            return (
                -1,
                0,
                1,
                2,
                3 if width >= 5 else -1,
                4 if width >= 6 else -1,
                5 if width >= 6 else (3 if width == 4 else -1),
            )
    return None


def extract_units(pdf: pdfplumber.PDF, pages: list[int]) -> dict[int, ExtractedUnit]:
    units: dict[int, ExtractedUnit] = {}
    current: ExtractedUnit | None = None

    for page_number in sorted(set(pages)):
        if page_number < 1 or page_number > len(pdf.pages):
            continue
        page = pdf.pages[page_number - 1]
        for raw_table in page.extract_tables() or []:
            table = compact_empty_columns(raw_table)
            columns = table_columns(table, continuation_allowed=current is not None)
            if columns is None:
                continue
            header_row, unit_index, topic_index, outcome_index, hours_index, marks_index, mapped_index = columns
            for row in table[header_row + 1:]:
                if len(row) <= max(unit_index, topic_index, outcome_index):
                    continue
                unit_number = parse_unit_number(row[unit_index]) or parse_unit_number(row[topic_index])
                if unit_number is not None:
                    current = units.setdefault(unit_number, ExtractedUnit(order=unit_number))
                    current.title_hint = (
                        current.title_hint
                        or parse_unit_title_hint(row[unit_index])
                        or parse_unit_title_hint(row[topic_index])
                    )
                if current is None:
                    continue
                topic = clean_text(row[topic_index])
                outcome = clean_text(row[outcome_index])
                if topic:
                    current.topic_parts.append(topic)
                if outcome:
                    current.outcome_parts.append(outcome)
                if hours_index >= 0 and hours_index < len(row) and clean_text(row[hours_index]):
                    current.teaching_hours = clean_text(row[hours_index])
                if marks_index >= 0 and marks_index < len(row) and clean_text(row[marks_index]):
                    current.theory_marks = clean_text(row[marks_index])
                if mapped_index >= 0 and mapped_index < len(row) and clean_text(row[mapped_index]):
                    current.mapped_outcome = clean_text(row[mapped_index])
                current.source_pages.add(page_number)

    return units


def extract_practical_units(pdf: pdfplumber.PDF, pages: list[int]) -> dict[int, ExtractedUnit]:
    units: dict[int, ExtractedUnit] = {}
    current: ExtractedUnit | None = None
    for page_number in sorted(set(pages)):
        if page_number < 1 or page_number > len(pdf.pages):
            continue
        for table in pdf.pages[page_number - 1].extract_tables() or []:
            header_index = -1
            for index, row in enumerate(table[:2]):
                cells = [clean_text(cell).lower() for cell in row]
                if len(cells) >= 5 and any("practical" in cell and "title" in cell for cell in cells):
                    header_index = index
                    break
            is_continuation = (
                header_index < 0
                and current is not None
                and bool(table)
                and all(len(row) == 5 for row in table[: min(2, len(table))])
            )
            if header_index < 0 and not is_continuation:
                continue
            for row in table[header_index + 1:]:
                if len(row) < 5:
                    continue
                unit_number = parse_unit_number(row[0])
                if unit_number is not None:
                    current = units.setdefault(unit_number, ExtractedUnit(order=unit_number))
                if current is None:
                    continue
                title = clean_text(row[1])
                outcome = clean_text(row[2])
                if title:
                    current.topic_parts.append(title)
                if outcome:
                    current.outcome_parts.append(outcome)
                current.teaching_hours = clean_text(row[3]) or current.teaching_hours
                current.mapped_outcome = clean_text(row[4]) or current.mapped_outcome
                current.source_pages.add(page_number)
    return units


def source_pages_for_subject(subject: dict[str, Any]) -> list[int]:
    pages: set[int] = set()
    for unit in subject.get("units", []):
        for source in unit.get("sourceReferences", []):
            pages.update(int(page) for page in source.get("pages", []) if isinstance(page, int))
    return sorted(pages)


def manifest_files() -> list[Path]:
    return sorted(CURRICULUM_ROOT.glob("*/semester-*.json"))


def ensure_official_pdfs() -> None:
    for department, path in PDF_BY_DEPARTMENT.items():
        if path.exists():
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(
            SOURCE_URL_BY_DEPARTMENT[department],
            headers={"User-Agent": "LernioCurriculumResearch/1.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response, path.open("wb") as output:
            output.write(response.read())


def main() -> None:
    ensure_official_pdfs()
    missing_pdfs = [str(path) for path in PDF_BY_DEPARTMENT.values() if not path.exists()]
    if missing_pdfs:
        raise SystemExit(f"Missing official curriculum PDF(s): {', '.join(missing_pdfs)}")

    open_pdfs = {department: pdfplumber.open(path) for department, path in PDF_BY_DEPARTMENT.items()}
    subjects: list[dict[str, Any]] = []
    try:
        for manifest_path in manifest_files():
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            department = manifest["departmentCode"]
            pdf = open_pdfs[department]
            for subject in manifest.get("subjects", []):
                expected_units = subject.get("units", [])
                pages = source_pages_for_subject(subject)
                extracted = extract_units(pdf, pages)
                practical = extract_practical_units(pdf, pages)
                units: list[dict[str, Any]] = []
                for unit in expected_units:
                    order = int(unit["order"])
                    evidence = extracted.get(order) or practical.get(order)
                    topic_text = clean_text("\n".join(evidence.topic_parts)) if evidence else ""
                    outcome_text = clean_text("\n".join(evidence.outcome_parts)) if evidence else ""
                    derived_title = (
                        evidence.title_hint
                        if evidence and evidence.title_hint
                        else derive_unit_title(topic_text, unit["title"])
                    )
                    official_title = normalize_unit_title(derived_title, unit["title"])
                    units.append({
                        "order": order,
                        "title": official_title,
                        "manifestTitle": unit["title"],
                        "curriculumContent": topic_text,
                        "learningOutcomes": split_learning_outcomes(outcome_text),
                        "teachingHours": evidence.teaching_hours if evidence else None,
                        "theoryMarks": evidence.theory_marks if evidence else None,
                        "mappedCourseOutcome": evidence.mapped_outcome if evidence else None,
                        "sourcePages": sorted(evidence.source_pages) if evidence else pages,
                        "extractionStatus": "content_extracted" if topic_text else "content_not_extracted",
                    })
                subjects.append({
                    "programmeCode": manifest["programmeCode"],
                    "semesterNumber": manifest["semesterNumber"],
                    "departmentCode": department,
                    "subjectCode": subject["officialSubjectCode"],
                    "subjectName": subject["name"],
                    "credits": subject.get("credits", 0),
                    "courseOutcomes": subject.get("outcomes", []),
                    "sourceUrl": SOURCE_URL_BY_DEPARTMENT[department],
                    "sourcePages": pages,
                    "units": units,
                })
    finally:
        for pdf in open_pdfs.values():
            pdf.close()

    total_units = sum(len(subject["units"]) for subject in subjects)
    extracted_units = sum(
        1 for subject in subjects for unit in subject["units"]
        if unit["extractionStatus"] == "content_extracted"
    )
    payload = {
        "manifestVersion": 1,
        "status": "official_pdf_extraction",
        "generatedAt": "2026-08-01",
        "sourcePolicy": "Only official CWIT R23 curriculum PDFs are used in this file.",
        "coverage": {
            "subjects": len(subjects),
            "units": total_units,
            "unitsWithExtractedContent": extracted_units,
            "unitsNeedingReview": total_units - extracted_units,
        },
        "subjects": subjects,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload["coverage"], indent=2))
    print(f"wrote {OUTPUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
