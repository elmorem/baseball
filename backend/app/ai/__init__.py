"""AI module for OpenAI integration."""

from app.ai.router import router as ai_router
from app.ai.service import generate_player_description

__all__ = ["ai_router", "generate_player_description"]
