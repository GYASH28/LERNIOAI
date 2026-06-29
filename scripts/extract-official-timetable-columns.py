from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path.cwd()
PDF_PATH = ROOT / "content-import" / "official" / "Winter-Examination-2025.pdf"
OUTPUT_PATH = ROOT / "tmp" / "pdfs" / "official" / "Winter-Examination-2025.columns.json"

COLUMNS = [
    {
        "label": "morning_dcp",
        "departmentCode": "COMP",
        "programmeCode": "DCOMP",
        "session": "morning",
        "page": 1,
        "bbox": [190, 90, 230, 705],
    },
    {
        "label": "morning_dcp_iot",
        "departmentCode": "CIOT",
        "programmeCode": "DCIOT",
        "session": "morning",
        "page": 1,
        "bbox": [229, 90, 269, 705],
    },
    {
        "label": "afternoon_dcp",
        "departmentCode": "COMP",
        "programmeCode": "DCOMP",
        "session": "afternoon",
        "page": 1,
        "bbox": [422, 90, 462, 705],
    },
    {
        "label": "afternoon_dcp_iot",
        "departmentCode": "CIOT",
        "programmeCode": "DCIOT",
        "session": "afternoon",
        "page": 1,
        "bbox": [461, 90, 501, 705],
    },
]


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(PDF_PATH) as pdf:
        page = pdf.pages[0]
        columns = []
        for column in COLUMNS:
            crop = page.crop(tuple(column["bbox"]))
            columns.append({
                **column,
                "text": crop.extract_text(x_tolerance=1, y_tolerance=2) or "",
            })

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sourcePdf": "content-import/official/Winter-Examination-2025.pdf",
        "extractionMethod": "pdfplumber_fixed_column_crops",
        "safetyNote": "Column crops recover exact timetable code appearances for review only; they do not establish semester placement.",
        "columns": columns,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT_PATH.relative_to(ROOT)} columns={len(columns)}")


if __name__ == "__main__":
    main()
