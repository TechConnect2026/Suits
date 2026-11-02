"""API router for Pillar 2: Strategic Adversarial Intelligence & Argument Builder."""

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Response
import structlog

from app.dependencies.auth import CurrentUser, DbSession
from app.repositories.document_repository import DocumentRepository
from app.schemas.adversarial import (
    AdversarialExportRequest,
    InterimStayRequest,
    InterimStayResponse,
    OppositionMatrixRequest,
    OppositionMatrixResponse,
    WeaknessRadarRequest,
    WeaknessRadarResponse,
)
from app.schemas.common import APIResponse
from app.services.adversarial_service import adversarial_service
from app.services.document_processor import DocumentProcessor
from app.services.weakness_radar_service import weakness_radar_service

logger = structlog.get_logger()

router = APIRouter(prefix="/adversarial", tags=["Strategic Adversarial Intelligence"])


async def _resolve_document_text(
    doc_id: Optional[str],
    user_id: uuid.UUID,
    db: DbSession,
    fallback_text: Optional[str] = None,
) -> str:
    """Helper to resolve document text from vault if document_id is provided."""
    if fallback_text and fallback_text.strip():
        return fallback_text

    if not doc_id:
        return fallback_text or ""

    try:
        doc_uuid = uuid.UUID(doc_id)
        repo = DocumentRepository(db)
        doc = await repo.get_by_id(doc_uuid)
        if not doc or doc.user_id != user_id:
            raise HTTPException(status_code=404, detail="Document not found in user vault.")

        file_path = Path(doc.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Stored document file not found on disk.")

        processor = DocumentProcessor(db)
        file_bytes = file_path.read_bytes()
        extracted_text, _ = await processor.extract_text(file_bytes, doc.mime_type, doc.original_filename)
        return extracted_text
    except HTTPException:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=f"Invalid document UUID: {val_err}")
    except Exception as exc:
        logger.error("resolve_document_text_error", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to read vault document: {str(exc)}")


@router.post("/matrix", response_model=APIResponse[OppositionMatrixResponse])
async def generate_opposition_matrix(
    req: OppositionMatrixRequest,
    user: CurrentUser,
    db: DbSession,
) -> APIResponse[OppositionMatrixResponse]:
    """Generates the 4-Column Bilateral Opposition Strategy Matrix."""
    try:
        resolved_text = await _resolve_document_text(req.document_id, user.id, db, req.raw_text)
        req.raw_text = resolved_text
        matrix = await adversarial_service.generate_matrix(req)
        return APIResponse(data=matrix, message="Bilateral opposition strategy matrix generated successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("generate_matrix_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to generate opposition matrix: {str(exc)}")


@router.post("/interim-stay", response_model=APIResponse[InterimStayResponse])
async def analyze_interim_stay(
    req: InterimStayRequest,
    user: CurrentUser,
    db: DbSession,
) -> APIResponse[InterimStayResponse]:
    """Evaluates urgent interim stay / injunction under the 3-Prong Judicial Standard."""
    try:
        resolved_text = await _resolve_document_text(req.document_id, user.id, db, req.raw_text)
        req.raw_text = resolved_text
        stay_res = await adversarial_service.analyze_interim_stay(req)
        return APIResponse(data=stay_res, message="Interim stay assessment completed successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("analyze_interim_stay_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to analyze interim stay: {str(exc)}")


@router.post("/weakness-radar", response_model=APIResponse[WeaknessRadarResponse])
async def scan_weakness_radar(
    req: WeaknessRadarRequest,
    user: CurrentUser,
    db: DbSession,
) -> APIResponse[WeaknessRadarResponse]:
    """Scans pleading for statutory bars, evidentiary gaps, and registry defects."""
    try:
        resolved_text = await _resolve_document_text(req.document_id, user.id, db, req.raw_text)
        if not resolved_text.strip():
            raise HTTPException(status_code=400, detail="No document text provided for weakness radar scan.")

        radar_res = await weakness_radar_service.scan_pleading(
            text=resolved_text,
            court_level=req.court_level or "High Court",
        )
        return APIResponse(data=radar_res, message="Procedural weakness radar scan completed.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("weakness_radar_scan_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to scan procedural weaknesses: {str(exc)}")


@router.post("/export-brief")
async def export_adversarial_brief(
    req: AdversarialExportRequest,
    user: CurrentUser,
) -> Response:
    """Exports full Adversarial Strategy Brief into a registry-compliant .docx paper-book."""
    try:
        docx_bytes = adversarial_service.export_docx_brief(req)
        safe_title = "".join(c for c in req.case_title if c.isalnum() or c in (" ", "_", "-")).rstrip()
        filename = f"{safe_title or 'Adversarial_Brief'}_Strategy_PaperBook.docx"

        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        logger.error("export_adversarial_brief_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to export adversarial brief: {str(exc)}")

