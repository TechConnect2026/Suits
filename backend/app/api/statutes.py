"""Statutes router - Criminal Law Era Transition Engine (IPC/CrPC/IEA ↔ BNS/BNSS/BSA)."""

import re
from fastapi import APIRouter, Query, Response, HTTPException
import structlog

from app.dependencies.auth import CurrentUser, OptionalUser, DbSession
from app.schemas.common import APIResponse
from app.schemas.era_transition import (
    ConcordanceLookupResponse,
    EraTransitionCaseAnalysis,
    StatutoryVerbatimDiffResponse,
    TemporalInspectionRequest,
    TemporalInspectionResponse,
    TransitionQuestionRequest,
    TransitionQuestionResponse,
    TransitionalJurisprudenceResponse,
)
from app.services.era_transition_service import EraTransitionService
from app.services.temporal_safeguard_service import temporal_safeguard_service
from app.services.statutory_diff_service import statutory_diff_service
from app.services.transitional_jurisprudence_service import transitional_jurisprudence_service
from app.core.exceptions import InvalidCNRError

logger = structlog.get_logger()

router = APIRouter(prefix="/statutes", tags=["Statutes & Era Transition"])

CNR_PATTERN = re.compile(r"^[A-Z]{4}\d{12}$")


def _validate_cnr(cnr: str) -> str:
    cnr = cnr.upper().strip()
    if not (CNR_PATTERN.match(cnr) or cnr.isdigit()):
        raise InvalidCNRError(cnr)
    return cnr


@router.get("/era-transition/lookup", response_model=APIResponse[ConcordanceLookupResponse])
def lookup_era_concordance(
    query: str = Query("", description="Section number, statute name, or legal doctrine"),
    limit: int = Query(24, ge=1, le=100),
    category: str | None = Query(None, description="Optional category filter (PROCEDURAL, SUBSTANTIVE, EVIDENTIARY)"),
    user: OptionalUser = None,
    db: DbSession = None,
):
    """Search criminal statutes concordance by section, statute, or InLegalBERT semantic doctrine."""
    q_lower = query.lower()
    if re.search(r"\b(crpc|code of criminal procedure|criminal procedure|bnss|bharatiya nagarik|nagarik suraksha)\b", q_lower):
        category = "PROCEDURAL"
    elif re.search(r"\b(ipc|indian penal|penal code|bns|bharatiya nyaya|nyaya sanhita)\b", q_lower):
        category = "SUBSTANTIVE"
    elif re.search(r"\b(iea|evidence act|indian evidence|bsa|bharatiya sakshya|sakshya adhiniyam)\b", q_lower):
        category = "EVIDENTIARY"

    service = EraTransitionService(db)
    pairs = service.lookup_concordance(query=query, limit=limit, category=category)
    response_data = ConcordanceLookupResponse(
        query=query,
        match_count=len(pairs),
        pairs=pairs,
    )
    return APIResponse(data=response_data)


@router.post("/era-transition/ask", response_model=APIResponse[TransitionQuestionResponse])
async def ask_era_transition_question(
    payload: TransitionQuestionRequest,
    user: OptionalUser = None,
    db: DbSession = None,
):
    """Answer legal transition questions and synthesize court-ready submissions."""
    service = EraTransitionService(db)
    result = await service.answer_transition_question(
        question=payload.question,
        category=payload.category,
        active_era=payload.active_era,
    )
    return APIResponse(data=result)


# ── Pillar 4: Temporal Safeguard & Verbatim Diff Endpoints ──

@router.post("/era-transition/inspect-temporal", response_model=APIResponse[TemporalInspectionResponse])
def inspect_temporal_incident(
    payload: TemporalInspectionRequest,
    user: OptionalUser = None,
) -> APIResponse[TemporalInspectionResponse]:
    """Inspects incident and FIR dates against the July 1, 2024 cutoff for Article 20(1) compliance."""
    try:
        result = temporal_safeguard_service.inspect_temporal_incident(payload)
        return APIResponse(data=result, message="Temporal incident analysis complete.")
    except Exception as exc:
        logger.error("inspect_temporal_incident_failed", error=str(exc))
        raise HTTPException(
            status_code=400,
            detail=f"Unable to audit dates: {str(exc)}",
        )


@router.get("/era-transition/verbatim-diff/{pair_id}", response_model=APIResponse[StatutoryVerbatimDiffResponse])
def get_statutory_verbatim_diff(
    pair_id: str,
    user: OptionalUser = None,
) -> APIResponse[StatutoryVerbatimDiffResponse]:
    """Generates word-for-word textual diff and procedural delta between old and new statutes."""
    result = statutory_diff_service.get_verbatim_diff(pair_id)
    return APIResponse(data=result, message="Verbatim statutory diff computed successfully.")


@router.get("/era-transition/transitional-jurisprudence", response_model=APIResponse[TransitionalJurisprudenceResponse])
def get_transitional_jurisprudence(
    topic: str | None = Query(None, description="Topic filter (e.g. 'Undertrial Bail', 'Police Custody')"),
    query: str | None = Query(None, description="Textual search keyword"),
    user: OptionalUser = None,
) -> APIResponse[TransitionalJurisprudenceResponse]:
    """Retrieves curated landmark authorities resolving criminal reform transition ambiguities."""
    result = transitional_jurisprudence_service.list_jurisprudence(topic=topic, query=query)
    return APIResponse(data=result, message="Transitional jurisprudence retrieved successfully.")


@router.get("/cases/{cnr}/era-transition", response_model=APIResponse[EraTransitionCaseAnalysis])
async def get_case_era_transition(
    cnr: str,
    user: CurrentUser,
    db: DbSession,
):
    """Generate or retrieve cached criminal era transition matrix and transposed pleading arguments."""
    cnr = _validate_cnr(cnr)
    service = EraTransitionService(db)
    analysis = await service.analyze_case_transition(cnr)
    if analysis is None:
        return Response(status_code=204)
    return APIResponse(data=analysis)


@router.post("/cases/{cnr}/era-transition/refresh", response_model=APIResponse[EraTransitionCaseAnalysis])
async def refresh_case_era_transition(
    cnr: str,
    user: CurrentUser,
    db: DbSession,
):
    """Force re-generation of criminal era transition analysis and court pleading arguments."""
    cnr = _validate_cnr(cnr)
    service = EraTransitionService(db)
    analysis = await service.analyze_case_transition(cnr, force_refresh=True)
    if analysis is None:
        return Response(status_code=204)
    return APIResponse(data=analysis, message="Era transition analysis refreshed.")
