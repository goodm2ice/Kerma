from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse

from ..schemas import CreateChapterRequest, DeleteResult, RenameDirectoryRequest, RenameFileRequest, UploadDirectoryResponse
from ..services import CatalogService
from .deps import get_catalog_service, require_auth

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("")
async def list_sources(_: object = Depends(require_auth), svc: CatalogService = Depends(get_catalog_service)):
    return svc.get_sources()


@router.post("/upload", response_model=UploadDirectoryResponse)
async def upload_source_directory(
    directory_name: str = Form(...),
    files: list[UploadFile] = File(...),
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.upload_source_directory(directory_name=directory_name, files=files)


@router.post("/{source_path:path}/chapters")
async def create_source_chapter(
    source_path: str,
    payload: CreateChapterRequest,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.create_source_chapter(source_path, payload.name)


@router.post("/{source_path:path}/chapters/upload", response_model=UploadDirectoryResponse)
async def upload_source_chapter_files(
    source_path: str,
    chapter_path: str = Form(...),
    files: list[UploadFile] = File(...),
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.upload_source_chapter_files(source_path, chapter_path, files)


@router.get("/{source_path:path}/files/{file_path:path}")
async def get_source_file(
    source_path: str,
    file_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    file, media_type = svc.get_source_file(source_path, file_path)
    return FileResponse(file, media_type=media_type, filename=file.name)


@router.delete("/{source_path:path}/files/{file_path:path}", response_model=DeleteResult)
async def delete_source_file(
    source_path: str,
    file_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    await svc.delete_source_file(source_path, file_path)
    return DeleteResult(deleted=True, target=file_path)


@router.post("/{source_path:path}/files/rename")
async def rename_source_file(
    payload: RenameFileRequest,
    source_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.rename_source_file(source_path, payload.source_path, payload.new_name)


@router.post("/{source_path:path}/rename")
async def rename_source(
    source_path: str,
    payload: RenameDirectoryRequest,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    return await svc.rename_source_directory(source_path, payload.new_name)


@router.delete("/{source_path:path}", response_model=DeleteResult)
async def delete_source(
    source_path: str,
    _: object = Depends(require_auth),
    svc: CatalogService = Depends(get_catalog_service),
):
    await svc.delete_source_directory(source_path)
    return DeleteResult(deleted=True, target=source_path)
