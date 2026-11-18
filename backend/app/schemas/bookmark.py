"""Bookmark schemas - DTOs for bookmark operations."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_serializer


class CreateBookmarkRequest(BaseModel):
    cnr: str = Field(min_length=1, max_length=64)
    title: str = "Untitled Case"


class BookmarkResponse(BaseModel):
    id: uuid.UUID | str
    cnr: str
    title: str
    bookmarked_at: datetime | str

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, v: uuid.UUID | str) -> str:
        return str(v)

    @field_serializer("bookmarked_at")
    def serialize_bookmarked_at(self, v: datetime | str) -> str:
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)
