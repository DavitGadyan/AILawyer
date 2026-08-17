"""Deterministic lawyer matching.

Scoring is plain Python on purpose: it is fast, free, reproducible, and — most importantly —
explainable. Every match ships the reasons that produced it, which the app renders on the
lawyer card. No second model call.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.models.lawyer import Lawyer

# Weights sum to 100 for a perfect match.
W_JURISDICTION = 40
W_JURISDICTION_ADJACENT = 18  # Spain <-> EU partial credit
W_SPECIALTY_EACH = 12
W_SPECIALTY_CAP = 36
W_LANGUAGE = 12
W_RATING = 8
W_EXPERIENCE = 4

SPECIALTY_LABELS = {
    # immigration
    "work_visa": "work visas",
    "student_visa": "student visas",
    "family_reunification": "family reunification",
    "asylum": "asylum",
    "citizenship": "citizenship",
    "investor_visa": "investor visas",
    "golden_visa": "golden visas",
    "deportation_defense": "deportation defence",
    "appeals": "appeals",
    "permanent_residency": "permanent residency",
    "digital_nomad": "digital nomad visas",
    "business_immigration": "business immigration",
    # tax & structuring
    "corporate_structuring": "corporate structuring",
    "cross_border_tax": "cross-border tax",
    "transfer_pricing": "transfer pricing",
    "us_uk_tax": "US-UK tax",
    "permanent_establishment": "permanent establishment",
    "vat_sales_tax": "VAT and sales tax",
    "rd_credits": "R&D credits",
    "crypto_tax": "crypto tax",
    "exit_planning": "exit planning",
    "personal_tax": "personal tax",
}


@dataclass
class ScoredLawyer:
    lawyer: Lawyer
    score: int
    reasons: list[str]


def _jurisdiction_points(lawyer_j: str, target: str | None) -> tuple[int, str | None]:
    if not target:
        return 0, None
    if lawyer_j == target:
        return W_JURISDICTION, f"Admitted in {target}"
    # A Spanish lawyer is useful for a general EU question and vice versa; a US lawyer is not.
    if {lawyer_j, target} == {"ES", "EU"}:
        return W_JURISDICTION_ADJACENT, f"Practises in the EU, close to {target}"
    return 0, None


def score_lawyer(
    lawyer: Lawyer,
    jurisdiction: str | None,
    specialties: list[str],
    locale: str,
) -> ScoredLawyer:
    score = 0
    reasons: list[str] = []

    pts, reason = _jurisdiction_points(lawyer.jurisdiction, jurisdiction)
    score += pts
    if reason:
        reasons.append(reason)

    lawyer_specialties = set(lawyer.specialties or [])
    overlap = [s for s in specialties if s in lawyer_specialties]
    if overlap:
        score += min(len(overlap) * W_SPECIALTY_EACH, W_SPECIALTY_CAP)
        labels = [SPECIALTY_LABELS.get(s, s.replace("_", " ")) for s in overlap[:2]]
        reasons.append("Specialises in " + " and ".join(labels))

    if locale and locale in (lawyer.languages or []):
        score += W_LANGUAGE
        reasons.append(f"Speaks {'Spanish' if locale == 'es' else 'English'}")

    # rating 4.0 -> 0 pts, 5.0 -> full weight
    rating_pts = max(0.0, min(1.0, (lawyer.rating - 4.0))) * W_RATING
    score += int(round(rating_pts))
    if lawyer.rating >= 4.7:
        reasons.append(f"Rated {lawyer.rating:g} by {lawyer.reviews_count} clients")

    exp_pts = min(lawyer.years_experience, 20) / 20 * W_EXPERIENCE
    score += int(round(exp_pts))
    if lawyer.years_experience >= 10:
        reasons.append(f"{lawyer.years_experience} years of experience")

    if lawyer.offers_free_consult:
        reasons.append("Offers a free first consultation")

    return ScoredLawyer(lawyer=lawyer, score=min(score, 100), reasons=reasons[:3])


def in_practice(lawyer: Lawyer, practice: str) -> bool:
    """Advisers with no explicit practices are legacy immigration rows."""
    return practice in (lawyer.practices or ["immigration"])


def rank_lawyers(
    lawyers: list[Lawyer],
    jurisdiction: str | None,
    specialties: list[str],
    locale: str = "en",
    limit: int = 5,
    practice: str = "immigration",
) -> list[ScoredLawyer]:
    # Filter before scoring: an immigration lawyer is never the right answer to a
    # transfer-pricing question, however well they score on jurisdiction and language.
    pool = [x for x in lawyers if in_practice(x, practice)]
    scored = [score_lawyer(x, jurisdiction, specialties, locale) for x in pool]
    # Rating then review count break ties, so ordering is stable across identical scores.
    scored.sort(
        key=lambda s: (s.score, s.lawyer.rating, s.lawyer.reviews_count),
        reverse=True,
    )
    return scored[:limit]
