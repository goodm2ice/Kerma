from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth_router, editions_router, sources_router, system_router
from .config import get_settings
from .services import AuthService, CatalogService


def create_app() -> FastAPI:
    settings = get_settings()
    stop_event = asyncio.Event()
    service = CatalogService(settings)
    auth_service = AuthService(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.catalog_service = service
        app.state.auth_service = auth_service
        await service.scan()
        task = asyncio.create_task(service.periodic_scan(stop_event))
        try:
            yield
        finally:
            stop_event.set()
            await task

    app = FastAPI(
        docs_url='/api/docs',
        redoc_url='/api/redoc',
        openapi_url='/api/v1/openapi.json',
        title=settings.app_name,
        lifespan=lifespan
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(system_router)
    app.include_router(sources_router)
    app.include_router(editions_router)

    return app


app = create_app()
