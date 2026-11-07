"""API router for Pillar 3: Precedent Research & Precedent Surfacing."""

from fastapi import APIRouter, HTTPException, Depends
import structlog

from app.dependencies.auth import CurrentUser
from app.schemas.common import APIResponse
from app.schemas.precedents import (
    BatchRelevanceRequest,
    BatchRelevanceResponse,
    FormatCitationRequest,
    FormatCitationResponse,
    RelevanceRequest,
    RelevanceResponse,
    VerdictAnatomyRequest,
    VerdictAnatomyResponse,
)
from app.services.contextual_relevance_service import contextual_relevance_service
from app.services.verdict_anatomy_service import verdict_anatomy_service

logger = structlog.get_logger()

router = APIRouter(prefix="/precedents", tags=["Precedent Research & Surfacing"])


@router.post("/why-this-helps", response_model=APIResponse[RelevanceResponse])
async def get_why_this_helps_badge(
    req: RelevanceRequest,
    user: CurrentUser,
) -> APIResponse[RelevanceResponse]:
    """Generates a single-sentence plain-English contextual relevance badge for a candidate precedent."""
    try:
        badge = await contextual_relevance_service.generate_relevance_badge(req)
        return APIResponse(data=badge, message="Contextual relevance badge generated successfully.")
    except Exception as exc:
        logger.error("get_why_this_helps_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to generate relevance badge: {str(exc)}")


@router.post("/batch-relevance", response_model=APIResponse[BatchRelevanceResponse])
async def get_batch_relevance_badges(
    req: BatchRelevanceRequest,
    user: CurrentUser,
) -> APIResponse[BatchRelevanceResponse]:
    """Generates contextual relevance badges for up to 8 candidate search results in parallel."""
    try:
        badges = await contextual_relevance_service.batch_generate_relevance(req)
        return APIResponse(data=badges, message="Batch relevance evaluation completed.")
    except Exception as exc:
        logger.error("batch_relevance_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to evaluate batch relevance: {str(exc)}")


@router.post("/verdict-anatomy", response_model=APIResponse[VerdictAnatomyResponse])
async def get_verdict_anatomy(
    req: VerdictAnatomyRequest,
    user: CurrentUser,
) -> APIResponse[VerdictAnatomyResponse]:
    """Deconstructs a judgment into 4 structured modules: Issues, Material Facts, Ratio Decidendi, and Obiter Dicta."""
    try:
        anatomy = await verdict_anatomy_service.get_verdict_anatomy(req)
        return APIResponse(data=anatomy, message="Verdict anatomy structured successfully.")
    except Exception as exc:
        logger.error("get_verdict_anatomy_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to extract verdict anatomy: {str(exc)}")


@router.post("/format-citation", response_model=APIResponse[FormatCitationResponse])
async def format_court_citation(
    req: FormatCitationRequest,
    user: CurrentUser,
) -> APIResponse[FormatCitationResponse]:
    """Formats an Indian court citation and quote for insertion into LegalEditor or court pleadings."""
    try:
        formatted = verdict_anatomy_service.format_court_citation(req)
        return APIResponse(data=formatted, message="Citation formatted successfully.")
    except Exception as exc:
        logger.error("format_court_citation_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to format citation: {str(exc)}")

