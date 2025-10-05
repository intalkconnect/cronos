# Cronos (React JS) — v6
Fluxo de criação conforme solicitado:

1) **Criar banco** (envia `tenant` no body para `VITE_DB_URL`)
2) **Criar token padrão do tenant** (`VITE_TOKEN_URL`, extrai `token` do JSON)
3) **Criar usuário admin** em `https://{tenant}.ninechat.com.br{VITE_TENANT_CREATE_PATH}` com `Authorization: Bearer <token>` e body `{"email":"...","profile":"admin"}`
4) **Criar workers** via provisionador `POST {VITE_PROVISIONER_BASE}/clientes`
5) Mensagem final: *o usuário recebeu o e-mail de criação de senha* e *após criar, já pode acessar portal.ninechat.com.br*

## .env
```
# Provisioner
VITE_PROVISIONER_BASE=http://SEU_HOST:18080

# 1) DB
VITE_DB_URL=http://SEU_HOST:3200/tenant/db/create
VITE_DB_METHOD=POST
# opcional: VITE_DB_BODY_JSON={"tenant":"{tenant}","schema":"{tenant}"}

# 2) Token
VITE_TOKEN_URL=http://SEU_HOST:3200/tenant/token
VITE_TOKEN_METHOD=POST
# opcional: VITE_TOKEN_BODY_JSON={"tenant":"{tenant}"}
# opcional: VITE_TOKEN_KEY=token   # chave do token na resposta

# 3) Admin do tenant
VITE_TENANT_CREATE_PATH=/api/v1/create
VITE_TENANT_CREATE_METHOD=POST
# opcional: VITE_TENANT_CREATE_BODY_JSON={"email":"{email}","profile":"admin"}
```

## Rodar
```bash
cp .env.example .env
npm i
npm run dev
# http://localhost:5173
```

## Observações
- Todos os endpoints são configuráveis por `.env`.
- Placeholders `{tenant}` e `{email}` funcionam nos bodies customizados.
- O step de criação do admin envia o **Bearer token** retornado no passo 2.
