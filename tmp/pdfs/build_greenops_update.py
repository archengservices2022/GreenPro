from pathlib import Path
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether
from reportlab.lib.enums import TA_CENTER
from pypdf import PdfReader, PdfWriter

ROOT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final")
SOURCE = Path(r"C:\Users\poran\Downloads\Greenops.pdf")
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SUPPLEMENT = ROOT / "tmp" / "pdfs" / "greenops_update_supplement.pdf"
OUTPUT = OUTPUT_DIR / "Greenops-updated-2026-08-12.pdf"

SCREENSHOTS = [
    (Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-c397f233-6d2c-457b-8237-5702ce8722cd.png"), "Invoice line items and billing breakdown"),
    (Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-ba7b4e6d-9a5c-4541-933e-f5e2e8d54770.png"), "Crew profile with interactive job summary cards"),
    (Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-2fcc95e6-ccdd-4113-b405-ecd652e06d10.png"), "Crew My Jobs table with assigned work"),
]

GREEN = HexColor("#0E8A4B")
DEEP = HexColor("#103B2A")
TEXT = HexColor("#213A30")
MUTED = HexColor("#5D7569")
PALE = HexColor("#EDF8F1")
LINE = HexColor("#CBE5D5")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="UpdateTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=31, textColor=DEEP, spaceAfter=7))
styles.add(ParagraphStyle(name="UpdateSub", parent=styles["Normal"], fontName="Helvetica", fontSize=10.5, leading=15, textColor=MUTED, spaceAfter=16))
styles.add(ParagraphStyle(name="UpdateHeading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=20, textColor=DEEP, spaceBefore=10, spaceAfter=8))
styles.add(ParagraphStyle(name="UpdateBody", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=TEXT, spaceAfter=5))
styles.add(ParagraphStyle(name="Caption", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=DEEP, alignment=TA_CENTER, spaceBefore=5, spaceAfter=10))
styles.add(ParagraphStyle(name="Small", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED))

def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 15*mm, width-18*mm, 15*mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 10*mm, "GreenOps Project Work Report - Update added 12 August 2026")
    canvas.drawRightString(width-18*mm, 10*mm, f"Page {doc.page + 26}")
    canvas.restoreState()

doc = SimpleDocTemplate(str(SUPPLEMENT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=22*mm)
story = []

story.append(Paragraph("GreenOps - Today’s Work Update", styles["UpdateTitle"]))
story.append(Paragraph("Date: 12 August 2026 | Updates completed for the GreenOps landscaping business management application.", styles["UpdateSub"]))

summary_data = [[Paragraph("<b>Area</b>", styles["UpdateBody"]), Paragraph("<b>Work completed today</b>", styles["UpdateBody"])]]
summary_rows = [
    ("Crew workspace", "Improved Crew profile and My Jobs experience. Job summary cards now work as filters, every assigned job is visible in a clean table, and clicking a job opens its own work-details screen instead of expanding below the table."),
    ("Crew job controls", "Crew screens keep financial information hidden. Crew members can view their scheduled work, upload photos, add notes, start and complete jobs, navigate to the address, and message management."),
    ("Notifications", "Scheduled job assignments and Crew updates are routed to the Crew member and management. Job notifications open the correct job details screen."),
    ("Account security", "Inactive Crew, Customer, and Administrator accounts are blocked from access. Existing sessions are revoked when an account is made inactive; Admin can reactivate accounts."),
    ("Customer portal", "Added a customer-specific, view-only portal. A customer sees only their own estimates, jobs, and invoices after the Admin sends those records."),
    ("Customer logins", "Creating a customer now creates a linked Customer account with email and password. The Edit Customer form supports creating a login for older customers and changing the linked customer password."),
    ("Invoice experience", "Improved invoice line-item presentation and billing totals, including job number, service, quantity, unit price, total amount, amount paid, and balance due."),
]
for area, work in summary_rows:
    summary_data.append([Paragraph(f"<b>{area}</b>", styles["UpdateBody"]), Paragraph(work, styles["UpdateBody"])])

table = Table(summary_data, colWidths=[43*mm, 131*mm], repeatRows=1)
table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GREEN),
    ("TEXTCOLOR", (0,0), (-1,0), white),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("GRID", (0,0), (-1,-1), 0.35, LINE),
    ("BACKGROUND", (0,1), (-1,-1), white),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, PALE]),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 7),
    ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story.append(table)
story.append(Spacer(1, 12))
story.append(Paragraph("Result", styles["UpdateHeading"]))
story.append(Paragraph("The application now provides clearer role-based access, safer inactive account handling, and simpler navigation for Crew and Customer users while preserving Admin control of shared customer information.", styles["UpdateBody"]))
story.append(PageBreak())

story.append(Paragraph("Screenshots - Invoice and Crew Profile", styles["UpdateTitle"]))
story.append(Paragraph("Visual evidence of the updated invoice workflow and interactive Crew workspace.", styles["UpdateSub"]))
for path, caption in SCREENSHOTS[:2]:
    if path.exists():
        image = Image(str(path))
        image._restrictSize(171*mm, 95*mm)
        story.append(KeepTogether([image, Paragraph(caption, styles["Caption"])]))
    else:
        story.append(Paragraph(f"Screenshot unavailable: {caption}", styles["UpdateBody"]))
story.append(PageBreak())

story.append(Paragraph("Screenshots - Crew My Jobs", styles["UpdateTitle"]))
story.append(Paragraph("The Crew job list shows all jobs assigned to the logged-in Crew member, with schedule, completion date, and work status. Selecting a row opens that job's details.", styles["UpdateSub"]))
path, caption = SCREENSHOTS[2]
if path.exists():
    image = Image(str(path))
    image._restrictSize(171*mm, 185*mm)
    story.append(image)
    story.append(Paragraph(caption, styles["Caption"]))
else:
    story.append(Paragraph(f"Screenshot unavailable: {caption}", styles["UpdateBody"]))

doc.build(story, onFirstPage=footer, onLaterPages=footer)

reader = PdfReader(str(SOURCE))
supplement = PdfReader(str(SUPPLEMENT))
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)
for page in supplement.pages:
    writer.add_page(page)
with OUTPUT.open("wb") as handle:
    writer.write(handle)
print(OUTPUT)
