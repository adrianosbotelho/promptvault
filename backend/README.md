# PromptVault Backend

FastAPI backend application following clean architecture.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure database:
   - **Option 1 (Recommended)**: Run the setup script:
     ```bash
     python setup_env.py
     ```
     This will guide you through creating the `.env` file with the correct database configuration.
   
   - **Option 2**: Manually create a `.env` file in the `backend` directory:
     ```
     DATABASE_URL=postgresql://username:password@localhost:5432/promptvault-db
     INIT_DB_ON_STARTUP=false
     SECRET_KEY=your-secret-key-here
     ```
   - **Important**: 
     - Update `DATABASE_URL` with your actual PostgreSQL credentials
     - Make sure the database name matches your Docker container (default: `promptvault-db`)
     - By default, `INIT_DB_ON_STARTUP=false` to prevent startup errors if database is not configured

3. Initialize database tables:
   - **Option 1**: Set `INIT_DB_ON_STARTUP=true` in `.env` to auto-create tables on startup
   - **Option 2**: Run manually: `python init_db.py` (recommended for first setup)

4. Run the application:

**Option 1: Using the run script (recommended)**
```bash
cd backend
python run.py
```

**Option 2: Using uvicorn directly**
```bash
cd backend
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`

## Endpoints

- `GET /` - Root endpoint
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - User login (returns JWT token)
- `GET /api/v1/openapi.json` - OpenAPI schema
- `GET /docs` - Swagger UI documentation

## Database

The application uses SQLAlchemy with PostgreSQL. The connection is configured with:
- Connection pooling (pool_size=5, max_overflow=10)
- Connection verification (pool_pre_ping=True)
- Optional automatic table creation on startup (controlled by `INIT_DB_ON_STARTUP`)

**Note**: If you see database connection errors on startup, make sure:
1. PostgreSQL is running
2. Database exists and credentials in `.env` are correct
3. Set `INIT_DB_ON_STARTUP=false` to skip auto-initialization and run `python init_db.py` manually
