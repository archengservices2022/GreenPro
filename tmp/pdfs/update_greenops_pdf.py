from pathlib import Path
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final")
SOURCE = Path(r"C:\Users\poran\Downloads\Greenops.pdf")
OUTPUT = ROOT / "output" / "pdf" / "Greenops-updated-2026-08-14.pdf"
SUPPLEMENT = ROOT / "tmp" / "pdfs" / "greenops-update-pages.pdf"
IMAGES = [
    ("Schedule overview", Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-f57170d6-af75-4c9b-9674-c5baf200f93a.png")),
    ("Company settings", Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-e13b9342-3681-4207-bf23-5f6f784b45cf.png")),
    ("Customer self-service profile", Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-0ce97dfa-97af-4935-98bc-e19f0bd592e7.png")),
]

GREEN = HexColor("#078247")
INK = HexColor("#102d22")
MUTED = HexColor("#5e766a")
SOFT = HexColor("#eef8f2")
LINE = HexColor("#d6e8dd")

def header(c, title, subtitle, page_number):
    width, height = landscape(A4)
    c.setFillColor(SOFT)
    c.rect(0, height - 68, width, 68, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.roundRect(34, height - 52, 28, 28, 8, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(48, height - 43, "G")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(75, height - 38, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(75, height - 52, subtitle)
    c.setStrokeColor(LINE)
    c.line(34, 30, width - 34, 30)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(34, 17, "GreenOps - Progress Update")
    c.drawRightString(width - 34, 17, f"Page {page_number}")

def draw_image_page(c, title, path, page_number):
    width, height = landscape(A4)
    header(c, title, "GreenOps visual update - 14 August 2026", page_number)
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    max_w, max_h = width - 68, height - 128
    scale = min(max_w / iw, max_h / ih)
    w, h = iw * scale, ih * scale
    x, y = (width - w) / 2, 50 + (max_h - h) / 2
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(x - 5, y - 5, w + 10, h + 10, 8, fill=1, stroke=1)
    c.drawImage(image, x, y, width=w, height=h, preserveAspectRatio=True, mask='auto')
    c.showPage()

def build_supplement():
    c = canvas.Canvas(str(SUPPLEMENT), pagesize=landscape(A4))
    width, height = landscape(A4)
    header(c, "GreenOps Update", "Work completed on 14 August 2026", 1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 25)
    c.drawString(46, height - 122, "Today's completed work")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(46, height - 144, "Customer access, sending options, scheduling, and job views were improved.")
    items = [
        ("Customer self-service", "Added a clear My Profile layout with edit and delete controls, plus an optional password change with confirmation and show/hide icons."),
        ("Record delivery choices", "Sending an estimate, job, or invoice now offers Email customer, Customer account, or both. Customer-account sharing adds a portal notification."),
        ("Job and schedule experience", "Removed the Crew column from the Jobs table and Assigned Crew from Job Details. Schedule status cards and calendar presentation were refined."),
        ("Company setup", "Company Settings keeps the company identity, sender email, schedule defaults, and logo controls organized in one place."),
    ]
    y = height - 195
    for index, (heading, body) in enumerate(items, start=1):
        c.setFillColor(SOFT)
        c.roundRect(46, y - 57, width - 92, 62, 10, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.circle(66, y - 25, 12, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(66, y - 29, str(index))
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(90, y - 18, heading)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9.5)
        text = c.beginText(90, y - 34)
        text.setLeading(13)
        words = body.split()
        line = ""
        for word in words:
            proposed = f"{line} {word}".strip()
            if c.stringWidth(proposed, "Helvetica", 9.5) > width - 155:
                text.textLine(line)
                line = word
            else:
                line = proposed
        if line:
            text.textLine(line)
        c.drawText(text)
        y -= 82
    c.showPage()
    for number, (title, path) in enumerate(IMAGES, start=2):
        draw_image_page(c, title, path, number)
    c.save()

def merge():
    writer = PdfWriter()
    for reader in (PdfReader(str(SOURCE)), PdfReader(str(SUPPLEMENT))):
        for page in reader.pages:
            writer.add_page(page)
    with open(OUTPUT, "wb") as stream:
        writer.write(stream)

build_supplement()
merge()
print(OUTPUT)
