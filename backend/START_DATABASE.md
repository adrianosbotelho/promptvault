# Como Iniciar o PostgreSQL

O erro "Database connection failed" indica que o PostgreSQL não está rodando.

## Opção 1: Docker Compose (Recomendado)

Use o arquivo `docker-compose.yml` na raiz do projeto:

```bash
# Iniciar PostgreSQL com pgvector
docker-compose up -d

# Verificar se está rodando
docker-compose ps

# Ver logs
docker-compose logs -f db
```

O docker-compose.yml já está configurado com:
- Imagem: `pgvector/pgvector:pg16` (PostgreSQL 16 com pgvector)
- Database: `promptvault`
- Usuário: `postgres`
- Senha: `postgres`

## Opção 2: Docker Direto

Se preferir usar Docker diretamente:

```bash
# Iniciar PostgreSQL com pgvector
docker run --name promptvault-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=promptvault \
  -p 5432:5432 \
  -d pgvector/pgvector:pg16

# Verificar se está rodando
docker ps

# Ver logs
docker logs promptvault-postgres
```

## Opção 3: PostgreSQL Local

Se você tem PostgreSQL instalado localmente:

```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux (systemd)
sudo systemctl start postgresql

# Windows
# Inicie o serviço PostgreSQL pelo Services Manager
```

## Verificar Conexão

Após iniciar o PostgreSQL, verifique a conexão:

```bash
cd backend
python check_db.py
```

Se o banco não existir, o script tentará criá-lo automaticamente.

## Inicializar Tabelas

Depois que o banco estiver rodando, inicialize as tabelas:

```bash
cd backend
python init_db.py
```

## Verificar Configuração

Certifique-se de que o `.env` em `backend/.env` está configurado corretamente:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptvault
```

Ajuste usuário, senha e nome do banco conforme necessário.
