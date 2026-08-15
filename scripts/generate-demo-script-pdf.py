#!/usr/bin/env python3
"""Generate OIA RFQ 5302 demo teleprompter PDF."""

from fpdf import FPDF

OUTPUT = "/Users/admin/Downloads/oia-5302-demo/OIA-Demo-Script.pdf"


class ScriptPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 116, 139)
        self.cell(0, 8, "OIA RFQ 5302 - Demo Teleprompter", align="R", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title: str):
        self.ln(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(15, 118, 110)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def sub_title(self, title: str):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(30, 41, 59)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")

    def body(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def quote(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(71, 85, 105)
        self.set_fill_color(236, 253, 245)
        self.multi_cell(0, 6, text, fill=True)
        self.ln(3)

    def action(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(180, 83, 9)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 6, f"  -  {text}")


def main():
    pdf = ScriptPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 12, "OIA AI Recruitment Assistant", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 8, "Demo Teleprompter (English) - RFQ 5302", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.body(
        "Duration: ~5 minutes  |  URL: http://localhost:5180/  |  "
        "Tip: Hard refresh once before the meeting (Cmd+Shift+R)."
    )

    pdf.section_title("Opening (~20 sec)")
    pdf.quote(
        'This is a clickable prototype for OIA RFQ 5302 - AI-assisted recruitment. '
        'Two portals: Candidate and HR, fully separated. The interview segment runs '
        'offline with local inference.'
    )

    pdf.section_title("Part 1 - Candidate Portal (~2 min)")
    pdf.action("[Click Candidate portal -> Enter application (offline-ready)]")

    pdf.sub_title("C1 - Apply & Parse CV")
    pdf.action("[Upload CV -> Review fields -> Submit profile]")
    pdf.quote('CV parsing with evidence-linked fields. In production this writes back to Jadarah.')

    pdf.sub_title("C2 - CV Update Confirmation")
    pdf.action("[Accept & continue]")
    pdf.quote('Candidate must confirm CV updates - nothing is overwritten silently.')

    pdf.sub_title("C3 - Assessment")
    pdf.action("[Answer all MCQs -> Submit exam]")
    pdf.quote('Role-specific assessment, auto-scored.')

    pdf.sub_title("C4 - AI Avatar Interview")
    pdf.action("[Start -> English answer -> Continue to Arabic -> Arabic answer -> Submit interview]")
    pdf.quote(
        'Bilingual avatar interview. Recording is saved for HR review only. '
        'Candidate never sees match scores or other applicants.'
    )

    pdf.sub_title("C5 & C6 - Score & Status")
    pdf.action("[Briefly show tips & status -> Exit portal]")

    pdf.section_title("Part 2 - HR / Recruiter Portal (~2 min)")
    pdf.action("[Click HR portal - demo data loads automatically]")

    pdf.sub_title("H1 - Matching Dashboard")
    pdf.action("[Show KPI cards, ranked table, dimension bars -> click evidence -> Export CSV]")
    pdf.quote('Explainable matching with scores, filters, and evidence drill-down - not a black box.')

    pdf.sub_title("H2 - Shortlist / Reject")
    pdf.action("[Enter shortlist reason -> Shortlist candidate]")
    pdf.quote('Human gate #1: mandatory written reason. AI recommends; recruiter decides.')

    pdf.sub_title("H3 - Review Interview")
    pdf.action("[Scroll transcript -> Proceed to final decision]")
    pdf.quote('HR-only view of the full bilingual interview recording.')

    pdf.sub_title("H4 - Final Decision")
    pdf.action("[Enter final reason -> Confirm recommendation]")
    pdf.quote('Human gate #2: no auto-hire. Recruiter must confirm with documented reason.')

    pdf.sub_title("H5 - Audit & Reports")
    pdf.action("[Scroll audit log]")
    pdf.quote('Full audit trail for compliance - every action is logged with who, when, and why.')

    pdf.section_title("Closing (~15 sec)")
    pdf.quote(
        'Dual portals. Evidence-linked AI. Human-in-the-loop. Bilingual interview. Full audit trail. '
        'Production adds live Jadarah integration, on-prem models, and production avatar/TTS. Questions?'
    )

    pdf.section_title("Quick Q&A")
    pdf.bullet("Is this production?  No - vertical slice; integrations are simulated.")
    pdf.bullet("Real AI models?  UI simulates inference; production uses on-prem LLM + ASR/TTS in Oman.")
    pdf.bullet("Can AI hire automatically?  No - every gate requires human action + reason.")
    pdf.bullet("Why separate portals?  Privacy, RBAC - candidates never see HR tools.")
    pdf.ln(2)
    pdf.body("If demo gets stuck: Exit portal -> refresh http://localhost:5180/")

    pdf.output(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
