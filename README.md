# Sevgi Bot

## Backend (bot + API)
cd backend
cp .env.example .env  # fill BOT_TOKEN, SUPABASE_*, ALLOWED_ORIGINS
pip install -r requirements.txt

# Run bot only:
python bot.py

# Run API only:
uvicorn api:app --reload --port 8000
# Docs: http://localhost:8000/docs

## Frontend
cd xotiralar3d
cp .env.example .env.local  # set VITE_API_BASE_URL
npm install && npm run dev

## Deploy
- Frontend on HTTPS (Netlify) requires backend over HTTPS too.
- Set ALLOWED_ORIGINS to your deployed frontend origin.
