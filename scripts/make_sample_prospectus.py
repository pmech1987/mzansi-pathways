"""Builds a small fake prospectus PDF for tests (never real data)."""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

PAGES = [
    ["Example University Undergraduate Prospectus 2027", "", "Applications close on 30 September 2026", "Faculty of Natural Sciences"],
    ["BSc Computer Science", "NQF Level 7", "Minimum APS: 34", "English Home Language: Level 5", "Mathematics: Level 6", "Physical Sciences: 60%", "",
     "BCom Accounting", "APS 32", "English: Level 5", "Mathematics: 60%", "",
     "Diploma in Information Technology", "Minimum APS: 26", "English 50%", "Mathematics or Mathematical Literacy: 50%"],
    ["BEng Mechanical Engineering", "Minimum APS: 38", "English: Level 5", "Mathematics: Level 7", "Physical Sciences: Level 6", "",
     "Higher Certificate in Business Management", "APS: 20", "English: Level 4", "Mathematical Literacy: Level 4"],
]


def build(path, pages=PAGES):
    c = canvas.Canvas(path, pagesize=A4)
    for lines in pages:
        y = 800
        for l in lines:
            c.drawString(60, y, l); y -= 18
        c.showPage()
    c.save()


if __name__ == '__main__':
    build(sys.argv[1])
