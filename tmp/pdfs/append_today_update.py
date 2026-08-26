from pathlib import Path
import textwrap

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final")
SOURCE = Path(r"C:\Users\poran\Downloads\Greenops.pdf")
WORK = ROOT / "tmp" / "pdfs"
APPENDIX = WORK / "greenops_update_18_august_2026.pdf"
OUTPUT = ROOT / "output" / "pdf" / "GreenOps_Project_Work_Report_18_August_2026.pdf"

SCREENSHOTS = [
    ("Screenshot 1 - Schedule workspace", Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-070738ba-953b-48a7-9a6b-7657409102d6.png"),
     "Schedule calendar with status cards, editable scheduled jobs, job numbers, crew assignments, and clear time slots."),
    ("Screenshot 2 - Job Details and Crew Progress", Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-c504c656-f452-4096-b98b-c67f747d9472.png"),
     "Job Details now shows the assigned crew, overall status, schedule, property, and each crew member's completed status and date."),
    ("Screenshot 3 - Customer Invoices", Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-c95ea3b5-969c-45c4-9881-77ef4d995b44.png"),
     "Customer invoice workspace with compact one-line summary cards, filters, totals, paid amount, balance due, and invoice status."),
]

GREEN = HexColor("#0c8a4e")
DARK = HexColor("#102d22")
MUTED = HexColor("#5f756a")
SOFT = HexColor("#f2faf5")
LINE = HexColor("#d8e7df")


def header(c, title, subtitle, page_num):
    width, height = A4
    c.setFillColor(GREEN)
    c.rect(0, height - 8, width, 8, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(48, height - 53, "GREENOPS PROJECT WORK REPORT")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(48, height - 70, "Daily work update - 18 August 2026")
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(48, height - 112, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(48, height - 130, subtitle)
    c.setStrokeColor(LINE)
    c.line(48, height - 143, width - 48, height - 143)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawRightString(width - 48, 25, f"Appendix page {page_num}")


def summary_page(c):
    width, height = A4
    header(c, "Today's completed work", "Customer access, crew workflow, schedule controls, invoice presentation, and PDF delivery.", 1)
    sections = [
        ("Customer account access", [
            "Improved customer profile recovery so valid customer logins open the My Profile portal instead of a blocked link screen.",
            "Kept customer estimates, jobs, and invoices separated into clear account sections with shared-record filtering."
        ]),
        ("Crew job workflow", [
            "Crew Start Job now changes the shared job to In Progress; Complete Job changes it to Completed across crew and admin accounts.",
            "Added individual Crew Progress status and completion dates in Job Details for multi-crew jobs."
        ]),
        ("Schedule improvements", [
            "Added an Edit control directly on each scheduled job card for changing crew, date, time, notes, and schedule status.",
            "Maintained a clear schedule view with Scheduled, In Progress, and Completed status cards."
        ]),
        ("Customer invoices and PDF delivery", [
            "Refined customer invoice cards into a compact single-line summary with total invoices, sent, partial, paid, total paid, and balance due.",
            "Redesigned the customer-facing Job PDF into a polished one-page service-visit document with branding, job number, status, visit details, notes, and contact footer."
        ])
    ]
    y = height - 178
    for title, bullets in sections:
        wrapped = []
        for item in bullets:
            lines = textwrap.wrap(item, width=105)
            wrapped.extend(["- " + lines[0], *["  " + line for line in lines[1:]]])
        card_height = max(76, 37 + len(wrapped) * 13)
        c.setFillColor(SOFT)
        c.roundRect(48, y - card_height, width - 96, card_height, 9, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.circle(67, y - 19, 7, fill=1, stroke=0)
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(84, y - 23, title)
        c.setFont("Helvetica", 9.2)
        c.setFillColor(MUTED)
        text = c.beginText(84, y - 39)
        text.setLeading(13)
        for line in wrapped:
            text.textLine(line)
        c.drawText(text)
        y -= card_height + 12
    c.setFillColor(HexColor("#eef7ff"))
    c.roundRect(48, 70, width - 96, 52, 9, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(64, 99, "Verification completed")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(64, 83, "Frontend syntax checks and the production build completed successfully after the updates.")
    c.showPage()


def screenshot_page(c, title, path, caption, page_num):
    width, height = landscape(A4)
    c.setFillColor(GREEN)
    c.rect(0, height - 7, width, 7, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(38, height - 42, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(38, height - 58, "GreenOps visual update - 18 August 2026")
    image = ImageReader(str(path))
    image_width, image_height = image.getSize()
    max_width, max_height = width - 76, height - 158
    scale = min(max_width / image_width, max_height / image_height)
    draw_width, draw_height = image_width * scale, image_height * scale
    x = (width - draw_width) / 2
    y = 82 + (max_height - draw_height) / 2
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(x - 4, y - 4, draw_width + 8, draw_height + 8, 6, fill=1, stroke=1)
    c.drawImage(image, x, y, width=draw_width, height=draw_height, preserveAspectRatio=True, mask='auto')
    c.setFillColor(DARK)
    c.setFont("Helvetica", 9.5)
    c.drawString(38, 52, caption)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawRightString(width - 38, 25, f"Appendix page {page_num}")
    c.showPage()


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(APPENDIX), pagesize=A4)
    c.setTitle("GreenOps Project Work Report - 18 August 2026")
    summary_page(c)
    for index, (title, path, caption) in enumerate(SCREENSHOTS, start=2):
        c.setPageSize(landscape(A4))
        screenshot_page(c, title, path, caption, index)
    c.save()

    writer = PdfWriter()
    for page in PdfReader(str(SOURCE)).pages:
        writer.add_page(page)
    for page in PdfReader(str(APPENDIX)).pages:
        writer.add_page(page)
    with OUTPUT.open("wb") as stream:
        writer.write(stream)
    print(OUTPUT)


if __name__ == "__main__":
    main()
