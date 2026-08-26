from pathlib import Path
from io import BytesIO

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether


ROOT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final")
SOURCE = Path(r"C:\Users\poran\Downloads\GreenOps.pdf")
OUTPUT = ROOT / "output" / "pdf" / "GreenOps-updated-2026-08-24.pdf"


def build_update_page():
    stream = BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=17 * mm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "UpdateTitle", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=24, leading=29, textColor=HexColor("#163C33"), spaceAfter=4,
    )
    subtitle = ParagraphStyle(
        "UpdateSubtitle", parent=styles["Normal"], fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=HexColor("#5B6E68"), spaceAfter=16,
    )
    heading = ParagraphStyle(
        "UpdateHeading", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=13, leading=17, textColor=HexColor("#176D4A"), spaceBefore=7, spaceAfter=7,
    )
    body = ParagraphStyle(
        "UpdateBody", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=10.4, leading=15, textColor=HexColor("#273B35"), spaceAfter=0,
    )

    story = []
    header = Table([[Paragraph("GREENOPS", ParagraphStyle("Brand", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, textColor=white)),
                     Paragraph("WORK UPDATE - 24 AUGUST 2026", ParagraphStyle("Date", parent=styles["Normal"], alignment=2, fontName="Helvetica-Bold", fontSize=9.5, textColor=white))]], colWidths=[90 * mm, 84 * mm])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#176D4A")),
        ("BOX", (0, 0), (-1, -1), 0, HexColor("#176D4A")),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.extend([header, Spacer(1, 14 * mm), Paragraph("Latest GreenOps Updates", title), Paragraph("Date: 24 August 2026", subtitle)])

    updates = [
        ("Schedule and crew progress", "Improved schedule handling for multiple crew members on the same job. Each crew assignment now keeps its own status and progress information, while the job status remains Scheduled until every assigned crew member completes it."),
        ("Calendar and schedule details", "Refined calendar, schedule-detail, and all-scheduled-jobs flows. The calendar remains the default Schedule view, while the complete schedule table is available from View All. Added search support and tightened rescheduling rules so only scheduled jobs can be rescheduled."),
        ("Customer and crew experience", "Enhanced customer and crew profile contact areas with compact Call and Text Message icons beside phone numbers. Continued improvements to customer record sharing, profile navigation, and clearer shared-record screens."),
        ("Jobs, invoices, and reporting", "Continued updates to job and invoice summaries, customer-facing documents, one-page PDF layout, branding, and report calculations. Schedule, job, invoice, and estimate UI components were refined for clearer day-to-day use."),
    ]
    rows = []
    for heading_text, body_text in updates:
        rows.append([Paragraph(heading_text, heading), Paragraph(body_text, body)])
    table = Table(rows, colWidths=[47 * mm, 127 * mm], repeatRows=0)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, -1), HexColor("#EAF7F0")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, HexColor("#D9E9E0")),
        ("BOX", (0, 0), (-1, -1), 0.6, HexColor("#C7E4D4")),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(table)
    story.append(Spacer(1, 12 * mm))
    note = Table([[Paragraph("This update records the latest functional and user-interface improvements made to the GreenOps web application.", body)]], colWidths=[174 * mm])
    note.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F6FAF8")),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#D9E9E0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(note)
    doc.build(story)
    return stream.getvalue()


reader = PdfReader(str(SOURCE))
update_reader = PdfReader(BytesIO(build_update_page()))
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)
for page in update_reader.pages:
    writer.add_page(page)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with OUTPUT.open("wb") as output_stream:
    writer.write(output_stream)
print(OUTPUT)
print(f"pages={len(writer.pages)}")
