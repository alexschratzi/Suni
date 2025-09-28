import asyncio
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Literal
from uuid import uuid4

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModela

# ------------------------------
# Config / Minimal "database"
# ------------------------------

# In memory stores (replace with Postgres/Redis in production)
SESSIONS: Dict[str, dict] = {}      # session_id -> { university_id, program_id, redirect_uri, status, cookies? }
CONNECTIONS: Dict[str, dict] = {}   # connection_id -> { university_id, program_id, cookies, created_at }

# Program catalog the server understands.
# You can enrich this from your real DB later.
PROGRAMS = {
    # program_id: { "loginURL": "...", "authType": "saml"|"cas"|"cookie"|"oauth2" }
    1231: {
        "loginURL": "https://login.fh-salzburg.ac.at",
        "authType": "saml",  # assumption; adjust once verified
    }
}

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")  # public base URL of this service (used for auth urls)

# ------------------------------
# FastAPI 
# ------------------------------
app = FastAPI(title="University Connectors — Auth Relay")

# CORS (dev-friendly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock this down in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Models
# ------------------------------

class StartPayload(BaseModel):
    university_id: int
    program_id: int
    redirect_uri: str

class CompletePayload(BaseModel):
    session_id: str
    university_id: int
    program_id: int

# ------------------------------
# Utilities
# ------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def cookies_to_cookiejar(playwright_cookies: List[dict]) -> Dict[str, List[dict]]:
    """
    Convert Playwright cookies (domain, name, value, expires (epoch), path, httpOnly, secure, sameSite)
    into a grouped jar: domain -> [cookie]
    """
    jar: Dict[str, List[dict]] = {}
    for c in playwright_cookies:
        domain = c.get("domain", "").lstrip(".")
        if not domain:
            # fallback: unknown domain
            domain = "unknown"
        cookie = {
            "name": c.get("name"),
            "value": c.get("value"),
            "path": c.get("path") or "/",
            "expires": (
                datetime.fromtimestamp(c["expires"], tz=timezone.utc).isoformat()
                if c.get("expires") and isinstance(c["expires"], (float, int)) and c["expires"] > 0
                else None
            ),
            "httpOnly": bool(c.get("httpOnly")),
            "secure": bool(c.get("secure")),
            "sameSite": c.get("sameSite") if c.get("sameSite") in ("Lax", "Strict", "None") else None,
        }
        jar.setdefault(domain, []).append(cookie)
    return jar

# ------------------------------
# Routes
# ------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "time": now_iso()}

@app.post("/auth/start")
def auth_start(p: StartPayload):
    # Validate program
    program = PROGRAMS.get(p.program_id)
    if not program:
        raise HTTPException(status_code=400, detail="Unknown program_id")
    # Create ephemeral auth session
    session_id = str(uuid4())
    SESSIONS[session_id] = {
        "university_id": p.university_id,
        "program_id": p.program_id,
        "redirect_uri": p.redirect_uri,
        "status": "awaiting_credentials",
        "created_at": now_iso(),
    }
    # Relay page (user enters credentials -> server performs login headlessly)
    auth_url = f"{BASE_URL}/auth/relay?session_id={session_id}"
    return {"session_id": session_id, "auth_url": auth_url}

@app.get("/auth/relay")
def auth_relay(session_id: str):
    sess = SESSIONS.get(session_id)
    if not sess:
        return HTMLResponse("<h3>Invalid session</h3>", status_code=400)

    program = PROGRAMS.get(sess["program_id"]) or {}
    login_url = program.get("loginURL", "")
    host = login_url.split("/")[2] if "://" in login_url else login_url

    # Very simple HTML form that *posts credentials to the server*.
    # The server will use Playwright to perform the login against login_url.
    # NOTE: This means credentials pass through your server; store NOTHING beyond the login attempt.
    html = f"""
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Hochschul-Login</title>
        <style>
          body {{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }}
          .card {{ max-width: 420px; margin: 16px auto; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }}
          .title {{ font-size: 18px; font-weight: 600; margin-bottom: 8px; }}
          .sub {{ color: #6b7280; font-size: 14px; margin-bottom: 16px; }}
          label {{ display:block; font-size: 14px; margin-top: 12px; }}
          input {{ width:100%; padding:10px; border:1px solid #d1d5db; border-radius:8px; margin-top:6px; }}
          button {{ margin-top: 16px; width: 100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:10px; font-weight:600; }}
          .hint {{ font-size: 12px; color:#6b7280; margin-top: 8px; }}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">Anmeldung bei: {host}</div>
          <div class="sub">Geben Sie Ihre Zugangsdaten ein. Ihre Daten werden ausschließlich zur Anmeldung genutzt und nicht gespeichert.</div>
          <form method="POST" action="/auth/perform">
            <input type="hidden" name="session_id" value="{session_id}" />
            <label>Benutzername</label>
            <input type="text" name="username" placeholder="z.B. fhsxxxxx" required />
            <label>Passwort</label>
            <input type="password" name="password" placeholder="••••••••" required />
            <label>2FA / MFA (falls erforderlich)</label>
            <input type="text" name="mfa_code" placeholder="z.B. 123456" />
            <button type="submit">Anmelden</button>
            <div class="hint">Nach erfolgreicher Anmeldung werden Sie automatisch zur App zurückgeleitet.</div>
          </form>
        </div>
      </body>
    </html>
    """
    return HTMLResponse(html)

@app.post("/auth/perform")
async def auth_perform(
    session_id: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    mfa_code: Optional[str] = Form(None),
):
    """
    Performs a server-side login using Playwright headless Chromium.
    This example includes a conservative "generic" flow + a specific flow for FH Salzburg
    with selectors you can refine once you inspect the real DOM.
    """
    sess = SESSIONS.get(session_id)
    if not sess:
        return HTMLResponse("<h3>Invalid session</h3>", status_code=400)

    program = PROGRAMS.get(sess["program_id"]) or {}
    login_url = program.get("loginURL")
    if not login_url:
        return HTMLResponse("<h3>Unknown login URL</h3>", status_code=400)

    # mark in-progress
    sess["status"] = "auth_in_progress"

    # Lazy import to speed cold start less
    try:
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout
    except Exception as e:
        sess["status"] = f"playwright_import_error: {e}"
        return HTMLResponse("<h3>Server error (Playwright not installed)</h3>", status_code=500)

    async def perform_login() -> List[dict]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()

            try:
                # 1) Go to login page
                await page.goto(login_url, wait_until="domcontentloaded", timeout=30000)

                # 2) Try generic username/password selectors first
                #    (Refine with exact selectors after first inspection)
                # common username selectors
                username_selectors = [
                    'input[name="username"]',
                    'input[id="username"]',
                    'input[type="email"]',
                    'input[type="text"]',
                ]
                pw_selectors = [
                    'input[name="password"]',
                    'input[id="password"]',
                    'input[type="password"]',
                ]
                submit_selectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button:has-text("Login")',
                    'button:has-text("Anmelden")',
                    'button:has-text("Sign in")',
                ]

                # Fill username
                filled_user = False
                for sel in username_selectors:
                    if await page.locator(sel).first.is_visible(timeout=1000).catch(lambda _: False):  # type: ignore
                        await page.fill(sel, username)
                        filled_user = True
                        break
                if not filled_user:
                    # FH Salzburg (guess) – refine selectors here once known:
                    await page.fill('#username', username)

                # Fill password
                filled_pw = False
                for sel in pw_selectors:
                    try:
                        await page.fill(sel, password, timeout=1000)
                        filled_pw = True
                        break
                    except Exception:
                        pass
                if not filled_pw:
                    await page.fill('#password', password)

                # Click submit
                clicked = False
                for sel in submit_selectors:
                    try:
                        await page.click(sel, timeout=1000)
                        clicked = True
                        break
                    except Exception:
                        pass
                if not clicked:
                    # Fallback: press Enter in password field
                    await page.keyboard.press("Enter")

                # 3) Handle possible MFA step (simple OTP code field)
                if mfa_code:
                    otp_selectors = [
                        'input[name="otp"]',
                        'input[name="mfa"]',
                        'input[id="otp"]',
                        'input[id="mfa"]',
                        'input[type="tel"]',
                        'input[autocomplete="one-time-code"]',
                    ]
                    # wait a bit for the MFA field to appear
                    try:
                        await page.wait_for_timeout(1000)
                        for sel in otp_selectors:
                            loc = page.locator(sel).first
                            try:
                                if await loc.is_visible(timeout=500):
                                    await loc.fill(mfa_code)
                                    # submit again
                                    for s2 in submit_selectors:
                                        try:
                                            await page.click(s2, timeout=500)
                                            break
                                        except Exception:
                                            pass
                                    break
                            except Exception:
                                pass
                    except Exception:
                        pass

                # 4) Wait for navigation / session set; heuristics
                #    Either URL changes to a post-login area or cookies appear.
                try:
                    await page.wait_for_load_state("networkidle", timeout=10000)
                except PWTimeout:
                    # proceed anyway and inspect cookies
                    pass

                cookies = await context.cookies()
                await browser.close()
                return cookies

            except Exception:
                try:
                    await browser.close()
                except Exception:
                    pass
                raise

    try:
        cookies = await perform_login()
    except Exception as e:
        sess["status"] = f"login_failed: {e}"
        # Show a simple error page; in prod you might redirect back with error details
        return HTMLResponse(f"<h3>Login fehlgeschlagen</h3><p>{e}</p>", status_code=500)

    # Success: store cookies jar
    jar = cookies_to_cookiejar(cookies)
    sess["cookies"] = jar
    sess["status"] = "auth_success"

    # Redirect back to the app (AuthSession return URL) with session_id
    redirect_uri = sess["redirect_uri"]
    url = f"{redirect_uri}?session_id={session_id}"
    return RedirectResponse(url)

@app.post("/connections/complete")
def connections_complete(p: CompletePayload):
    sess = SESSIONS.get(p.session_id)
    if not sess:
        return JSONResponse({"error": "invalid_session"}, status_code=400)
    if sess.get("status") != "auth_success":
        return JSONResponse({"error": "auth_not_complete", "status": sess.get("status")}, status_code=400)

    connection_id = str(uuid4())
    CONNECTIONS[connection_id] = {
        "university_id": p.university_id,
        "program_id": p.program_id,
        "cookies": sess.get("cookies"),
        "created_at": now_iso(),
    }
    # Optionally: clear session after promoting to connection
    # SESSIONS.pop(p.session_id, None)
    return {"connection_id": connection_id, "status": "ready"}

@app.get("/connections/{connection_id}/status")
def connection_status(connection_id: str):
    conn = CONNECTIONS.get(connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="not_found")
    return {
        "connection_id": connection_id,
        "status": "ready",
        "created_at": conn["created_at"],
        "domains": list((conn.get("cookies") or {}).keys()),
    }
