# PromptVault

Aplicação web para gerenciar, versionar e melhorar prompts de IA com inteligência integrada.

## Funcionalidades

- **Vault de Prompts** — Crie, edite, organize e versione seus prompts com histórico estilo Git
- **Prompt Studio** — Gere prompts profissionais e estruturados a partir de uma ideia simples usando especialistas de domínio (Delphi, PL/SQL, Python, SQL, API Design)
- **Templates Reutilizáveis** — Salve prompts gerados como templates com variáveis `{{substituíveis}}`
- **AI Agent** — Analisa seus prompts automaticamente e gera insights: ideias de melhoria, padrões reutilizáveis e avisos
- **Architect Mentor** — Painel que agrega observações recentes, alertas arquiteturais e padrões detectados, personalizado pelo perfil do arquiteto
- **Perfil do Arquiteto** — Configure seus padrões preferidos, domínios frequentes e foco de otimização para personalizar o Mentor
- **Score de Qualidade** — Cada prompt recebe um score visual (0–100) baseado em completude
- **Favoritos** — Marque prompts favoritos com estrela e filtre rapidamente
- **Busca Semântica** — Busca por significado usando embeddings (pgvector) com fallback por texto
- **Busca Global** — Atalho `Cmd+K` / `Ctrl+K` disponível em qualquer página
- **Exportar .md** — Exporte qualquer prompt como arquivo Markdown
- **Diff Visual** — Compare versões do prompt lado a lado com linhas adicionadas/removidas
- **Revisão com Mentor** — Envie um prompt para revisão do Architect Mentor diretamente da página de detalhe
- **Feedback de Qualidade** — Avalie prompts gerados no Studio (útil / não útil) para alimentar o LearningEngine
- **Dark/Light Mode** — Alternância de tema persistida no localStorage

## Stack

### Backend
- **FastAPI** + **Uvicorn**
- **PostgreSQL** + **pgvector** (busca semântica)
- **SQLAlchemy** (ORM)
- **Pydantic** (validação)
- **JWT** (autenticação single-user)
- **Groq / OpenAI / Mock** (provedores LLM intercambiáveis)

### Frontend
- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui** (componentes)
- **Lucide** (ícones)

## Estrutura do Projeto

```
promptvault/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST
│   │   │   ├── prompts.py   # CRUD + improve + favorite + stats
│   │   │   ├── specialist.py # Prompt Studio (build + feedback)
│   │   │   ├── insights.py  # Insights do Agent
│   │   │   ├── mentor.py    # Architect Mentor summary + review
│   │   │   ├── profile.py   # Perfil do Arquiteto
│   │   │   ├── templates.py # Templates reutilizáveis
│   │   │   ├── agent.py     # Execução do AI Agent
│   │   │   └── auth.py      # Login JWT
│   │   ├── specialist/      # Especialistas do Prompt Studio
│   │   │   ├── delphi_debug.py / delphi_refactor.py / delphi_architecture.py
│   │   │   ├── plsql_debug.py / plsql_refactor.py / plsql_architecture.py
│   │   │   ├── python_debug.py / python_refactor.py
│   │   │   ├── sql_query.py / api_design.py
│   │   │   ├── prompt_refiner.py   # Pipeline 2-calls LLM
│   │   │   └── learning_engine.py  # Feedback loop in-memory
│   │   ├── mentor/          # Architect Mentor service
│   │   ├── agent/           # AI Agent (análise de prompts)
│   │   ├── models/          # SQLAlchemy + Pydantic schemas
│   │   ├── services/        # Lógica de negócio
│   │   └── core/            # Config, auth, LLM providers
│   └── requirements.txt
│
└── frontend/
    ├── app/dashboard/
    │   ├── page.tsx          # Dashboard principal
    │   ├── prompts/[id]/     # Detalhe do prompt
    │   ├── studio/           # Prompt Studio (standalone)
    │   ├── templates/        # Biblioteca de templates
    │   ├── insights/         # Insights do Agent
    │   ├── mentor/           # Architect Mentor
    │   ├── agent/            # Painel do Agent
    │   └── profile/          # Perfil do Arquiteto
    ├── components/
    │   ├── PromptStudio.tsx  # Studio com especialistas + save + template + feedback
    │   ├── PromptCard.tsx    # Card com favorito + score de qualidade
    │   ├── AppShell.tsx      # Layout + sidebar + busca global Cmd+K
    │   └── ArchitectMentorPanel.tsx
    └── lib/api.ts            # Cliente HTTP tipado
```

## Instalação

### Pré-requisitos

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+ com extensão `pgvector`

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Crie o arquivo `.env` em `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptvault
INIT_DB_ON_STARTUP=false
SECRET_KEY=sua-chave-secreta
GROQ_API_KEY=sua-chave-groq          # opcional, preferido
OPENAI_API_KEY=sua-chave-openai      # opcional, fallback
```

Inicialize o banco e crie o usuário:

```bash
python init_db.py
python create_user.py
```

Inicie o servidor:

```bash
python run.py
# ou: uvicorn app.main:app --reload
```

API disponível em `http://127.0.0.1:8000` — documentação em `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
```

Crie o arquivo `.env.local` em `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Frontend disponível em `http://localhost:3000`

## Principais Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Login (retorna JWT) |
| GET | `/api/v1/prompts` | Listar prompts |
| POST | `/api/v1/prompts` | Criar prompt |
| PUT | `/api/v1/prompts/{id}/favorite` | Toggle favorito |
| POST | `/api/v1/prompts/{id}/improve` | Melhorar com IA |
| GET | `/api/v1/prompts/search?q=...` | Busca semântica |
| POST | `/api/v1/specialist/build` | Gerar prompt especializado |
| POST | `/api/v1/specialist/feedback` | Registrar feedback de qualidade |
| GET | `/api/v1/insights` | Listar insights do Agent |
| GET | `/api/v1/insights/{id}` | Detalhe do insight |
| GET | `/api/v1/mentor/summary` | Resumo do Architect Mentor |
| POST | `/api/v1/mentor/review` | Revisar texto com o Mentor |
| GET | `/api/v1/profile` | Perfil do Arquiteto |
| PUT | `/api/v1/profile` | Atualizar perfil |
| GET | `/api/v1/templates` | Listar templates |
| POST | `/api/v1/templates` | Criar template |
| POST | `/api/v1/templates/{id}/use` | Instanciar template com variáveis |
| POST | `/api/v1/agent/run` | Executar AI Agent manualmente |

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL |
| `SECRET_KEY` | Sim | Chave para assinar JWT |
| `INIT_DB_ON_STARTUP` | Não | `true` para criar tabelas automaticamente |
| `GROQ_API_KEY` | Não | Chave Groq (LLM preferido) |
| `OPENAI_API_KEY` | Não | Chave OpenAI (fallback) |

### Frontend (`frontend/.env.local`)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL base do backend |

## Segurança

- Autenticação JWT com cookies HTTPOnly
- Senhas com bcrypt
- Rotas protegidas por middleware Next.js
- CORS configurado
- Sistema single-user (um único usuário por instância)
