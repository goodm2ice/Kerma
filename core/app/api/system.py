from fastapi import APIRouter, Depends, HTTPException, status

from ..config import Settings, get_settings
from ..services import CatalogService
from .deps import get_catalog_service, require_auth

router = APIRouter(prefix="/api")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/scan/{target}")
async def rescan(
    target: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
) -> dict[str, str]:
    if target not in {"sources", "editions"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown scan target.")
    await svc.scan(target)
    return {"status": "rescanned"}


@router.get("/lookups/{lookup_name}")
async def lookup(
    lookup_name: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return svc.get_lookup_values(lookup_name)


@router.get("/config")
async def config_snapshot(_: object = Depends(require_auth), current: Settings = Depends(get_settings)):
    return {
        "sources_dir": str(current.sources_dir),
        "editions_dir": str(current.editions_dir),
        "config_dir": str(current.config_dir),
        "scan_interval_seconds": current.scan_interval_seconds,
        "database_path": str(current.database_path),
        "sso_enabled": current.sso_enabled,
    }
