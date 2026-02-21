# Como Iniciar o PostgreSQL

O erro "Database connection failed" indica que o PostgreSQL não está rodando.

## Opção 1: Docker (Recomendado)

Se você está usando Docker, inicie o container PostgreSQL:

```bash
# Iniciar PostgreSQL com Docker
docker run --name promptvault-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=promptvault-db \
  -p 5432:5432 \
  -d postgres:15

# Verificar se está rodando
docker ps

# Ver logs
docker logs promptvault-postgres
```

## Opção 2: Docker Compose (Alternativa)

Crie um arquivo `docker-compose.yml` na raiz do projeto:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: promptvault-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: promptvault-db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Depois execute:
```bash
docker-compose up -d
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptvault-db
```

Ajuste usuário, senha e nome do banco conforme necessário.
