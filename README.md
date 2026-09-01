# ITBI Intel

Inteligência imobiliária de Porto Alegre a partir dos dados abertos do ITBI
(Secretaria Municipal da Fazenda). Preços reais de venda de apartamentos,
2020–2026, com busca por endereço e benchmarks por bairro (construção × tamanho).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [shadcn/ui](https://ui.shadcn.com) + [Recharts](https://recharts.org)
- [Drizzle ORM](https://orm.drizzle.team) + libSQL (SQLite local)
- [Zod](https://zod.dev) para validação de busca
- [Bun](https://bun.sh) como runtime e gerenciador de pacotes

## Setup

```bash
bun install

# Recarrega o banco a partir dos CSVs versionados em data/csv/
# (deduplica, calcula R$/m², tier × band) → data/itbi.db
bun run import:data

bun run dev
```

Aponte para outro diretório de CSVs com `ITBI_CSV_DIR`, ou para outro banco
com `DATABASE_URL`.

## Estrutura

```
db/             schema drizzle + client libsql
db/queries.ts   agregações (medianas SQL, percentis, benchmarks)
scripts/import.ts  ETL dos CSVs → SQLite
app/            páginas: dashboard (/), busca (/busca), bairros (/bairros, /bairro/[slug]), metodologia (/sobre)
lib/            bairros (nomes), formatação pt-BR, dados (tiers/bands), busca (zod)
components/     UI shadcn + gráficos
```

## Metodologia

- `R$/m² = base_de_calculo / area_constr_privativa`, só apartamentos/coberturas.
- Benchmarks por célula de época de construção × faixa de tamanho (mediana p50;
  células com n < 3 não geram benchmark).
- Deduplicação por rua + número + unidade (prioriza linhas pagas).
- `bairro` na fonte vem truncado a 15 caracteres; os nomes são normalizados em
  `lib/bairros.ts`.

## Prod

```bash
bun run build   # roda db:migrate + import:data + next build
bun start
```

Nota: SQLite local é adequado para uma instância única. Para escala, troque o
driver por um banco remoto (libSQL/Turso ou Postgres) sem mudar as queries.