# 🚀 Deploy Manual - Passo a Passo Completo

## 📍 Pré-requisitos

- Acesso SSH ao servidor
- Docker e Docker Swarm instalados
- Git instalado no servidor
- Rede `network_public` criada no Swarm

---

## 🔧 PASSO 1: Conectar no Servidor

```bash
ssh root@seu-servidor
# ou
ssh usuario@seu-servidor
```

---

## 📦 PASSO 2: Clonar/Atualizar o Repositório

```bash
# Se NÃO tem o projeto ainda:
git clone https://github.com/zero19apps/backend-checkapp.git
cd backend-checkapp

# Se JÁ tem o projeto:
cd backend-checkapp
git pull origin main
```

---

## 🔐 PASSO 3: Criar Arquivo .env (se não existir)

```bash
# Criar arquivo .env
nano .env
```

**Cole este conteúdo (ajuste os valores):**

```bash
NODE_ENV=production
BACKEND_PORT=3223
FRONTEND_URL=https://zero19.top

DATABASE_URL=postgresql://postgres:vVQbSycgpXmP57@72.61.218.13:5432/shoppings
GOOGLE_SHEETS_CLIENT_EMAIL=painel-checkapp@mauan8n.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCYjEEo48ImH3/l\nJPf87sjaPsbZuOWhvYm31pwJHZo8zpZh4IUeAYZrMD7glqT9rupTbHvgogolXHC7\nJE+ANEFjik49PbZAHYlxJBOYrrOQSHAsXIhSA8LlVlY2pT4/E7oHqZlniv2UejY/\na7ow7aexj5nBdNJY6PiRqRqT5if0nvV/JCpcVp2hxzNwYqdTTqxWtGvKUmJ8+YBA\n9oQlqeJYk3B/xLCcbAIQNQP12WtOns1twxl5iMpSEl3s+uNkafvI3GOS3ASwAq0a\nsa8pD7J4W5YpX35AJkdhRpYOuE47kCA5KPAxoCewNY3R7klHrMtTrfQFHuexGk2E\n0WrzUxwnAgMBAAECggEANTrnt9F122Cte7OBN0jJXGKAd9OtiVk+l6Ay9XlXazV5\nQzEZskU89uUwY6UdcIobKT4XIeTZHn1ZtuuuNCHH2WiW8Ya5tDi6T3kTv3jinouw\nXMJzLQ8z8FvGnK3fgRoslWToazmUT72vdUTthQpAtFRUBi3yAmVU61rzM72hnplZ\nIOaxFkm7MPCeUW2bKlA239hcxacBtnfxbmmeG185YjT+drU7HoOH47s6Z3Sb9zvO\nW8XsOcFAFQxOftBpojvEljEuPL15bZWoAk/u2YMBOJb4Tms3EmsGisL6VOa0Qk1W\nOwlkKd8XZhfm4RXA9SflBNPUeKdYW41Wy0GfLcyRoQKBgQDP02xbnBep5aaKwANU\nUa/sAjK6jNevRD9POO1xwDfvynd9A2KvYp+SOA45S0O4LWUcHZHe3gwLGRcb3/DB\nY/HEJg/ojIQfaxMrhD6SVrlEAiKQBpo6NhtW2jQWqIIVdYStijJe8t9Q+Ef8C/aL\nbc+MddIcwF6AyaOaZHWgEtti4QKBgQC76JWME73dGQm2iqMCp09yomrQsNW5O7hX\nCFNxH6wMoiG+CSgDkXoysogDixERo/16CjIoeGvFvXDfM+QSgz/tmKuevdQ5h3aS\nVyx6vltwOr6bvVIb08sb/J/0gt/wWHSolgmRU35kIVCOegjNK/AbMtwcn7bKmlwa\ne8uxXChoBwKBgQDEJ/jRar4HFQQhV+SMlGFocBazbzYwbkkXHFM5F0V0pfQr4aMm\niP62AwSh3UE4uFgDtoE1Cv3xB6iBHdheoFfUXFyNkPsvsF+ypips80AASceXizPM\nl78sNd4OONQ3Lumg5pxuc+yFvyIqapw0s9u+5oH/sy4/fpJVqlY/VS0O4QKBgA9P\nmD/dq+7EB4KUMUwaDeMtUL7IaeG59/8/cm0ZQ4+T9mPhox0HUYmn+mUvg6iIUDMN\neaDKjx2BnhzRwZewkhjuA63fkddOLl8mMz2dHR476yQNfQ8/ZqFVKENoFo8i5f6G\nmyj4QKgv/rxdPTJajinpLv42FVLU2QRfae19sN0pAoGBAIOaiNTm8RlyIAbA2j4D\nv0RhMpl5k6oq0WcEKYW5Na/QLaA/7Cb0Gnyu4VQv2DSiBwL9oFTyflU4lJQrjvzO\nhFc1pUBzufayEWuTWAqnmaonwX4zD+eeFF+KbrZaXmGqG5S9J2OVxqjEQ1nQeu8/\nvSvALm8uFh9vE4shu7hpZZpY\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=1nYCPKmfR8rJlAuWyaafCb3o73m_kpz5k
```

**Salvar:** `Ctrl + O`, Enter, `Ctrl + X`

---

## 🔨 PASSO 4: Editar docker-compose.yml e Adicionar ENVs

```bash
nano docker-compose.yml
```

**Encontre a seção `environment:` (linha ~16) e adicione as variáveis:**

```yaml
environment:
  # ✅ ENVs fixas
  - NODE_ENV=production
  - BACKEND_PORT=3223
  - FRONTEND_URL=https://zero19.top
  # ⚠️ Adicione estas linhas:
  - DATABASE_URL=postgresql://postgres:vVQbSycgpXmP57@72.61.218.13:5432/shoppings
  - GOOGLE_SHEETS_CLIENT_EMAIL=painel-checkapp@mauan8n.iam.gserviceaccount.com
  - GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCYjEEo48ImH3/l\nJPf87sjaPsbZuOWhvYm31pwJHZo8zpZh4IUeAYZrMD7glqT9rupTbHvgogolXHC7\nJE+ANEFjik49PbZAHYlxJBOYrrOQSHAsXIhSA8LlVlY2pT4/E7oHqZlniv2UejY/\na7ow7aexj5nBdNJY6PiRqRqT5if0nvV/JCpcVp2hxzNwYqdTTqxWtGvKUmJ8+YBA\n9oQlqeJYk3B/xLCcbAIQNQP12WtOns1twxl5iMpSEl3s+uNkafvI3GOS3ASwAq0a\nsa8pD7J4W5YpX35AJkdhRpYOuE47kCA5KPAxoCewNY3R7klHrMtTrfQFHuexGk2E\n0WrzUxwnAgMBAAECggEANTrnt9F122Cte7OBN0jJXGKAd9OtiVk+l6Ay9XlXazV5\nQzEZskU89uUwY6UdcIobKT4XIeTZHn1ZtuuuNCHH2WiW8Ya5tDi6T3kTv3jinouw\nXMJzLQ8z8FvGnK3fgRoslWToazmUT72vdUTthQpAtFRUBi3yAmVU61rzM72hnplZ\nIOaxFkm7MPCeUW2bKlA239hcxacBtnfxbmmeG185YjT+drU7HoOH47s6Z3Sb9zvO\nW8XsOcFAFQxOftBpojvEljEuPL15bZWoAk/u2YMBOJb4Tms3EmsGisL6VOa0Qk1W\nOwlkKd8XZhfm4RXA9SflBNPUeKdYW41Wy0GfLcyRoQKBgQDP02xbnBep5aaKwANU\nUa/sAjK6jNevRD9POO1xwDfvynd9A2KvYp+SOA45S0O4LWUcHZHe3gwLGRcb3/DB\nY/HEJg/ojIQfaxMrhD6SVrlEAiKQBpo6NhtW2jQWqIIVdYStijJe8t9Q+Ef8C/aL\nbc+MddIcwF6AyaOaZHWgEtti4QKBgQC76JWME73dGQm2iqMCp09yomrQsNW5O7hX\nCFNxH6wMoiG+CSgDkXoysogDixERo/16CjIoeGvFvXDfM+QSgz/tmKuevdQ5h3aS\nVyx6vltwOr6bvVIb08sb/J/0gt/wWHSolgmRU35kIVCOegjNK/AbMtwcn7bKmlwa\ne8uxXChoBwKBgQDEJ/jRar4HFQQhV+SMlGFocBazbzYwbkkXHFM5F0V0pfQr4aMm\niP62AwSh3UE4uFgDtoE1Cv3xB6iBHdheoFfUXFyNkPsvsF+ypips80AASceXizPM\nl78sNd4OONQ3Lumg5pxuc+yFvyIqapw0s9u+5oH/sy4/fpJVqlY/VS0O4QKBgA9P\nmD/dq+7EB4KUMUwaDeMtUL7IaeG59/8/cm0ZQ4+T9mPhox0HUYmn+mUvg6iIUDMN\neaDKjx2BnhzRwZewkhjuA63fkddOLl8mMz2dHR476yQNfQ8/ZqFVKENoFo8i5f6G\nmyj4QKgv/rxdPTJajinpLv42FVLU2QRfae19sN0pAoGBAIOaiNTm8RlyIAbA2j4D\nv0RhMpl5k6oq0WcEKYW5Na/QLaA/7Cb0Gnyu4VQv2DSiBwL9oFTyflU4lJQrjvzO\nhFc1pUBzufayEWuTWAqnmaonwX4zD+eeFF+KbrZaXmGqG5S9J2OVxqjEQ1nQeu8/\nvSvALm8uFh9vE4shu7hpZZpY\n-----END PRIVATE KEY-----\n
  - GOOGLE_DRIVE_FOLDER_ID=1nYCPKmfR8rJlAuWyaafCb3o73m_kpz5k
```

**Salvar:** `Ctrl + O`, Enter, `Ctrl + X`

---

## 🐳 PASSO 5: Build da Imagem Docker

```bash
# Build da imagem (pode levar alguns minutos)
docker build -t checkapp-backend:latest .
```

**Aguarde terminar...** Você verá mensagens como:
```
Step 1/10 : FROM node:20-alpine AS builder
...
Successfully built abc123def456
Successfully tagged checkapp-backend:latest
```

---

## 🚀 PASSO 6: Deploy no Docker Swarm

```bash
# Deploy da stack
docker stack deploy -c docker-compose.yml checkapp-backend
```

**Você verá:**
```
Creating network checkapp-backend_network_public
Creating service checkapp-backend_checkapp-backend
```

---

## ✅ PASSO 7: Verificar se Funcionou

```bash
# Ver status dos serviços
docker service ls | grep checkapp-backend

# Ver logs em tempo real
docker service logs -f checkapp-backend_checkapp-backend

# Ver detalhes do serviço
docker service ps checkapp-backend_checkapp-backend
```

**O que você deve ver:**
- Status: `Running` ou `Running (1/2)` ou `Running (2/2)`
- Logs mostrando o servidor iniciando
- Se aparecer `ERROR`, veja os logs para diagnosticar

---

## 🔄 Próximas Atualizações (Quando Mudar o Código)

```bash
cd backend-checkapp
git pull origin main
docker build -t checkapp-backend:latest .
docker service update --force checkapp-backend_checkapp-backend
```

Ou simplesmente:

```bash
cd backend-checkapp
bash deploy-server.sh
```

---

## 🐛 Troubleshooting

### Erro: "network_public not found"
```bash
docker network ls | grep network_public
# Se não existir, criar:
docker network create --driver overlay network_public
```

### Erro: "image not found"
```bash
# Verificar se a imagem foi buildada:
docker images | grep checkapp-backend
# Se não estiver, fazer build novamente:
docker build -t checkapp-backend:latest .
```

### Serviço não inicia
```bash
# Ver logs detalhados:
docker service logs --tail 100 checkapp-backend_checkapp-backend

# Verificar se as variáveis de ambiente estão corretas:
docker service inspect checkapp-backend_checkapp-backend | grep -A 20 "Env"
```

### Remover stack e recomeçar
```bash
docker stack rm checkapp-backend
# Aguardar alguns segundos
docker stack deploy -c docker-compose.yml checkapp-backend
```

---

## 📝 Resumo Rápido (Comandos Essenciais)

```bash
# 1. Clonar/Atualizar
cd backend-checkapp && git pull origin main

# 2. Build
docker build -t checkapp-backend:latest .

# 3. Deploy
docker stack deploy -c docker-compose.yml checkapp-backend

# 4. Ver logs
docker service logs -f checkapp-backend_checkapp-backend
```

**Pronto!** 🎉

