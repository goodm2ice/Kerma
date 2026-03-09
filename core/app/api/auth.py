from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from ..config import get_settings
from ..schemas import AuthProvidersResponse, LoginRequest, LogoutResponse, UserResponse
from ..services import AuthService
from .deps import (
    get_auth_service,
    get_optional_current_user,
    issue_auth_cookie,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/providers", response_model=AuthProvidersResponse)
async def auth_providers(request: Request) -> AuthProvidersResponse:
    settings = get_settings()
    next_url = str(request.base_url).rstrip("/")
    return AuthProvidersResponse(
        sso_enabled=settings.sso_enabled,
        sso_login_url=f"/api/auth/sso/login?next={next_url}",
    )


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, response: Response, auth: AuthService = Depends(get_auth_service)) -> UserResponse:
    user = auth.authenticate_local(payload.login, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login or password.")

    issue_auth_cookie(response, auth, user)
    return UserResponse(login=user.login, role=user.role, source=user.source)


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_optional_current_user)) -> UserResponse:
    return UserResponse(login=user.login, role=user.role, source=user.source)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    user=Depends(get_optional_current_user),
) -> LogoutResponse:
    settings = get_settings()
    response.delete_cookie(settings.auth_cookie_name, path="/", httponly=True, samesite="lax")
    redirect_url = settings.sso_logout_url if user.source == "sso" else None
    return LogoutResponse(logged_out=True, redirect_url=redirect_url)


@router.get("/sso/login", name="sso_login")
async def sso_login(
    request: Request,
    next: str = Query(default="/"),
    auth: AuthService = Depends(get_auth_service),
):
    try:
        user = auth.authenticate_sso_request(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if user is not None:
        redirect = RedirectResponse(next, status_code=status.HTTP_303_SEE_OTHER)
        issue_auth_cookie(redirect, auth, user)
        return redirect

    if not auth.settings.sso_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SSO is disabled.")

    if auth.settings.sso_login_url:
        return RedirectResponse(auth.build_sso_redirect(request, next), status_code=status.HTTP_303_SEE_OTHER)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SSO headers are missing.")
