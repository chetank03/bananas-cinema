# Bananas Cinema

Bananas Cinema is a React + Django web application for discovering movies and TV shows with data from TMDb.

## Features

- TMDb-backed home sections for trending, popular movies, popular TV, and upcoming releases
- Search by title with media type, genre, and year filters
- Detailed title drawer with cast, crew, and trailer links
- Review storage in Django with a Postgres-ready model
- Local favorites support in the frontend

## Architecture

- `frontend/`: React + Vite client
- `backend/`: Django REST API

## Backend setup

1. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Copy the environment template and fill in your secrets:

```bash
cp .env.example .env
```

3. Run migrations and start the API:

```bash
python manage.py migrate
python manage.py runserver
```

## Frontend setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Copy the frontend environment template:

```bash
cp .env.example .env
```

3. Start the frontend:

```bash
npm run dev
```

## Railway deploy

Create three Railway services in the same project:

- `Postgres`
- `backend` with root directory `backend`
- `frontend` with root directory `frontend`

Backend service:

- Build command:

```bash
pip install -r requirements.txt && python manage.py migrate
```

- Start command:

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

- Required variables:

```env
SECRET_KEY=replace-me
DEBUG=False
ALLOWED_HOSTS=.railway.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.up.railway.app
CSRF_TRUSTED_ORIGINS=https://your-backend-domain.up.railway.app
TMDB_API_KEY=replace-me
FIREBASE_PROJECT_ID=bananas-cinema
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
```

Frontend service:

- Build command:

```bash
npm ci && npm run build
```

- Start command:

```bash
npx serve -s dist -l $PORT
```

- Required variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.up.railway.app/api
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```
