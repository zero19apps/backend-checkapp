# 🔐 Configuração de Variáveis de Ambiente

## ⚠️ IMPORTANTE: Segurança

O `docker-compose.yml` **NÃO contém mais credenciais**! Todas as variáveis sensíveis devem estar no arquivo `.env` no servidor.

## 📋 Variáveis Necessárias

Crie um arquivo `.env` no servidor (mesmo diretório do `docker-compose.yml`) com:

```bash
# Servidor
NODE_ENV=production
BACKEND_PORT=3223
FRONTEND_URL=https://zero19.top

# PostgreSQL
DATABASE_URL=postgresql://postgres:password@host:5432/shoppings

# Google Sheets API
GOOGLE_SHEETS_CLIENT_EMAIL=painel-checkapp@mauan8n.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=1nYCPKmfR8rJlAuWyaafCb3o73m_kpz5k
```

## 🚀 Como Configurar no Servidor

### Opção 1: Criar arquivo .env manualmente

```bash
cd backend-checkapp
nano .env
# Cole as variáveis acima
```

### Opção 2: Usar Portainer Environment Variables

No Portainer, ao criar/editar a stack:
1. Role até "Environment variables"
2. Adicione cada variável manualmente
3. O Portainer sobrescreve as do `.env`

## ✅ Verificar

Após configurar, verifique se está funcionando:

```bash
docker stack deploy -c docker-compose.yml checkapp-backend
docker service logs checkapp-backend_checkapp-backend
```

