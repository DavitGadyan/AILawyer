"""Populate one worked example per practice area.

These are **hand-written demonstration analyses**, not model output. They exist so the
analysis screens can be explored (and screenshotted) without an OPENAI_API_KEY, and so
the shape the AI is asked to produce is legible in the repository.

Idempotent. Run after `app.seed`:

    python -m app.demo_data
"""

from __future__ import annotations

from sqlalchemy import select

from app.db import SessionLocal, create_all
from app.models.case import (
    CaseProfile,
    ChatSession,
    ChecklistItem,
    ComplianceItem,
    Message,
    StructureEntity,
    TaxProfile,
    TaxRisk,
)
from app.models.user import User

DEMO_EMAIL = "mike@example.com"

# --------------------------------------------------------------------------- #
# Immigration — F-1 student finishing OPT, looking at US permanent residence
# --------------------------------------------------------------------------- #
IMMIGRATION_TITLE = "F-1 to green card"

IMMIGRATION_CHAT = [
    ("user",
     "I'm on an F-1 student visa finishing my OPT in about seven months. I have a master's "
     "in computer science and I'm working at a startup that says they can sponsor me. What "
     "are the realistic paths to a green card from here?"),
    ("assistant",
     "With a US master's and a sponsoring employer you have three routes worth taking "
     "seriously, and the sequencing matters more than the choice.\n\n"
     "- **H-1B then EB-2**: the usual path, but H-1B is capped and allocated by lottery, so "
     "it is not something you can rely on landing in a given year. Your master's does put you "
     "in the advanced-degree allocation, which improves the odds.\n"
     "- **EB-2 National Interest Waiver**: lets you self-petition without the employer or a "
     "labour certification. Worth assessing seriously if you have publications, patents or "
     "measurable impact.\n"
     "- **O-1**: no annual cap, but the evidentiary bar is high and it is a non-immigrant "
     "status, so it buys time rather than ending the process.\n\n"
     "The immediate constraint is your OPT end date. If the lottery does not come through, "
     "you need a backup that keeps you in status — cap-exempt employers and a further degree "
     "are the common ones.\n\n"
     "To assess this properly, an attorney would want your exact OPT end date, whether you "
     "have STEM extension eligibility, and your country of birth for priority-date purposes."),
]

IMMIGRATION_PROFILE = dict(
    nationality="India",
    current_country="United States",
    target_jurisdiction="US",
    current_status="F-1 student on OPT",
    goal="Move from student status to US permanent residence with employer sponsorship",
    urgency="high",
    dependents=0,
    summary=(
        "A master's graduate on F-1 OPT with roughly seven months of work authorisation "
        "remaining has an employer willing to sponsor. The available routes depend on lottery "
        "outcomes and on whether a self-petition can be substantiated."
    ),
    key_facts=[
        "US master's degree in computer science",
        "Approximately seven months of OPT remaining",
        "Employer has offered sponsorship",
        "Country of birth is India — priority date backlog is a material factor",
    ],
    recommended_routes=[
        {
            "name": "H-1B specialty occupation, then EB-2 adjustment",
            "fit_score": 82,
            "why": "The standard employer-sponsored path, and the advanced-degree allocation "
                   "improves lottery odds. Depends on selection, which is outside your control.",
            "typical_timeline": "approx. 6-14 months to H-1B start; green card considerably longer",
            "est_cost": "approx. $5,000-$10,000 in employer fees plus legal",
        },
        {
            "name": "EB-2 National Interest Waiver",
            "fit_score": 68,
            "why": "Self-petition without employer or labour certification. Viable if your work "
                   "shows substantial merit and national importance — evidence is decisive here.",
            "typical_timeline": "approx. 12-24 months, plus priority date wait",
            "est_cost": "approx. $3,000-$8,000 in legal fees plus filing",
        },
        {
            "name": "O-1 extraordinary ability",
            "fit_score": 41,
            "why": "No annual cap, so it sidesteps the lottery entirely, but the evidentiary "
                   "standard is high and it does not itself lead to residence.",
            "typical_timeline": "approx. 2-6 months",
            "est_cost": "approx. $6,000-$12,000 including legal",
        },
    ],
    suggested_specialties=["work_visa", "permanent_residency", "business_immigration"],
    red_flags=[
        "Your OPT end date is the binding constraint — confirm it and work backwards from it now.",
        "Falling out of status while a petition is pending can trigger an unlawful-presence bar. "
        "Do not let the authorisation lapse while waiting on an outcome.",
    ],
)

IMMIGRATION_CHECKLIST = [
    ("Form I-20 and current OPT EAD", "Establishes your present status and its end date.", True),
    ("Master's degree certificate and transcripts", "Evidence for the advanced-degree allocation.", True),
    ("Passport and most recent I-94", "Confirms lawful admission and current period of stay.", True),
    ("Employer support letter and job description", "Shows the role qualifies as a specialty occupation.", True),
    ("CV, publications and citation record", "Core evidence if you pursue a national interest waiver.", False),
    ("Letters from independent experts", "Strengthens a self-petition; not needed for a standard H-1B.", False),
]

# --------------------------------------------------------------------------- #
# Tax — UK Ltd director with US-processed revenue, considering a holding group
# --------------------------------------------------------------------------- #
TAX_TITLE = "UK Ltd + US LLC group"

TAX_CHAT = [
    ("user",
     "I'm a UK Ltd company director and we process all our transactions in the US. I'm "
     "leaning towards a group: a Hold Co LLC, a new AI trading company LLC, and my current "
     "UK Ltd. I'd like to explore tax efficiencies, risk management, paperwork and costs."),
    ("assistant",
     "A holding company is worth its cost once there is genuinely something to hold — and "
     "with two trading entities you are at that point. But two things need settling before "
     "anything is incorporated.\n\n"
     "- **How the LLCs will be treated.** The US treats an LLC as transparent by default; "
     "HMRC has historically treated it as opaque. When the two views diverge, credit relief "
     "may not line up and the same profits can be taxed twice.\n"
     "- **Where the holdco is actually managed.** A company incorporated in the US but "
     "directed from a UK desk can be UK tax resident under the central management and control "
     "test — which defeats the point of a US parent.\n\n"
     "Processing payments through a US provider is not by itself a US trade or business. US "
     "staff, an office, or an agent concluding contracts usually is, and state economic-nexus "
     "thresholds apply separately for sales tax.\n\n"
     "Worth being clear-eyed about cost: each extra entity means another set of accounts, "
     "another return and another adviser bill.\n\n"
     "A cross-border adviser would want to know where board decisions are genuinely taken, "
     "and whether you have any US-based people."),
]

TAX_PROFILE = dict(
    residence_country="United Kingdom",
    primary_jurisdiction="UK",
    business_activity="AI software products sold to business customers",
    revenue_flow=(
        "Customers largely in the US; all payments processed through a US payment provider; "
        "development and direction carried out from the UK"
    ),
    goal="Separate trading risk and improve tax efficiency across a UK/US group",
    complexity="high",
    summary=(
        "A UK-resident director operates a UK trading company whose revenue is processed in "
        "the US, and is considering inserting a US holding company above a new US trading "
        "entity and the existing UK company. The proposal raises entity-classification, "
        "corporate-residence and transfer-pricing questions that need specialist review "
        "before anything is incorporated."
    ),
    structure_rationale=(
        "A holding company is only worth its cost once there is genuinely something to hold. "
        "Here there will be two trading entities, so a holdco can ring-fence the new AI "
        "venture from the established UK business. The critical caveat is where the holdco is "
        "resident for tax: if it is run from the UK, HMRC may treat it as UK-resident "
        "regardless of where it is incorporated."
    ),
    estimated_setup_cost="approx. £4,000-£9,000 including legal and formation",
    estimated_annual_cost="approx. £6,000-£14,000 across accounts, filings and adviser fees",
    current_entities=["UK Ltd (trading)"],
    key_facts=[
        "Director is UK tax resident",
        "All transactions processed through a US payment provider",
        "New AI venture is intended to trade separately",
        "No US office or US employees stated",
    ],
    alternatives=[
        {
            "name": "Keep the UK Ltd only",
            "why": "Lowest cost and simplest compliance; the UK company can trade with US "
                   "customers directly.",
            "tradeoff": "No ring-fencing between the established business and the new AI venture.",
        },
        {
            "name": "UK holding company instead of a US one",
            "why": "Avoids the LLC classification mismatch entirely and keeps management and "
                   "control in one place.",
            "tradeoff": "Less attractive if you later want US investors or a US-domiciled parent.",
        },
    ],
    suggested_specialties=[
        "corporate_structuring", "us_uk_tax", "cross_border_tax", "transfer_pricing",
    ],
    red_flags=[
        "Do not incorporate the US entities before confirming how HMRC will treat the LLCs — "
        "the classification mismatch is hard to unwind afterwards.",
        "If the UK company has already been directing US-processed revenue, check whether a "
        "US filing obligation has already arisen.",
    ],
)

TAX_ENTITIES = [
    ("Hold Co", "US LLC (Wyoming)", "US", "holding", "", 100,
     "Sits above both trading companies so the new venture is ring-fenced from the "
     "established UK business, and gives you one place to hold IP and receive distributions.",
     "Disregarded or partnership by default for US purposes (check-the-box). HMRC has "
     "historically treated an LLC as opaque, which can break treaty relief — confirm before "
     "forming, and consider electing corporate treatment.",
     "approx. $500-$1,500", "approx. $1,000-$2,500"),
    ("AI Trading Co", "US LLC (Delaware)", "US", "trading", "Hold Co", 100,
     "Houses the new AI product so its contracts, liabilities and any future investment sit "
     "apart from the existing UK trade.",
     "Same classification question as the holdco. If it has US customers and US-based "
     "activity it will likely have US federal and state filing obligations.",
     "approx. $500-$1,500", "approx. $2,000-$4,000"),
    ("UK Ltd", "UK private limited company", "UK", "trading", "Hold Co", 100,
     "Your existing trade continues unchanged; only its ownership moves under the holdco.",
     "UK corporation tax on worldwide profits. Moving the shares under a holdco is a "
     "disposal — check whether share-for-share relief applies before transferring.",
     "approx. £0 (already formed)", "approx. £2,000-£5,000"),
]

TAX_RISKS = [
    ("US LLC treated as opaque by HMRC", "entity_classification", "high",
     "The US treats an LLC as transparent by default while HMRC has historically treated it "
     "as opaque. The same profits can then be taxed in both countries with the credit relief "
     "failing to line up.",
     "Get a dual-qualified UK/US adviser to confirm the treatment before forming anything, and "
     "consider a corporation or a check-the-box election so both sides agree."),
    ("Holdco may be UK-resident by central management and control", "corporate_residence", "high",
     "A company incorporated in the US but directed from a UK desk can be UK tax resident "
     "under the central management and control test, defeating the point of a US parent.",
     "Decide in advance where board decisions will genuinely be taken and minuted. If that is "
     "the UK, a UK holding company is the more honest structure."),
    ("US permanent establishment / state nexus", "permanent_establishment", "medium",
     "Processing payments in the US is not by itself a US trade or business, but US staff, an "
     "office, or an agent concluding contracts usually is — and state economic-nexus "
     "thresholds apply separately for sales tax.",
     "Document where work is actually performed and who signs contracts. Review state "
     "thresholds for the states where your customers sit."),
    ("Transfer pricing between the trading companies", "transfer_pricing", "medium",
     "Once two related companies transact — shared staff, IP, or intra-group services — the "
     "pricing must be arm's length and documented.",
     "Put an intercompany agreement in place from day one and keep a benchmarking file. The "
     "UK SME exemption may apply; confirm whether you qualify."),
    ("Withholding on distributions to the group", "withholding_tax", "low",
     "Dividends and certain payments crossing borders can attract withholding tax where treaty "
     "relief is not properly claimed.",
     "Confirm the UK-US treaty article and limitation-on-benefits position applies to your "
     "structure before any distribution."),
]

TAX_COMPLIANCE = [
    ("Form 5471", "US", "annual", "With the US income tax return",
     "Reporting a US person's interest in certain foreign corporations.", True),
    ("Form 1120 / 1120-F", "US", "annual", "Generally 15 April or 15 June",
     "US federal return for the US entities, depending on classification and activity.", True),
    ("CT600 corporation tax return", "UK", "annual", "12 months after the accounting period end",
     "UK corporation tax self-assessment for the UK Ltd.", True),
    ("Annual accounts & confirmation statement", "UK", "annual", "9 months after the period end",
     "Companies House filing obligations for the UK Ltd.", True),
    ("BE-13 survey", "US", "one-off", "Within 45 days of the transaction",
     "US Bureau of Economic Analysis reporting on new foreign direct investment.", True),
    ("Intercompany agreements & TP file", "UK", "annual", "Maintained contemporaneously",
     "Supports the arm's-length pricing of intra-group transactions.", False),
]


def _session(db, user_id: int, title: str, practice: str, jurisdiction: str) -> ChatSession:
    existing = db.scalar(select(ChatSession).where(ChatSession.title == title))
    if existing is not None:
        db.delete(existing)
        db.flush()
    session = ChatSession(
        user_id=user_id, title=title, practice=practice,
        jurisdiction=jurisdiction, locale="en",
    )
    db.add(session)
    db.flush()
    return session


def run() -> None:
    create_all()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if user is None:
            raise SystemExit(
                f"Demo user {DEMO_EMAIL} not found — run `python -m app.seed` first."
            )

        # ------------------------------ immigration ------------------------ #
        session = _session(db, user.id, IMMIGRATION_TITLE, "immigration", "US")
        for role, content in IMMIGRATION_CHAT:
            db.add(Message(session_id=session.id, role=role, content=content))

        profile = CaseProfile(session_id=session.id, user_id=user.id, **IMMIGRATION_PROFILE)
        db.add(profile)
        db.flush()
        for name, why, mandatory in IMMIGRATION_CHECKLIST:
            db.add(ChecklistItem(
                profile_id=profile.id, name=name, why=why, mandatory=mandatory,
            ))

        # --------------------------------- tax ----------------------------- #
        tax_session = _session(db, user.id, TAX_TITLE, "tax", "UK")
        for role, content in TAX_CHAT:
            db.add(Message(session_id=tax_session.id, role=role, content=content))

        tax_profile = TaxProfile(
            session_id=tax_session.id, user_id=user.id, **TAX_PROFILE
        )
        db.add(tax_profile)
        db.flush()

        for (n, et, j, r, ob, pct, rat, tt, sc, ac) in TAX_ENTITIES:
            db.add(StructureEntity(
                profile_id=tax_profile.id, name=n, entity_type=et, jurisdiction=j,
                role=r, owned_by=ob, ownership_pct=pct, rationale=rat,
                tax_treatment=tt, setup_cost=sc, annual_cost=ac,
            ))
        for (title, category, severity, explanation, mitigation) in TAX_RISKS:
            db.add(TaxRisk(
                profile_id=tax_profile.id, title=title, category=category,
                severity=severity, explanation=explanation, mitigation=mitigation,
            ))
        for (name, j, freq, deadline, why, mandatory) in TAX_COMPLIANCE:
            db.add(ComplianceItem(
                profile_id=tax_profile.id, name=name, jurisdiction=j, frequency=freq,
                deadline=deadline, why=why, mandatory=mandatory,
            ))

        db.commit()

        print("Demo analyses created (hand-written, not model output):")
        print(f"  immigration  session={session.id}  case profile={profile.id}")
        print(f"  tax          session={tax_session.id}  tax profile={tax_profile.id}")
        print(f"\n  Sign in as {DEMO_EMAIL} / demo12345 to explore them.")


if __name__ == "__main__":
    run()
