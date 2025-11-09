import json
import os
from functools import lru_cache

from fastapi import Depends, HTTPException, Header, status

try:
    import firebase_admin
    from firebase_admin import auth, credentials
except ImportError as exc:  # pragma: no cover - for environments without firebase_admin
    firebase_admin = None
    auth = None
    credentials = None
    raise exc


class FirebaseNotConfigured(Exception):
    """Raised when Firebase service account is not configured."""


@lru_cache(maxsize=1)
def initialize_firebase_app():
    if not firebase_admin:
        raise FirebaseNotConfigured('firebase_admin library is not installed')

    if firebase_admin._apps:  # type: ignore[attr-defined]
        return firebase_admin.get_app()  # type: ignore[attr-defined]

    service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT')
    if not service_account_json:
        raise FirebaseNotConfigured('FIREBASE_SERVICE_ACCOUNT env var is not set')

    try:
        credentials_info = json.loads(service_account_json)
    except json.JSONDecodeError as exc:
        raise FirebaseNotConfigured('FIREBASE_SERVICE_ACCOUNT is not valid JSON') from exc

    cred = credentials.Certificate(credentials_info)
    return firebase_admin.initialize_app(cred)


def get_allowed_emails():
    raw = os.getenv('FIREBASE_ALLOWED_EMAILS', '')
    allowed = [email.strip().lower() for email in raw.split(',') if email.strip()]
    return set(allowed)


async def verify_firebase_token(authorization: str = Header(..., alias='Authorization')):
    try:
        initialize_firebase_app()
    except FirebaseNotConfigured as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing or invalid Authorization header')

    id_token = authorization.split(' ', 1)[1].strip()
    if not id_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing Firebase ID token')

    try:
        decoded_token = auth.verify_id_token(id_token)  # type: ignore[call-arg]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Invalid Firebase ID token: {exc}') from exc

    email = (decoded_token.get('email') or '').lower()
    allowed_emails = get_allowed_emails()
    if allowed_emails and email not in allowed_emails:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is not authorized to perform this action')

    return decoded_token
