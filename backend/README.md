# PromptVault — Backend

FastAPI backend seguindo arquitetura limpa.

## Setup

### 1. Instalar dependências

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configurar ambiente

Crie o arquivo `.env` nesta pasta:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptvault
INIT_DB_ON_STARTUP=false
SECRET_KEY=sua-chave-secreta
GROQ_API_KEY=sua-chave-groq          # opcional, preferido
OPENAI_API_KEY=sua-chave-openai      # opcional, fallback
```

Ou use o script interativo:

```bash
python setup_env.py
```

### 3. Inicializar banco de dados

```bash
python init_db.py
```

Requer PostgreSQL 15+ com a extensão `pgvector` instalada.

### 4. Criar usuário inicial

```bash
python create_user.py
```

Sistema single-user — crie apenas um usuário.

### 5. Iniciar servidor

```bash
python run.py
# ou: uvicorn app.main:app --reload
```

API disponível em `http://127.0.0.1:8000`
Documentação Swagger em `http://127.0.0.1:8000/docs`

## Estrutura

```
app/
├── api/v1/           # Endpoints REST
│   ├── auth.py       # Login JWT
│   ├── prompts.py    # CRUD + improve + favorite
│   ├── specialist.py # Prompt Studio
│   ├── insights.py   # Insights do Agent
│   ├── mentor.py     # Architect Mentor
│   ├── profile.py    # Perfil do Arquiteto
│   ├── templates.py  # Templates reutilizáveis
│   └── agent.py      # Execução do AI Agent
├── specialist/       # Especialistas do Prompt Studio
│   ├── base.py
│   ├── prompt_refiner.py
│   ├── learning_engine.py
│   ├── specialization_registry.py
│   ├── delphi_*.py / plsql_*.py
│   ├── python_debug.py / python_refactor.py
│   ├── sql_query.py / api_design.py
├── mentor/           # Architect Mentor service
├── agent/            # AI Agent (análise automática)
├── background/       # Worker em background
├── models/           # SQLAlchemy + Pydantic schemas
├── services/         # Lógica de negócio
├── providers/        # Groq, OpenAI, Mock
└── core/             # Config, auth, database, categories
```

## Provedores LLM

O sistema detecta automaticamente qual provedor usar:

1. **Groq** — se `GROQ_API_KEY` estiver configurada (recomendado, mais rápido)
2. **OpenAI** — se `OPENAI_API_KEY` estiver configurada
3. **Mock** — fallback sem chave configurada (retorna respostas simuladas)

## Banco de Dados

PostgreSQL com SQLAlchemy. Principais tabelas:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuário único do sistema |
| `prompts` | Prompts com `is_favorite`, `quality_score` |
| `prompt_versions` | Histórico de versões |
| `insights` | Análises do AI Agent |
| `architect_profiles` | Perfil do Arquiteto |
| `prompt_templates` | Templates reutilizáveis com variáveis |

Configuração de pool:
- `pool_size=5`, `max_overflow=10`
- `pool_pre_ping=True` (verificação de conexão)
