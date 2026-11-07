"""Drafting router - Court-ready templates, deficit auditing, and native DOCX paper-book exporter."""

import io
import re
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import structlog

from app.dependencies.auth import CurrentUser
from app.schemas.common import APIResponse
from app.schemas.drafting import (
    AuditDeficitsRequest,
    AuditDeficitsResponse,
    DraftingTemplateItem,
    DocxExportRequest,
    GeneratePleadingRequest,
    GeneratePleadingResponse,
)
from app.services.deficit_guard_service import deficit_guard_service
from app.services.docx_export_service import docx_export_service
from app.services.drafting_templates_service import drafting_templates_service

logger = structlog.get_logger()

router = APIRouter(prefix="/drafting", tags=["Drafting"])


@router.get("/templates", response_model=APIResponse[list[DraftingTemplateItem]])
async def list_templates() -> APIResponse[list[DraftingTemplateItem]]:
    """Returns the catalog of 9 standard Indian court drafting templates."""
    catalog = drafting_templates_service.get_template_catalog()
    return APIResponse(data=catalog, message="Drafting templates catalog retrieved successfully.")


@router.post("/generate", response_model=APIResponse[GeneratePleadingResponse])
async def generate_pleading(
    request: GeneratePleadingRequest,
    user: CurrentUser,
) -> APIResponse[GeneratePleadingResponse]:
    """Synthesizes a complete court-ready Indian pleading with statutory verification and deficit flags."""
    try:
        response = await drafting_templates_service.generate_pleading(request)
        return APIResponse(data=response, message="Court-ready pleading generated successfully.")
    except Exception as exc:
        logger.error("pleading_generation_failed", error=str(exc), template=request.template_id)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate court pleading: {str(exc)}",
        )


@router.post("/audit-deficits", response_model=APIResponse[AuditDeficitsResponse])
async def audit_deficits(
    request: AuditDeficitsRequest,
    user: CurrentUser,
) -> APIResponse[AuditDeficitsResponse]:
    """Audits text or HTML draft against mandatory statutory requirements for deficits."""
    deficits = deficit_guard_service.scan_deficits(
        text_or_html=request.text_or_html,
        template_id=request.template_id.value,
    )
    words = len(re.findall(r"\w+", request.text_or_html))
    clean_ratio = 1.0 if not deficits else max(0.0, round(1.0 - (len(deficits) * 0.15), 2))
    return APIResponse(
        data=AuditDeficitsResponse(deficits=deficits, clean_ratio=clean_ratio),
        message=f"Audit completed: {len(deficits)} missing variables flagged.",
    )


@router.post("/export-docx")
async def export_court_docx(
    request: DocxExportRequest,
) -> StreamingResponse:
    """Exports an HTML court pleading into a registry-compliant .docx paper-book."""
    try:
        docx_stream = docx_export_service.compile_court_paper_book(request)
        clean_filename = re.sub(r"[^a-zA-Z0-9_\-\.]+", "_", request.document_title.strip()) or "Court_Pleading"
        if not clean_filename.lower().endswith(".docx"):
            clean_filename += ".docx"

        headers = {
            "Content-Disposition": f'attachment; filename="{clean_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers,
        )
    except Exception as exc:
        logger.error("docx_export_failed", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compile court .docx paper-book: {str(exc)}",
        )

