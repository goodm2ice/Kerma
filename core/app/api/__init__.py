from .auth import router as auth_router
from .editions import router as editions_router
from .sources import router as sources_router
from .system import router as system_router

__all__ = ["auth_router", "editions_router", "sources_router", "system_router"]
