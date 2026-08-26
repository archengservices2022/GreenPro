from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT = Path(r"C:\Users\poran\Documents\Codex\2026-07-14\gi\GreenPro-Updated-Login-Verified-Admin-Registration-Final")
SOURCE = Path(r"C:\Users\poran\Downloads\Greenops.pdf")
CUSTOMER_SHOT = Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-892283b8-a95d-48c1-b266-558ff821f86b.png")
DELIVERY_SHOT = Path(r"C:\Users\poran\AppData\Local\Temp\codex-clipboard-91f543a4-1f00-4a2a-8343-a17366507d2f.png")
APPENDIX = ROOT / "tmp" / "pdfs" / "aug17_update_pages.pdf"
OUTPUT = ROOT / "output" / "pdf" / "Greenops-updated-2026-08-17.pdf"

PAGE_W, PAGE_H = landscape(A4)
GREEN = HexColor("#108a50")
NAVY = HexColor("#102d22")
MUTED = HexColor("#587066")
PALE = HexColor("#eef8f2")
LINE = HexColor("#cfe4d8")

def header(c, kicker, title, subtitle):
    c.setFillColor(PALE)
    c.roundRect(34, PAGE_H - 113, PAGE_W - 68, 78, 14, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(54, PAGE_H - 58, kicker.upper())
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(54, PAGE_H - 84, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10.5)
    c.drawString(54, PAGE_H - 102, subtitle)
    c.setStrokeColor(GREEN)
    c.setLineWidth(2)
    c.line(34, PAGE_H - 119, PAGE_W - 34, PAGE_H - 119)

def footer(c, page_label):
    c.setStrokeColor(LINE)
    c.setLineWidth(.8)
    c.line(34, 30, PAGE_W - 34, 30)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(34, 17, "GreenOps - Work update")
    c.drawRightString(PAGE_W - 34, 17, page_label)

def fit_image(c, path, x, y, width, height):
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(width / iw, height / ih)
    draw_w, draw_h = iw * scale, ih * scale
    dx, dy = x + (width - draw_w) / 2, y + (height - draw_h) / 2
    c.setFillColor(HexColor("#ffffff"))
    c.roundRect(x, y, width, height, 10, fill=1, stroke=0)
    c.drawImage(image, dx, dy, draw_w, draw_h, preserveAspectRatio=True, mask='auto')
    c.setStrokeColor(LINE)
    c.roundRect(x, y, width, height, 10, fill=0, stroke=1)

def update_page(c):
    header(c, "GreenOps progress report", "Work update - 17 August 2026", "Testing, customer access, invoices, jobs, estimates, filters, and delivery improvements.")
    sections = [
        ("Invoice summary", [
            "Tested the invoice summary calculations: subtotal, tax, total amount, amount paid, and balance due.",
            "Checked the compact single-page Job PDF layout used when sending job details to customers."
        ]),
        ("Jobs and estimates", [
            "Tested job creation, scheduling, status handling, and the estimate workflow.",
            "Confirmed that only jobs scheduled through Schedule Job appear in the Schedule calendar."
        ]),
        ("Customer account", [
            "Worked on customer-account linking and profile access so the correct customer record opens after sign-in.",
            "Applied customer filters and start cards for shared estimates, jobs, and invoices."
        ]),
        ("Customer delivery", [
            "Tested the delivery choices for invoices, estimates, and jobs: email, customer account, or both.",
            "Shared records are designed to appear privately in the matching customer account and create notifications."
        ])
    ]
    y = PAGE_H - 160
    for index, (title, bullets) in enumerate(sections):
        x = 50 if index % 2 == 0 else 425
        if index == 2:
            y = PAGE_H - 330
        elif index == 3:
            y = PAGE_H - 330
        c.setFillColor(HexColor("#ffffff"))
        c.roundRect(x, y - 120, 340, 108, 12, fill=1, stroke=0)
        c.setStrokeColor(LINE)
        c.roundRect(x, y - 120, 340, 108, 12, fill=0, stroke=1)
        c.setFillColor(GREEN)
        c.circle(x + 20, y - 32, 8, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(x + 38, y - 37, title)
        text_y = y - 62
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9.2)
        for bullet in bullets:
            c.setFillColor(GREEN)
            c.circle(x + 19, text_y + 2, 2.4, fill=1, stroke=0)
            c.setFillColor(MUTED)
            words = bullet.split()
            line, lines = "", []
            for word in words:
                candidate = (line + " " + word).strip()
                if c.stringWidth(candidate, "Helvetica", 9.2) > 292:
                    lines.append(line)
                    line = word
                else:
                    line = candidate
            if line:
                lines.append(line)
            for item in lines:
                c.drawString(x + 30, text_y, item)
                text_y -= 12
            text_y -= 4
    footer(c, "17 August 2026")
    c.showPage()

def screenshot_page(c, title, subtitle, image_path, page_label):
    header(c, "GreenOps verification", title, subtitle)
    fit_image(c, image_path, 45, 58, PAGE_W - 90, PAGE_H - 210)
    footer(c, page_label)
    c.showPage()

def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    for shot in (CUSTOMER_SHOT, DELIVERY_SHOT):
        if not shot.exists():
            raise FileNotFoundError(shot)
    APPENDIX.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(APPENDIX), pagesize=landscape(A4))
    update_page(c)
    screenshot_page(c, "Customer profile and account access", "Verified customer profile details, account status, and customer-only navigation.", CUSTOMER_SHOT, "Screenshot 1 - 17 August 2026")
    screenshot_page(c, "Customer delivery options", "Verified invoice delivery choices for email, private customer account access, or both.", DELIVERY_SHOT, "Screenshot 2 - 17 August 2026")
    c.save()
    writer = PdfWriter()
    for source in (SOURCE, APPENDIX):
        reader = PdfReader(str(source))
        for page in reader.pages:
            writer.add_page(page)
    with OUTPUT.open('wb') as output_stream:
        writer.write(output_stream)
    print(OUTPUT)
    print(f"source_pages={len(PdfReader(str(SOURCE)).pages)} appendix_pages={len(PdfReader(str(APPENDIX)).pages)} output_pages={len(PdfReader(str(OUTPUT)).pages)}")

if __name__ == '__main__':
    main()
