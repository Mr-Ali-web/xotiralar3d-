import hashlib
import hmac
import os
import urllib.parse
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY else None

app = FastAPI(title="Sevgi Bot API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=False)


def validate_init_data(init_data: str) -> dict:
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="BOT_TOKEN not configured")
    params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    received_hash = params.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="missing hash")
    data_check_string = "\n".join(f"{k}={params[k]}" for k in sorted(params))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(computed, received_hash):
        raise HTTPException(status_code=401, detail="invalid initData")
    # optional freshness check
    auth_date = params.get("auth_date")
    if auth_date and (datetime.now(timezone.utc).timestamp() - int(auth_date)) > 86400:
        raise HTTPException(status_code=401, detail="initData expired")
    import json
    user = json.loads(params.get("user", "{}"))
    return user


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="missing authorization")
    return validate_init_data(creds.credentials)


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/songs")
def songs():
    if not sb:
        raise HTTPException(status_code=500, detail="supabase not configured")
    res = sb.table("songs").select("*").order("sort_order").execute()
    return res.data


@app.post("/api/wishes")
def create_wish(payload: dict, user: dict = Depends(current_user)):
    if not sb:
        raise HTTPException(status_code=500, detail="supabase not configured")
    body = (payload.get("body") or "").strip()
    if not (1 <= len(body) <= 500):
        raise HTTPException(status_code=400, detail="body must be 1-500 chars")
    user_id = user.get("id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="user not in initData")
    res = sb.table("wishes").insert({"user_id": user_id, "body": body}).execute()
    return res.data
