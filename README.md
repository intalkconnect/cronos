# Cronos (React JS, sem Tailwind)
Painel Vite + React (JavaScript) para administrar os serviços do provisionador.

## Configuração da API (sem expor na UI)
- Crie um arquivo `.env` na raiz com:
  ```
  VITE_API_BASE=http://SEU_HOST:18080
  ```
- A URL **não aparece** na interface; o app usa apenas a variável de ambiente no build.

## Rodar em dev
```bash
cp .env.example .env   # edite a URL
npm i
npm run dev
# http://localhost:5173
```

## Build
```bash
npm run build
npm run preview
```

## Uso
- **Criar cliente**: informe apenas o TENANT e clique **Criar** (POST /clientes).
- **Escalar réplicas**: informe TENANT e um número de réplicas (aplicado a todos os serviços) e clique **Aplicar escala** (POST /clientes/:tenant/scale).
- Indicador de **health** no topo (usa GET /health do provisionador).
