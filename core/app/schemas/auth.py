from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    login: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    login: str
    role: str
    source: str


class AuthProvidersResponse(BaseModel):
    password_enabled: bool = True
    sso_enabled: bool
    sso_login_url: str
    sso_label: str = "SSO"


class LogoutResponse(BaseModel):
    logged_out: bool = True
    redirect_url: str | None = None
