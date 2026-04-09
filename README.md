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
