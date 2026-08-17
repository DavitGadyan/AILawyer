"""Matching is pure scoring, so it can be tested without the API or a model."""

from app.models.lawyer import Lawyer
from app.services.matching import rank_lawyers, score_lawyer


def make(
    name="X",
    jurisdiction="ES",
    specialties=None,
    languages=None,
    rating=4.5,
    years=10,
    free=True,
):
    return Lawyer(
        name=name,
        jurisdiction=jurisdiction,
        specialties=specialties or [],
        languages=languages or ["en"],
        rating=rating,
        reviews_count=50,
        years_experience=years,
        offers_free_consult=free,
        hourly_rate=100,
    )


def test_jurisdiction_match_beats_mismatch():
    match = score_lawyer(make(jurisdiction="ES"), "ES", [], "en")
    miss = score_lawyer(make(jurisdiction="US"), "ES", [], "en")
    assert match.score > miss.score
    assert any("ES" in reason for reason in match.reasons)


def test_spain_and_eu_get_partial_credit_but_us_does_not():
    spain_for_eu = score_lawyer(make(jurisdiction="ES"), "EU", [], "en")
    us_for_eu = score_lawyer(make(jurisdiction="US"), "EU", [], "en")
    exact = score_lawyer(make(jurisdiction="EU"), "EU", [], "en")

    assert us_for_eu.score < spain_for_eu.score < exact.score


def test_specialty_overlap_is_capped():
    one = score_lawyer(make(specialties=["asylum"]), "ES", ["asylum"], "en")
    many = score_lawyer(
        make(specialties=["asylum", "appeals", "citizenship", "work_visa"]),
        "ES",
        ["asylum", "appeals", "citizenship", "work_visa"],
        "en",
    )
    # 4 overlaps would be 48 points uncapped; the cap holds it to 36.
    assert many.score - one.score == 36 - 12


def test_language_match_adds_points_and_a_reason():
    spanish = score_lawyer(make(languages=["es", "en"]), "ES", [], "es")
    english_only = score_lawyer(make(languages=["en"]), "ES", [], "es")

    assert spanish.score > english_only.score
    assert any("Spanish" in reason for reason in spanish.reasons)


def test_perfect_match_is_capped_at_100():
    best = score_lawyer(
        make(specialties=["asylum", "appeals", "citizenship"], languages=["es"], rating=5.0, years=20),
        "ES",
        ["asylum", "appeals", "citizenship"],
        "es",
    )
    assert best.score == 100


def test_ranking_orders_by_score_and_respects_limit():
    pool = [
        make(name="Irrelevant", jurisdiction="US", specialties=[]),
        make(name="Perfect", jurisdiction="ES", specialties=["digital_nomad"], languages=["es"]),
        make(name="Partial", jurisdiction="ES", specialties=[]),
    ]
    ranked = rank_lawyers(pool, "ES", ["digital_nomad"], "es", limit=2)

    assert [r.lawyer.name for r in ranked] == ["Perfect", "Partial"]
    assert ranked[0].score > ranked[1].score


def test_reasons_are_capped_for_the_card_layout():
    result = score_lawyer(
        make(specialties=["asylum", "appeals"], languages=["es"], rating=4.9, years=18),
        "ES",
        ["asylum", "appeals"],
        "es",
    )
    assert len(result.reasons) <= 3


def test_no_target_jurisdiction_awards_no_jurisdiction_points():
    result = score_lawyer(make(jurisdiction="ES"), None, [], "en")
    assert not any("Admitted" in reason for reason in result.reasons)
