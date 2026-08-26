from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

ROOT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final")
SOURCE = Path(r"C:\Users\poran\Downloads\Greenops.pdf")
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
APPENDIX = ROOT / "tmp" / "pdfs" / "daily_update_appendix.pdf"
OUTPUT = OUT_DIR / "Greenops-updated-13-August-2026.pdf"
IMAGES = [
    Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-7a50cd36-01c6-4328-bf52-66beab81671a.png"),
    Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-a950684c-b964-442c-bb3b-6c2ebc87398f.png"),
    Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-624a3af5-9964-41aa-81c0-70fb48358bab.png"),
]

PAGE_W, PAGE_H = landscape(A4)
GREEN = HexColor("#0c8b4c")
DARK = HexColor("#10271e")
MUTED = HexColor("#5a6f65")
PALE = HexColor("#edf8f1")
LINE = HexColor("#cfe5d8")

def header(c, title, subtitle, page_number):
    c.setFillColor(PALE)
    c.rect(0, PAGE_H - 72, PAGE_W, 72, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(42, PAGE_H - 42, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawRightString(PAGE_W - 42, PAGE_H - 39, subtitle)
    c.setStrokeColor(LINE)
    c.line(42, 34, PAGE_W - 42, 34)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(42, 19, "GreenOps Project Work Report - Daily update")
    c.drawRightString(PAGE_W - 42, 19, f"Appendix page {page_number}")

def wrap(c, text, x, y, width, font="Helvetica", size=11, leading=16, color=DARK):
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    line = ""
    lines = []
    for word in words:
        proposed = f"{line} {word}".strip()
        if stringWidth(proposed, font, size) <= width:
            line = proposed
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    for item in lines:
        c.drawString(x, y, item)
        y -= leading
    return y

def draw_image(c, path, label, page_number):
    header(c, "GreenOps - Customer portal update", "13 August 2026", page_number)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(42, PAGE_H - 102, label)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(42, PAGE_H - 120, "Screenshot captured after the customer sharing and role-based portal updates.")
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    max_w, max_h = PAGE_W - 84, PAGE_H - 190
    scale = min(max_w / iw, max_h / ih)
    w, h = iw * scale, ih * scale
    x, y = (PAGE_W - w) / 2, 52
    c.setFillColor(HexColor("#ffffff"))
    c.setStrokeColor(LINE)
    c.roundRect(x - 7, y - 7, w + 14, h + 14, 9, fill=1, stroke=1)
    c.drawImage(image, x, y, width=w, height=h, mask='auto')

def build_appendix():
    c = canvas.Canvas(str(APPENDIX), pagesize=landscape(A4))
    header(c, "Daily work update", "13 August 2026", 1)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(42, PAGE_H - 122, "Customer sharing, notifications, and portal improvements")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 12)
    c.drawString(42, PAGE_H - 148, "Work completed today in the GreenOps web application.")

    sections = [
        ("Customer account experience", [
            "Renamed the customer workspace page to My Profile and refined the shared-record dashboard.",
            "Added clear overview cards for estimates, jobs, invoices, and all shared records.",
            "Added customer-only Estimates, Jobs, and Invoices sections with a private-account experience."
        ]),
        ("Secure sharing workflow", [
            "Sending an estimate, job, or invoice now shares that exact record with the selected customer account as well as sending its PDF email.",
            "Added customer-only notifications for newly shared estimates, jobs, and invoices.",
            "Improved customer matching with permanent customer IDs, email matching, and safe fallback links for legacy records."
        ]),
        ("Reliability and validation", [
            "Moved the sharing update to the backend so records are stored even if the admin browser is delayed after sending an email.",
            "Added customer portal refresh syncing so newly shared records appear without signing out and back in.",
            "Fixed the job display filter so customer job notifications and sent job records are shown together."
        ]),
        ("Quality checks", [
            "Rebuilt the frontend after the updates.",
            "Checked JavaScript syntax for both the frontend and backend.",
            "Verified the final customer portal with shared estimates, jobs, and invoices."
        ]),
    ]
    y = PAGE_H - 190
    for title, bullets in sections:
        c.setFillColor(PALE)
        c.roundRect(42, y - 18, PAGE_W - 84, 27, 6, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(55, y - 1, title)
        y -= 37
        for bullet in bullets:
            c.setFillColor(GREEN)
            c.circle(58, y + 3, 2.5, fill=1, stroke=0)
            y = wrap(c, bullet, 70, y, PAGE_W - 120, size=10.5, leading=14) - 5
        y -= 6
    c.showPage()

    captions = [
        "Customer My Profile overview showing shared job and invoice records.",
        "Customer shared Estimates view with clear status and amount details.",
        "Administrator My Profile showing workspace ownership and account information."
    ]
    for index, (image, caption) in enumerate(zip(IMAGES, captions), start=2):
        draw_image(c, image, caption, index)
        c.showPage()
    c.save()

def merge():
    writer = PdfWriter()
    for page in PdfReader(str(SOURCE)).pages:
        writer.add_page(page)
    for page in PdfReader(str(APPENDIX)).pages:
        writer.add_page(page)
    with open(OUTPUT, "wb") as target:
        writer.write(target)

if __name__ == "__main__":
    build_appendix()
    merge()
    print(OUTPUT)
