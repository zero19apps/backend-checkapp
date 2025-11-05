# 🔐 Configuração de Variáveis de Ambiente

## ⚠️ IMPORTANTE: Segurança

O `docker-compose.yml` **NÃO contém mais credenciais**! Todas as variáveis sensíveis devem ser configuradas no **Portainer** ou via comando.

## 📋 Variáveis Necessárias

No Portainer, ao criar/editar a stack, role até **"Environment variables"** e adicione:

```bash
DATABASE_URL=postgresql://postgres:password@host:5432/shoppings
GOOGLE_SHEETS_CLIENT_EMAIL=painel-checkapp@mauan8n.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=1nYCPKmfR8rJlAuWyaafCb3o73m_kpz5k
```

## 🚀 Como Configurar

### Opção 1: Portainer (RECOMENDADO)

1. No Portainer, vá em **Stacks** → sua stack → **Editor**
2. Role até **"Environment variables"**
3. Clique em **"Add environment variable"** para cada uma:
   - `DATABASE_URL`
   - `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_SHEETS_PRIVATE_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID`
4. Clique em **"Update the stack"**

### Opção 2: Via Comando (no servidor)

```bash
# Editar docker-compose.yml e adicionar as variáveis em environment:
# - DATABASE_URL=...
# - GOOGLE_SHEETS_CLIENT_EMAIL=...
# - GOOGLE_SHEETS_PRIVATE_KEY=...
# - GOOGLE_DRIVE_FOLDER_ID=...

docker stack deploy -c docker-compose.yml checkapp-backend
```

## ✅ Verificar

Após configurar, verifique se está funcionando:

```bash
docker service logs -f checkapp-backend_checkapp-backend
```

