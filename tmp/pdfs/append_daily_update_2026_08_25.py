from pathlib import Path
from io import BytesIO

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


SOURCE = Path(r"C:\Users\poran\Downloads\GreenOps.pdf")
OUTPUT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final\output\pdf\GreenOps_updated_25_August_2026.pdf")


def wrap(text, font, size, width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and stringWidth(candidate, font, size) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_update_page(width, height):
    stream = BytesIO()
    page = canvas.Canvas(stream, pagesize=(width, height))
    green = HexColor("#087A45")
    dark = HexColor("#102A20")
    muted = HexColor("#577166")
    pale = HexColor("#EEF8F2")
    line = HexColor("#CFE4D8")

    margin = 48
    y = height - 50
    page.setFillColor(green)
    page.rect(0, height - 18, width, 18, fill=1, stroke=0)
    page.setFillColor(dark)
    page.setFont("Helvetica-Bold", 18)
    page.drawString(margin, y, "GREENOPS PROJECT WORK REPORT")
    y -= 25
    page.setFont("Helvetica-Bold", 23)
    page.drawString(margin, y, "Daily work update - 25 August 2026")
    y -= 24
    page.setFillColor(muted)
    page.setFont("Helvetica", 10.5)
    page.drawString(margin, y, "Dashboard, table navigation, schedule navigation, company branding, and review updates.")
    y -= 28

    sections = [
        (
            "Dashboard and reporting",
            [
                "Added a Paid Invoices dashboard card that shows the current-year paid invoice count and total amount received. Selecting it opens the filtered paid-invoices list.",
                "Kept dashboard values scoped to the current calendar year so future-year jobs and invoices do not appear in current-year reporting.",
                "Aligned all six dashboard summary cards in one desktop row for a cleaner overview."
            ],
        ),
        (
            "Tables and record details",
            [
                "Added pagination across the main admin, customer, schedule, and crew job tables. Each page shows 15 records with centered Previous, page, and Next controls.",
                "Searches and filters now return table pagination to the first page.",
                "Removed Created By and Created Date from the Customers and Services tables; this information remains available in the relevant detail pages."
            ],
        ),
        (
            "Schedule and navigation",
            [
                "Updated month-calendar job cards so a selected job opens its Schedule Details page directly, matching the weekly calendar behavior.",
                "Retained day-cell navigation for reviewing the schedule for an entire date."
            ],
        ),
        (
            "Company branding and implementation review",
            [
                "Moved the company copyright notice into a polished application footer and removed the large settings-page display.",
                "Reviewed the current security implementation: Firebase Authentication, verified backend tokens, revoked-session checks, role checks, CORS restrictions, and server-side customer record scoping are present.",
                "Before production release, add rate limiting and security headers, enforce email verification as required, confirm Firestore rules, restrict the Firebase API key to approved domains, and keep credentials only in environment variables."
            ],
        ),
    ]

    for title, bullets in sections:
        page.setFillColor(pale)
        page.roundRect(margin, y - 24, width - margin * 2, 24, 8, fill=1, stroke=0)
        page.setFillColor(green)
        page.setFont("Helvetica-Bold", 11.5)
        page.drawString(margin + 12, y - 16, title)
        y -= 38
        page.setFillColor(dark)
        for item in bullets:
            lines = wrap(item, "Helvetica", 10, width - margin * 2 - 24)
            page.setFillColor(green)
            page.setFont("Helvetica-Bold", 10)
            page.drawString(margin + 2, y, "-")
            page.setFillColor(dark)
            page.setFont("Helvetica", 10)
            for index, text in enumerate(lines):
                page.drawString(margin + 16, y, text)
                y -= 14
            y -= 5
        y -= 8

    page.setStrokeColor(line)
    page.line(margin, 39, width - margin, 39)
    page.setFillColor(muted)
    page.setFont("Helvetica", 8.5)
    page.drawCentredString(width / 2, 24, "GreenOps Project Work Report - Daily update added 25 August 2026")
    page.save()
    stream.seek(0)
    return stream


def main():
    source_reader = PdfReader(str(SOURCE))
    first_page = source_reader.pages[0]
    box = first_page.mediabox
    width, height = float(box.width), float(box.height)
    update_reader = PdfReader(draw_update_page(width, height))

    writer = PdfWriter()
    for page in source_reader.pages:
        writer.add_page(page)
    writer.add_page(update_reader.pages[0])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("wb") as result:
        writer.write(result)
    print(OUTPUT)


if __name__ == "__main__":
    main()
