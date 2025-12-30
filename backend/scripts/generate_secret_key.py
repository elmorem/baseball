#!/usr/bin/env python3
"""Generate a secure SECRET_KEY for the application."""

import secrets

if __name__ == "__main__":
    secret_key = secrets.token_urlsafe(32)
    print(f"Generated SECRET_KEY:\n{secret_key}")
    print("\nAdd this to your .env file:")
    print(f"SECRET_KEY={secret_key}")
