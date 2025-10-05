# Cronos (React JS, sem Tailwind) — v4
Painel Vite + React (JavaScript) para administrar os serviços do provisionador.

## Configuração
Crie um `.env` na raiz com:
```
VITE_API_BASE=http://SEU_HOST:18080
```

## Rodar em dev
```bash
cp .env.example .env   # edite VITE_API_BASE
npm i
npm run dev
# http://localhost:5173
```

## Build
```bash
npm run build
npm run preview
```

## Fluxo
- Tela inicial mostra **apenas** as opções **Criar** e **Escalar**.
- Após selecionar:
  - **Criar** → pede **TENANT** (manual) e cria com **1 réplica** em todos os serviços.
  - **Escalar** → pede **TENANT** + réplicas para **incoming** e **outcoming** (apenas) e aplica.
- Indicador de **health** no topo (GET /health).
