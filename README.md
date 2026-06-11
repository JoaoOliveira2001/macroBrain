# macroBrain

Hub interno do time de Chatbot da Macro. Responsabilidades (dev ↔ projeto) vêm da **planilha Zoho Sheet oficial**; workload (tarefas abertas) vem do **Zoho Projects**.

## Stack

- Next.js 16 (App Router)
- Tema Macro: fundo `#000000`, accent `#A6CE39`
- API Routes para Sheet (read/write) e Projects (read)

## Planilha (fonte da verdade)

| Campo | Valor |
|-------|--------|
| URL | [Planilha de responsabilidades](https://sheet.zoho.com/sheet/open/u7fcfe192878498624414a3905bce8b39da6f?sheetid=4&range=B36) |
| `ZOHO_SHEET_RESOURCE_ID` | `u7fcfe192878498624414a3905bce8b39da6f` |
| `ZOHO_SHEET_WORKSHEET_ID` | `4` |
| Área de dados | a partir da linha 36 (cabeçalho na linha 35) |

## Configuração

```bash
cp .env.example .env.local
```

Variáveis principais:

```env
ZOHO_SHEET_ACCESS_TOKEN=        # escopos: ZohoSheet.dataAPI.READ, ZohoSheet.dataAPI.UPDATE
ZOHO_PROJECTS_ACCESS_TOKEN=     # escopos: ZohoProjects.tasks.READ, ZohoProjects.portals.READ
ZOHO_PORTAL_ID=754064774        # macrodigital
MACROBRAIN_PASSWORD=            # auth interno (opcional em dev)
```

Se `ZOHO_USE_MCP_TOKEN=true` (padrão), o app tenta ler o token em `~/.mcp-auth/...` — útil para Projects, mas **Sheet exige reautorização** com escopos Sheet.

## Desenvolvimento

```bash
npm install --cache /tmp/npm-cache-macrobrain
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## API

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/assignments` | GET | Lê responsabilidades da Sheet |
| `/api/assignments?refresh=true` | GET | Força re-sync |
| `/api/assignments` | PATCH | Atualiza célula na Sheet `{ project, developerEmail }` |
| `/api/workload` | GET | Tarefas abertas por e-mail (15 devs) |
| `/api/auth` | POST/DELETE | Login interno |

## Deploy

Compatível com Vercel ou qualquer host Node:

```bash
npm run build
npm start
```

Defina as variáveis de ambiente no painel de deploy. Com `MACROBRAIN_PASSWORD`, rotas exigem login em `/login`.

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # Visão do time
│   ├── projects/page.tsx     # Visão projetos + edição
│   └── api/
│       ├── assignments/        # Sheet read/write
│       ├── workload/           # Zoho Projects
│       └── auth/               # Auth interno
└── lib/
    ├── zoho-sheet.ts
    ├── zoho-projects.ts
    ├── sheet-mapper.ts
    ├── devs.ts
    └── theme.ts
```

## OAuth Zoho Sheet

O token atual do MCP costuma ter apenas escopo Projects. Para habilitar leitura/escrita na planilha:

1. Crie/atualize um client OAuth Zoho com escopos `ZohoSheet.dataAPI.READ` e `ZohoSheet.dataAPI.UPDATE`
2. Gere `access_token` (ou refresh token) e defina `ZOHO_SHEET_ACCESS_TOKEN`
3. Use **Recarregar da planilha** na UI para validar

Enquanto o OAuth Sheet não estiver ativo, o app exibe o roster local validado pelo time (modo fallback) com aviso na interface.
