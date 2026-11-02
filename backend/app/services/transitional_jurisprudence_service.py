"""Transitional Jurisprudence Service.

Provides access to curated landmark Supreme Court and High Court authorities
resolving criminal era transition questions (e.g., Section 479 undertrials, Section 187 custody).
"""

from typing import List, Optional

import structlog

from app.data.transitional_jurisprudence_db import TRANSITIONAL_JURISPRUDENCE_RECORDS
from app.schemas.era_transition import (
    TransitionalJurisprudenceItem,
    TransitionalJurisprudenceResponse,
)

logger = structlog.get_logger()


class TransitionalJurisprudenceService:
    """Service for querying transitional jurisprudence rulings."""

    def list_jurisprudence(
        self,
        topic: Optional[str] = None,
        query: Optional[str] = None,
    ) -> TransitionalJurisprudenceResponse:
        """Retrieves transitional cases with optional topic or textual filter."""
        items: List[TransitionalJurisprudenceItem] = []

        q = (query or "").lower().strip()
        t = (topic or "").lower().strip()

        for rec in TRANSITIONAL_JURISPRUDENCE_RECORDS:
            # Topic filter
            if t and t not in rec["topic_category"].lower():
                continue

            # Text query filter
            if q:
                matchable = f"{rec['case_title']} {rec['citation']} {rec['core_holding']} {rec['topic_category']} {rec['court']}".lower()
                if q not in matchable:
                    continue

            items.append(TransitionalJurisprudenceItem(**rec))

        return TransitionalJurisprudenceResponse(
            total_count=len(items),
            items=items,
        )


transitional_jurisprudence_service = TransitionalJurisprudenceService()

