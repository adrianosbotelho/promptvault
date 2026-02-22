# PromptVault

A modern web application for managing, versioning, and improving AI prompts with clean architecture and AI-powered enhancements.

## 🚀 Features

- **Prompt Management**: Create, read, update, and organize your AI prompts
- **Version Control**: Automatic versioning system with Git-style history visualization
- **AI-Powered Improvement**: Enhance prompts using OpenAI or mock providers
- **Authentication**: Secure JWT-based authentication with protected routes
- **Clean Architecture**: Well-structured codebase following clean architecture principles
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## 📋 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation and settings management
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **OpenAI API** - AI prompt improvement

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - State management

## 📁 Project Structure

```
promptvault/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configurations
│   │   ├── models/         # Database and Pydantic models
│   │   ├── services/       # Business logic layer
│   │   └── providers/      # AI provider implementations
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # Backend documentation
│
├── frontend/                # Next.js frontend
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   ├── lib/                # Utilities and API clients
│   └── middleware.ts       # Route protection middleware
│
└── docs/                   # Documentation
    └── Architecture.md     # Architecture overview
```

## 🛠️ Installation

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   python setup_env.py
   ```
   Or manually create `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptvault
   INIT_DB_ON_STARTUP=false
   SECRET_KEY=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4o-mini
   ```

5. **Start PostgreSQL:**
   ```bash
   # Using Docker
   docker run --name promptvault-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=promptvault \
     -p 5432:5432 \
     -d postgres:15
   ```

6. **Initialize database:**
   ```bash
   python check_db.py  # Check and create database if needed
   python init_db.py   # Create tables
   ```

7. **Create initial user:**
   ```bash
   python create_user.py
   ```
   This will prompt you for email and password to create the first user.
   **Note**: This is a single-user system, so you only need to create one user.

8. **Run the backend:**
   ```bash
   python run.py
   # Or: uvicorn app.main:app --reload
   ```

Backend will be available at `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   Create `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

4. **Run the frontend:**
   ```bash
   npm run dev
   ```

Frontend will be available at `http://localhost:3000`

## 📖 Usage

### Authentication

1. Access the application at `http://localhost:3000`
2. You'll be redirected to `/login` if not authenticated
3. Login with your credentials (single-user system)
4. After login, you'll be redirected to the dashboard

### Managing Prompts

- **Create Prompt**: Click "New Prompt" button on the dashboard
- **View Details**: Click on any prompt to see details and version history
- **Improve Prompt**: Click "Improve" button to enhance prompts using AI
- **Version History**: View all versions in Git-style commit history

### API Endpoints

- `POST /api/v1/auth/login` - User login
- `GET /api/v1/prompts` - List all prompts
- `POST /api/v1/prompts` - Create new prompt
- `GET /api/v1/prompts/{id}` - Get prompt by ID
- `PUT /api/v1/prompts/{id}` - Update prompt
- `GET /api/v1/prompts/{id}/versions` - Get prompt versions
- `POST /api/v1/prompts/improve` - Improve prompt with AI

Full API documentation available at `http://127.0.0.1:8000/docs`

## 🏗️ Architecture

### Clean Architecture Principles

- **Separation of Concerns**: Clear boundaries between layers
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Service Layer**: Business logic isolated in services
- **Provider Abstraction**: AI providers can be swapped easily

### Key Components

- **Models**: Database models (SQLAlchemy) and API schemas (Pydantic)
- **Services**: Business logic and orchestration
- **API Routes**: HTTP endpoints and request handling
- **Providers**: AI provider implementations (OpenAI, Mock)

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with middleware
- CORS configuration
- Environment variable management

## 🧪 Development

### Backend Development

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Database Management

```bash
# Check database connection
python backend/check_db.py

# Initialize tables
python backend/init_db.py
```

## 📝 Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptvault
INIT_DB_ON_STARTUP=false
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- Next.js for the React framework
- OpenAI for AI capabilities
- All contributors and users

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using FastAPI and Next.js**
