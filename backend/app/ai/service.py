"""OpenAI service for generating player descriptions."""

from decimal import Decimal
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings
from app.models.player import Player

# Initialize OpenAI client
_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client instance."""
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _format_stat(value: Optional[int | Decimal], suffix: str = "") -> str:
    """Format a stat value for display."""
    if value is None:
        return "N/A"
    if isinstance(value, Decimal):
        return f"{float(value):.3f}{suffix}"
    return f"{value}{suffix}"


def _build_player_prompt(player: Player) -> str:
    """Build prompt for player description generation.

    Args:
        player: Player object with stats.

    Returns:
        Formatted prompt string.
    """
    stats_text = f"""
Player: {player.player_name}
Position: {player.position or 'Unknown'}

Statistics:
- Games: {_format_stat(player.games)}
- At Bats: {_format_stat(player.at_bats)}
- Runs: {_format_stat(player.runs)}
- Hits: {_format_stat(player.hits)}
- Doubles: {_format_stat(player.doubles)}
- Triples: {_format_stat(player.triples)}
- Home Runs: {_format_stat(player.home_runs)}
- RBIs: {_format_stat(player.rbis)}
- Walks: {_format_stat(player.walks)}
- Strikeouts: {_format_stat(player.strikeouts)}
- Stolen Bases: {_format_stat(player.stolen_bases)}
- Caught Stealing: {_format_stat(player.caught_stealing)}
- Batting Average: {_format_stat(player.batting_average)}
- On-Base Percentage: {_format_stat(player.on_base_percentage)}
- Slugging Percentage: {_format_stat(player.slugging_percentage)}
- OPS: {_format_stat(player.ops)}
"""
    return stats_text.strip()


async def generate_player_description(
    player: Player,
    model: str = "gpt-4o-mini",
) -> dict:
    """Generate an AI description for a player based on their stats.

    Args:
        player: Player object with statistics.
        model: OpenAI model to use.

    Returns:
        Dictionary with description content, model used, tokens, and cost.

    Raises:
        ValueError: If OpenAI API key not configured.
        OpenAI errors: If API call fails.
    """
    client = get_openai_client()

    system_prompt = """You are a baseball analyst and sports writer. Generate engaging,
insightful descriptions of baseball players based on their statistics. Your descriptions
should be 2-3 paragraphs and should:
1. Highlight the player's strengths based on their stats
2. Provide context about what the numbers mean
3. Be written in an engaging, sports-journalism style
4. Avoid speculation about things not reflected in the stats
5. Be factual and based only on the provided statistics"""

    player_prompt = _build_player_prompt(player)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Generate a description for this player:\n\n{player_prompt}",
            },
        ],
        temperature=0.7,
        max_tokens=500,
    )

    content = response.choices[0].message.content or ""
    tokens_used = response.usage.total_tokens if response.usage else 0

    # Estimate cost (gpt-4o-mini pricing as of late 2024)
    # Input: $0.15 per 1M tokens, Output: $0.60 per 1M tokens
    # Simplified: average ~$0.30 per 1M tokens
    cost_usd = Decimal(str(tokens_used * 0.0000003))

    return {
        "content": content,
        "model_used": model,
        "tokens_used": tokens_used,
        "cost_usd": cost_usd,
    }
