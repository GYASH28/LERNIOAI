#!/usr/bin/env python3
"""
Generate detailed study notes PDFs for every subject.
Reads JSON notes from content/lesson-notes/ and generates rich PDFs
with charts, tables, diagrams, code examples, and quizzes.

Output: /home/z/my-project/download/lernio-notes/<subject>.pdf
"""
import os, sys, json, glob, hashlib

PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Image, Preformatted, HRFlowable, CondPageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents

import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['Noto Sans SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ── Fonts ────────────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif',            f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold',       f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic',     f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans',           f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold',      f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
registerFontFamily('FreeSerif',  normal='FreeSerif',  bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

try:
    from pdf import install_font_fallback
    install_font_fallback()
except Exception:
    pass

# ── Palette ──────────────────────────────────────────────────────────────────
HEADER_FILL  = colors.HexColor('#425f6d')
ACCENT       = colors.HexColor('#357fa4')
ACCENT_2     = colors.HexColor('#b96042')
TEXT_PRIMARY = colors.HexColor('#232526')
TEXT_MUTED   = colors.HexColor('#838a8d')
CARD_BG      = colors.HexColor('#f5f6f7')
TABLE_STRIPE = colors.HexColor('#edeff0')
BORDER       = colors.HexColor('#acbac1')

# ── Styles ───────────────────────────────────────────────────────────────────
S = {
    'h1': ParagraphStyle('h1', fontName='FreeSerif-Bold', fontSize=22, leading=28,
                         textColor=HEADER_FILL, spaceBefore=20, spaceAfter=12, alignment=TA_LEFT),
    'h2': ParagraphStyle('h2', fontName='FreeSerif-Bold', fontSize=16, leading=22,
                         textColor=HEADER_FILL, spaceBefore=16, spaceAfter=8, alignment=TA_LEFT),
    'h3': ParagraphStyle('h3', fontName='FreeSerif-Bold', fontSize=13, leading=18,
                         textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6, alignment=TA_LEFT),
    'h4': ParagraphStyle('h4', fontName='FreeSerif-Bold', fontSize=11, leading=15,
                         textColor=ACCENT, spaceBefore=10, spaceAfter=4, alignment=TA_LEFT),
    'body': ParagraphStyle('body', fontName='FreeSerif', fontSize=10.5, leading=16,
                           textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8),
    'muted': ParagraphStyle('muted', fontName='FreeSerif-Italic', fontSize=9, leading=13,
                            textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=4),
    'code': ParagraphStyle('code', fontName='DejaVuSans', fontSize=8, leading=11,
                           textColor=TEXT_PRIMARY, alignment=TA_LEFT,
                           leftIndent=10, rightIndent=10, spaceBefore=2, spaceAfter=2,
                           backColor=colors.HexColor('#1e1e2e'), borderPadding=8),
    'code_light': ParagraphStyle('code_light', fontName='DejaVuSans', fontSize=8.5, leading=12,
                                 textColor=colors.HexColor('#e0e0e0'), alignment=TA_LEFT,
                                 leftIndent=10, rightIndent=10, spaceBefore=2, spaceAfter=2),
    'table_h': ParagraphStyle('table_h', fontName='FreeSerif-Bold', fontSize=9, leading=12,
                              textColor=colors.white, alignment=TA_LEFT),
    'table_c': ParagraphStyle('table_c', fontName='DejaVuSans', fontSize=8.5, leading=11,
                              textColor=TEXT_PRIMARY, alignment=TA_LEFT),
    'cover_title': ParagraphStyle('cover_title', fontName='FreeSerif-Bold', fontSize=36, leading=42,
                                  textColor=HEADER_FILL, alignment=TA_LEFT, spaceAfter=8),
    'cover_sub': ParagraphStyle('cover_sub', fontName='FreeSerif', fontSize=14, leading=20,
                                textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=6),
    'toc_l0': ParagraphStyle('toc_l0', fontName='FreeSerif-Bold', fontSize=11, leading=18,
                             textColor=TEXT_PRIMARY, leftIndent=0),
    'toc_l1': ParagraphStyle('toc_l1', fontName='FreeSerif', fontSize=10, leading=15,
                             textColor=TEXT_MUTED, leftIndent=20),
    'toc_title': ParagraphStyle('toc_title', fontName='FreeSerif-Bold', fontSize=22, leading=28,
                                textColor=HEADER_FILL, spaceAfter=18),
}

PAGE_W, PAGE_H = A4
LEFT_M = RIGHT_M = 0.85 * inch
TOP_M = BOTTOM_M = 0.85 * inch
AVAIL_W = PAGE_W - LEFT_M - RIGHT_M

OUTPUT_DIR = '/home/z/my-project/download/lernio-notes'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Chart generators ─────────────────────────────────────────────────────────

def chart_complexity_comparison():
    """Bar chart comparing time complexities."""
    fig, ax = plt.subplots(figsize=(7, 3.5), constrained_layout=True)
    labels = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)']
    values = [1, 7, 100, 664, 10000, 2**20]
    colors_list = ['#457957', '#436d97', '#357fa4', '#ac8a47', '#b96042', '#7a1f1a']
    bars = ax.barh(labels, values, color=colors_list, edgecolor='white', linewidth=0.5)
    ax.set_xscale('log')
    ax.set_xlabel('Operations (log scale) — n=100', fontsize=9)
    ax.set_title('Time Complexity Comparison', fontsize=11, fontweight='bold')
    ax.tick_params(axis='both', labelsize=8)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    path = '/tmp/chart_complexity.png'
    fig.savefig(path, dpi=200, facecolor='white')
    plt.close(fig)
    return path

def chart_sorting_comparison():
    """Bar chart comparing sorting algorithm times."""
    fig, ax = plt.subplots(figsize=(7, 3), constrained_layout=True)
    labels = ['Bubble', 'Selection', 'Insertion', 'Merge', 'Quick']
    best = [1, 100, 1, 100, 100]  # O(n)=1 (scaled), O(n²)=100, O(n log n)=100
    avg = [100, 100, 100, 100, 100]
    worst = [100, 100, 100, 100, 10000]
    x = range(len(labels))
    width = 0.25
    ax.bar([i - width for i in x], best, width, label='Best', color='#457957')
    ax.bar(list(x), avg, width, label='Average', color='#357fa4')
    ax.bar([i + width for i in x], worst, width, label='Worst', color='#b96042')
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylabel('Relative operations (n=100)', fontsize=9)
    ax.set_title('Sorting Algorithm Performance Comparison', fontsize=11, fontweight='bold')
    ax.legend(fontsize=8, loc='upper left')
    ax.set_yscale('log')
    ax.tick_params(axis='both', labelsize=8)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    path = '/tmp/chart_sorting.png'
    fig.savefig(path, dpi=200, facecolor='white')
    plt.close(fig)
    return path

def chart_array_vs_linkedlist():
    """Radar chart comparing Array vs Linked List."""
    import numpy as np
    categories = ['Access', 'Search', 'Insert\n(begin)', 'Delete\n(begin)', 'Memory\nefficiency', 'Cache\nfriendliness']
    array_scores = [5, 3, 1, 1, 4, 5]
    linked_scores = [1, 3, 5, 5, 3, 1]
    angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
    array_scores += array_scores[:1]
    linked_scores += linked_scores[:1]
    angles += angles[:1]
    fig, ax = plt.subplots(figsize=(5, 4), subplot_kw=dict(polar=True), constrained_layout=True)
    ax.fill(angles, array_scores, alpha=0.25, color='#357fa4', label='Array')
    ax.plot(angles, array_scores, color='#357fa4', linewidth=2)
    ax.fill(angles, linked_scores, alpha=0.25, color='#b96042', label='Linked List')
    ax.plot(angles, linked_scores, color='#b96042', linewidth=2)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=8)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_yticklabels(['1', '2', '3', '4', '5'], fontsize=7)
    ax.set_title('Array vs Linked List', fontsize=11, fontweight='bold', pad=15)
    ax.legend(fontsize=8, loc='upper right', bbox_to_anchor=(1.3, 1.1))
    path = '/tmp/chart_array_vs_ll.png'
    fig.savefig(path, dpi=200, facecolor='white')
    plt.close(fig)
    return path

def chart_bst_height():
    """Chart showing BST height vs operations."""
    import numpy as np
    n = np.arange(1, 101)
    balanced = np.log2(n)
    unbalanced = n
    fig, ax = plt.subplots(figsize=(7, 3), constrained_layout=True)
    ax.plot(n, balanced, color='#457957', linewidth=2, label='Balanced BST: O(log n)')
    ax.plot(n, unbalanced, color='#b96042', linewidth=2, label='Unbalanced BST: O(n)')
    ax.fill_between(n, balanced, unbalanced, alpha=0.1, color='#838a8d')
    ax.set_xlabel('Number of nodes (n)', fontsize=9)
    ax.set_ylabel('Height (operations)', fontsize=9)
    ax.set_title('BST Height: Balanced vs Unbalanced', fontsize=11, fontweight='bold')
    ax.legend(fontsize=8)
    ax.set_xlim(1, 100)
    ax.set_ylim(0, 50)
    ax.tick_params(axis='both', labelsize=8)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(True, alpha=0.2)
    path = '/tmp/chart_bst.png'
    fig.savefig(path, dpi=200, facecolor='white')
    plt.close(fig)
    return path

CHARTS = {}

def get_chart(name):
    if name not in CHARTS:
        if name == 'complexity':
            CHARTS[name] = chart_complexity_comparison()
        elif name == 'sorting':
            CHARTS[name] = chart_sorting_comparison()
        elif name == 'array_vs_ll':
            CHARTS[name] = chart_array_vs_linkedlist()
        elif name == 'bst':
            CHARTS[name] = chart_bst_height()
    return CHARTS[name]

# ── PDF Builder ──────────────────────────────────────────────────────────────

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def footer(canv, doc):
    canv.saveState()
    canv.setFont('FreeSerif', 8)
    canv.setFillColor(TEXT_MUTED)
    canv.drawRightString(PAGE_W - 0.75*inch, 0.5*inch, f'Page {doc.page}')
    canv.drawString(0.75*inch, 0.5*inch, 'Lernio AI · Study Notes')
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.4)
    canv.line(0.75*inch, 0.65*inch, PAGE_W - 0.75*inch, 0.65*inch)
    canv.restoreState()

def std_table(data, col_ratios=None):
    if col_ratios:
        col_widths = [r * AVAIL_W for r in col_ratios]
    else:
        col_widths = None
    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style = [
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0,i), (-1,i), TABLE_STRIPE))
    t.setStyle(TableStyle(style))
    return t

def code_block(code_text, title=None):
    elements = []
    if title:
        elements.append(Paragraph(f'<b>{title}</b>', S['h4']))
    escaped = code_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    escaped = escaped.replace('\n', '<br/>')
    elements.append(Paragraph(escaped, S['code_light']))
    return elements

def info_box(title, items, color=ACCENT, icon='→'):
    """Colored info box with a title and bullet items."""
    elements = []
    bg = colors.HexColor('#f0f5f8')
    border = color
    title_style = ParagraphStyle('ib_title', fontName='FreeSerif-Bold', fontSize=10,
                                 leading=14, textColor=color, alignment=TA_LEFT)
    item_style = ParagraphStyle('ib_item', fontName='FreeSerif', fontSize=9.5,
                                leading=14, textColor=TEXT_PRIMARY, alignment=TA_LEFT)
    rows = [[Paragraph(f'<b>{title}</b>', title_style)]]
    for item in items:
        rows.append([Paragraph(f'{icon} {item}', item_style)])
    t = Table(rows, colWidths=[AVAIL_W - 10], hAlign='CENTER')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBEFORE', (0,0), (0,-1), 3, border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(t)
    return elements

def embed_chart(path, max_width=AVAIL_W, max_height=300):
    from PIL import Image as PILImage
    pil = PILImage.open(path)
    w, h = pil.size
    ratio = min(max_width / w, max_height / h)
    return Image(path, width=w * ratio, height=h * ratio)

# ── Subject chart mapping ────────────────────────────────────────────────────

def get_charts_for_subject(subject_code):
    """Return list of (chart_name, chart_path, caption) for a subject."""
    chart_map = {
        'R23CP2402': [
            ('complexity', 'Time Complexity Comparison — Big-O Notation'),
            ('array_vs_ll', 'Array vs Linked List Performance Comparison'),
            ('sorting', 'Sorting Algorithm Performance at n=100'),
            ('bst', 'BST Height: Balanced O(log n) vs Unbalanced O(n)'),
        ],
        'R23CP6404': [
            ('complexity', 'OOP Operation Complexity Comparison'),
        ],
        'R23CP1401': [
            ('complexity', 'C Program Operation Complexity'),
        ],
    }
    result = []
    for name, caption in chart_map.get(subject_code, []):
        path = get_chart(name)
        result.append((path, caption))
    return result

# ── Main PDF generator ───────────────────────────────────────────────────────

def generate_subject_pdf(notes_data):
    subject_code = notes_data['subjectCode']
    subject_name = notes_data['subjectName']
    semester = notes_data['semester']
    credits = notes_data['credits']

    output_path = os.path.join(OUTPUT_DIR, f'{subject_code}-{subject_name.lower().replace(" ", "-")}.pdf')

    doc = TocDocTemplate(
        output_path, pagesize=A4,
        leftMargin=LEFT_M, rightMargin=RIGHT_M,
        topMargin=TOP_M, bottomMargin=BOTTOM_M,
        title=f'{subject_name} — Study Notes',
        author='Lernio AI',
        creator='Lernio AI',
        subject=f'CWIT R23 Semester {semester} · {credits} credits',
    )

    story = []

    # ─── Cover ───
    story.append(Spacer(1, 80))
    story.append(Paragraph(f'{subject_name}', S['cover_title']))
    story.append(Paragraph(f'Subject Code: {subject_code}', S['cover_sub']))
    story.append(Paragraph(f'Semester {semester} · {credits} Credits · CWIT R23', S['cover_sub']))
    story.append(Paragraph(f'{len(notes_data["units"])} Units · {sum(len(u["lessons"]) for u in notes_data["units"])} Lessons', S['cover_sub']))
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="60%", color=ACCENT, thickness=2, spaceAfter=20))
    story.append(Paragraph('Comprehensive Study Notes with Charts, Diagrams, Code Examples & Practice Quizzes', S['cover_sub']))
    story.append(Spacer(1, 100))
    story.append(Paragraph('Lernio AI · Learning OS 2.0', S['muted']))
    story.append(PageBreak())

    # ─── TOC ───
    story.append(Paragraph('Table of Contents', S['toc_title']))
    toc = TableOfContents()
    toc.levelStyles = [S['toc_l0'], S['toc_l1']]
    story.append(toc)
    story.append(PageBreak())

    # ─── Charts section ───
    charts = get_charts_for_subject(subject_code)
    if charts:
        story.append(add_heading('Visual Overview', S['h1'], level=0))
        story.append(Paragraph('Key performance charts comparing the data structures and algorithms covered in this subject.', S['body']))
        for chart_path, caption in charts:
            story.append(Spacer(1, 10))
            story.append(embed_chart(chart_path))
            story.append(Spacer(1, 4))
            story.append(Paragraph(f'<i>{caption}</i>', S['muted']))
            story.append(Spacer(1, 10))
        story.append(PageBreak())

    # ─── Units and Lessons ───
    for unit in notes_data['units']:
        story.append(add_heading(f'Unit {unit["number"]}: {unit["title"]}', S['h1'], level=0))
        story.append(Paragraph(f'Weightage: {unit["weightage"]}% · {len(unit["lessons"])} lessons', S['muted']))
        story.append(Spacer(1, 8))

        for lesson in unit['lessons']:
            story.append(add_heading(lesson['title'], S['h2'], level=1))
            story.append(Paragraph(f'Duration: {lesson["durationMin"]} min · Difficulty: {lesson["difficulty"]}', S['muted']))

            # Overview
            story.append(Paragraph('<b>Overview</b>', S['h4']))
            story.append(Paragraph(lesson['overview'], S['body']))

            # Key Concepts
            if lesson.get('keyConcepts'):
                story.extend(info_box('Key Concepts', lesson['keyConcepts'], color=ACCENT, icon='•'))

            # Formulas
            if lesson.get('formulas'):
                story.append(Spacer(1, 6))
                story.extend(info_box('Formulas', lesson['formulas'], color=colors.HexColor('#457957'), icon='∑'))

            # Tables
            for table_data in lesson.get('tables', []):
                story.append(Spacer(1, 8))
                story.append(Paragraph(f'<b>{table_data["title"]}</b>', S['h4']))
                header_row = [Paragraph(f'<b>{h}</b>', S['table_h']) for h in table_data['headers']]
                data_rows = [[Paragraph(str(cell), S['table_c']) for cell in row] for row in table_data['rows']]
                full_data = [header_row] + data_rows
                story.append(std_table(full_data))
                if table_data.get('note'):
                    story.append(Paragraph(f'<i>{table_data["note"]}</i>', S['muted']))

            # Diagrams
            for diagram in lesson.get('diagrams', []):
                story.append(Spacer(1, 6))
                story.append(Paragraph(f'<b>{diagram["title"]}</b>', S['h4']))
                escaped = diagram['content'].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Preformatted(escaped, S['code']))

            # Code Examples
            for example in lesson.get('codeExamples', []):
                story.append(Spacer(1, 8))
                story.append(Paragraph(f'<b>{example["title"]}</b>', S['h4']))
                story.extend(code_block(example['code']))
                story.append(Paragraph(f'<i>{example["explanation"]}</i>', S['muted']))

            # Common Mistakes
            if lesson.get('commonMistakes'):
                story.append(Spacer(1, 8))
                story.extend(info_box('Common Mistakes to Avoid', lesson['commonMistakes'],
                                      color=colors.HexColor('#a84d45'), icon='✗'))

            # Exam Tips
            if lesson.get('examTips'):
                story.append(Spacer(1, 6))
                story.extend(info_box('Exam Tips', lesson['examTips'],
                                      color=colors.HexColor('#436d97'), icon='→'))

            # Practice Questions
            if lesson.get('practiceQuestions'):
                story.append(Spacer(1, 10))
                story.append(Paragraph('<b>Practice Questions</b>', S['h4']))
                for i, q in enumerate(lesson['practiceQuestions'], 1):
                    story.append(Paragraph(f'<b>Q{i}.</b> {q["question"]}', S['body']))
                    for j, opt in enumerate(q['options']):
                        letter = chr(65 + j)
                        is_answer = (j == q['answer'])
                        prefix = f'<b>{letter}.</b>'
                        if is_answer:
                            prefix = f'<b><font color="green">{letter}.</font></b>'
                        story.append(Paragraph(f'&nbsp;&nbsp;{prefix} {opt}', S['body']))
                    story.append(Paragraph(f'<i>Answer: {chr(65 + q["answer"])}. {q["explanation"]}</i>', S['muted']))

            story.append(Spacer(1, 12))

        story.append(PageBreak())

    # ─── Summary ───
    story.append(add_heading('Subject Summary', S['h1'], level=0))
    total_lessons = sum(len(u['lessons']) for u in notes_data['units'])
    total_questions = sum(len(l.get('practiceQuestions', [])) for u in notes_data['units'] for l in u['lessons'])
    story.append(Paragraph(f'This PDF contains {total_lessons} lessons across {len(notes_data["units"])} units with {total_questions} practice questions.', S['body']))
    story.append(Paragraph('Use these notes alongside the curated YouTube lectures on the Lernio platform. Watch the videos, read the notes, practise the quizzes, and use Ask LEO for any doubts.', S['body']))
    story.append(Spacer(1, 20))
    story.append(Paragraph('Lernio AI · Learning OS 2.0 · CWIT R23', S['muted']))

    doc.multiBuild(story, onFirstPage=footer, onLaterPages=footer)

    return output_path

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    notes_dir = '/home/z/my-project/repo/content/lesson-notes'
    files = sorted(glob.glob(os.path.join(notes_dir, '*.json')))
    print(f'Found {len(files)} subject notes files')

    generated = []
    for filepath in files:
        with open(filepath) as f:
            notes = json.load(f)
        print(f'  Generating: {notes["subjectCode"]} — {notes["subjectName"]}...', end=' ')
        try:
            pdf_path = generate_subject_pdf(notes)
            size = os.path.getsize(pdf_path) / 1024
            print(f'✓ ({size:.0f} KB)')
            generated.append(pdf_path)
        except Exception as e:
            print(f'✗ {e}')

    print(f'\nGenerated {len(generated)} PDFs in {OUTPUT_DIR}/')
    for p in generated:
        print(f'  {os.path.basename(p)}')

if __name__ == '__main__':
    main()
