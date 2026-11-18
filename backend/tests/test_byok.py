import uuid
from app.services.encryption_service import encryption_service
from app.clients.byok_provider import _extract_json_from_text, BYOKProvider


def test_encryption_and_tampering():
    uid1 = uuid.uuid4()
    uid2 = uuid.uuid4()
    secret = "sk-ant-api03-abcdef1234567890"

    # Encrypt
    encrypted = encryption_service.encrypt_key(secret, uid1)
    assert encrypted != secret

    # Decrypt with correct user
    decrypted = encryption_service.decrypt_key(encrypted, uid1)
    assert decrypted == secret

    # Decrypt with wrong user must fail (AAD mismatch)
    failed = False
    try:
        encryption_service.decrypt_key(encrypted, uid2)
    except Exception:
        failed = True
    assert failed, "Decryption with wrong user ID should raise exception!"


def test_key_masking():
    openai_key = "sk-proj-abc123456789xyz"
    masked = encryption_service.mask_key(openai_key)
    assert masked.startswith("sk-proj-")
    assert masked.endswith("789xyz"[-4:])
    assert "abc12345" not in masked

    gemini_key = "AIzaSyDummyGeminiKey987654321"
    masked_g = encryption_service.mask_key(gemini_key)
    assert masked_g.startswith("AIzaSy")
    assert masked_g.endswith("4321")


def test_json_extraction():
    text_with_fences = 'Here is the extracted analysis:\n```json\n{"ratio": "doctrine of election", "status": "Allowed"}\n```\nHope this helps.'
    parsed = _extract_json_from_text(text_with_fences)
    assert isinstance(parsed, dict)
    assert parsed["ratio"] == "doctrine of election"
    assert parsed["status"] == "Allowed"


if __name__ == "__main__":
    test_encryption_and_tampering()
    test_key_masking()
    test_json_extraction()
    print("ALL TESTS IN test_byok.py PASSED PERFECTLY!")
