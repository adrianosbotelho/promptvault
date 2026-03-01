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
├── api/v1/              # Endpoints REST
│   ├── auth.py          # Login JWT
│   ├── prompts.py       # CRUD + improve + favorite + fork + export + stats
│   ├── specialist.py    # Prompt Studio (build + feedback)
│   ├── insights.py      # Insights do Agent
│   ├── mentor.py        # Architect Mentor summary + review
│   ├── profile.py       # Perfil do Arquiteto
│   ├── templates.py     # Templates reutilizáveis
│   ├── agent.py         # Execução do AI Agent
│   ├── convert.py       # Conversão de arquivos, URLs e YouTube para Markdown
│   ├── analytics.py     # Analytics e estatísticas agregadas
│   ├── integrations.py  # GitHub, Webhooks, Slack, Discord, Notion
│   └── router.py        # Registro de todos os routers
├── specialist/          # Especialistas do Prompt Studio
│   ├── base.py
│   ├── prompt_refiner.py       # Pipeline 2-calls LLM
│   ├── learning_engine.py      # Feedback loop in-memory
│   ├── specialization_registry.py
│   ├── delphi_debug.py / delphi_refactor.py / delphi_architecture.py
│   ├── plsql_debug.py / plsql_refactor.py / plsql_architecture.py
│   ├── python_debug.py / python_refactor.py
│   ├── sql_query.py / api_design.py
├── mentor/              # Architect Mentor service
├── agent/               # AI Agent (análise automática de prompts)
├── background/          # Worker em background
├── models/              # SQLAlchemy + Pydantic schemas
├── services/            # Lógica de negócio
│   ├── prompt_service.py       # fork, export, quality score, favorites
│   ├── github_service.py       # Integração GitHub
│   ├── notion_service.py       # Integração Notion
│   └── webhook_service.py      # Webhooks outbound (Slack, Discord, genérico)
├── providers/           # Groq, OpenAI, Mock
└── core/                # Config, auth, database, categories
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
| `prompt_versions` | Histórico de versões com embeddings |
| `insights` | Análises do AI Agent |
| `architect_profiles` | Perfil do Arquiteto |
| `prompt_templates` | Templates reutilizáveis com variáveis |
| `integration_configs` | Configurações de integrações externas |

Configuração de pool:
- `pool_size=5`, `max_overflow=10`
- `pool_pre_ping=True` (verificação de conexão)

## Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Login (retorna JWT) |
| GET | `/api/v1/prompts` | Listar prompts |
| POST | `/api/v1/prompts` | Criar prompt |
| PUT | `/api/v1/prompts/{id}/favorite` | Toggle favorito |
| POST | `/api/v1/prompts/{id}/fork` | Duplicar prompt |
| POST | `/api/v1/prompts/{id}/improve` | Melhorar com IA |
| GET | `/api/v1/prompts/search?q=...` | Busca semântica |
| GET | `/api/v1/prompts/export?format=zip\|json` | Exportar coleção |
| POST | `/api/v1/specialist/build` | Gerar prompt especializado |
| POST | `/api/v1/specialist/feedback` | Registrar feedback de qualidade |
| GET | `/api/v1/insights` | Listar insights do Agent |
| GET | `/api/v1/insights/{id}` | Detalhe do insight |
| GET | `/api/v1/mentor/summary` | Resumo do Architect Mentor |
| POST | `/api/v1/mentor/review` | Revisar texto com o Mentor |
| GET | `/api/v1/profile` | Perfil do Arquiteto |
| PUT | `/api/v1/profile` | Atualizar perfil |
| GET | `/api/v1/templates` | Listar templates |
| POST | `/api/v1/templates/{id}/use` | Instanciar template com variáveis |
| POST | `/api/v1/agent/run` | Executar AI Agent manualmente |
| POST | `/api/v1/convert/file` | Converter arquivo para Markdown (MarkItDown) |
| POST | `/api/v1/convert/url` | Converter URL para Markdown |
| POST | `/api/v1/convert/youtube` | Extrair transcrição do YouTube |
| GET | `/api/v1/analytics` | Analytics e estatísticas agregadas |
| GET | `/api/v1/integrations` | Listar integrações configuradas |
| POST | `/api/v1/integrations/github/export/{id}` | Exportar prompt para GitHub |
| POST | `/api/v1/integrations/notion/export/{id}` | Exportar prompt para Notion |
| POST | `/api/v1/integrations/webhook/test/{id}` | Testar webhook configurado |

## Dependências Externas Notáveis

| Biblioteca | Uso |
|------------|-----|
| `markitdown` | Conversão de PDF, Word, Excel, PowerPoint, HTML para Markdown |
| `youtube-transcript-api` | Extração de transcrições do YouTube sem API key |
| `httpx` | Cliente HTTP assíncrono para conversão de URLs e integrações |
| `groq` | SDK Groq para LLM e embeddings |
| `openai` | SDK OpenAI para LLM e embeddings |
