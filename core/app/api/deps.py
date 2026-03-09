from fastapi import Depends, HTTPException, Request, Response, status

from ..config import get_settings
from ..services import AuthService, CatalogService
from ..services.auth import AuthUser


def get_catalog_service(request: Request) -> CatalogService:
    return request.app.state.catalog_service


def get_auth_service(request: Request) -> AuthService:
    return request.app.state.auth_service


def issue_auth_cookie(response: Response, auth: AuthService, user: AuthUser) -> None:
    response.set_cookie(
        key=auth.settings.auth_cookie_name,
        value=auth.create_session_token(user),
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
        max_age=auth.settings.auth_session_ttl_hours * 3600,
    )


async def get_optional_current_user(
    request: Request,
    response: Response,
    auth: AuthService = Depends(get_auth_service),
) -> AuthUser:
    token = request.cookies.get(auth.settings.auth_cookie_name)
    if token:
        user = auth.parse_session_token(token)
        if user is not None:
            return user

    try:
        user = auth.authenticate_sso_request(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if user is not None:
        issue_auth_cookie(response, auth, user)
        return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")


async def require_auth(user: AuthUser = Depends(get_optional_current_user)) -> AuthUser:
    return user
