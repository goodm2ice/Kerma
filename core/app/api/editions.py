from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response

from ..schemas import BuildEditionRequest, DeleteResult, MetadataPayload
from ..services import CatalogService
from .deps import get_catalog_service, require_auth

router = APIRouter(prefix="/api/editions", tags=["editions"])


@router.get("")
async def list_editions(_: object = Depends(require_auth), svc: CatalogService = Depends(get_catalog_service)):
    return svc.get_editions()


@router.post("/upload")
async def upload_edition(
    file: UploadFile = File(...),
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.upload_edition(file)


@router.post("/build")
async def build_edition(
    payload: BuildEditionRequest,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.build_edition(payload)


@router.put("/{edition_path:path}/metadata")
async def update_metadata(
    edition_path: str,
    payload: MetadataPayload,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.update_edition_metadata(edition_path, payload)


@router.get("/{edition_path:path}/images/{image_path:path}")
async def get_edition_image(
    edition_path: str,
    image_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    content, media_type = svc.get_edition_image(edition_path, image_path)
    return Response(content=content, media_type=media_type)


@router.get("/{edition_path:path}/preview")
async def get_edition_preview(
    edition_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    content, media_type = svc.get_edition_preview(edition_path)
    return Response(content=content, media_type=media_type)


@router.get("/{edition_path:path}")
async def get_edition(
    edition_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return svc.get_edition_content(edition_path)


@router.delete("/{edition_path:path}", response_model=DeleteResult)
async def delete_edition(
    edition_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    await svc.delete_edition(edition_path)
    return DeleteResult(deleted=True, target=edition_path)
