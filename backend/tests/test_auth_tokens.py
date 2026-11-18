"""Unit tests for JWT token generation, expiration, validation, and refresh."""

import unittest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.core.exceptions import UnauthorizedError
from app.services.auth_service import AuthService
from app.models.user import User


class TestAuthTokens(unittest.TestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        self.user_str = str(self.user_id)

    def test_access_token_creation_and_decode(self):
        token = create_access_token({"sub": self.user_str})
        payload = decode_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], self.user_str)
        self.assertEqual(payload["type"], "access")

    def test_refresh_token_creation_and_decode(self):
        token = create_refresh_token({"sub": self.user_str})
        payload = decode_refresh_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], self.user_str)
        self.assertEqual(payload["type"], "refresh")

    def test_access_token_rejects_refresh_token_type(self):
        refresh_token = create_refresh_token({"sub": self.user_str})
        # Attempting to decode refresh token as access token must return None
        payload = decode_access_token(refresh_token)
        self.assertIsNone(payload)

    def test_refresh_token_rejects_access_token_type(self):
        access_token = create_access_token({"sub": self.user_str})
        # Attempting to decode access token as refresh token must return None
        payload = decode_refresh_token(access_token)
        self.assertIsNone(payload)

    def test_expired_token_returns_none(self):
        from jose import jwt
        from app.core.config import settings

        # Create already-expired token
        past_exp = datetime.now(timezone.utc) - timedelta(minutes=5)
        expired_token = jwt.encode(
            {"sub": self.user_str, "exp": past_exp, "type": "access"},
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
        self.assertIsNone(decode_access_token(expired_token))

    def test_refresh_tokens_with_invalid_uuid_subject(self):
        import asyncio
        from jose import jwt
        from app.core.config import settings

        # Create refresh token with a non-UUID subject
        bad_token = jwt.encode(
            {"sub": "not-a-valid-uuid", "exp": datetime.now(timezone.utc) + timedelta(days=1), "type": "refresh"},
            settings.jwt_refresh_secret,
            algorithm=settings.jwt_algorithm,
        )

        mock_db = AsyncMock()
        service = AuthService(mock_db)

        async def run_test():
            with self.assertRaises(UnauthorizedError) as ctx:
                await service.refresh_tokens(bad_token)
            self.assertIn("Invalid token subject", str(ctx.exception.detail))

        asyncio.run(run_test())

    def test_refresh_tokens_success(self):
        import asyncio

        valid_refresh_token = create_refresh_token({"sub": self.user_str})

        mock_db = AsyncMock()
        mock_user = User(
            id=self.user_id,
            email="lawyer@example.com",
            full_name="Harvey Specter",
            password_hash="hash",
            is_verified=True,
        )

        service = AuthService(mock_db)
        service.repo.get_by_id = AsyncMock(return_value=mock_user)

        async def run_test():
            res = await service.refresh_tokens(valid_refresh_token)
            self.assertIsNotNone(res.access_token)
            self.assertIsNotNone(res.refresh_token)

            # Validate new access token
            payload = decode_access_token(res.access_token)
            self.assertEqual(payload["sub"], self.user_str)

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
