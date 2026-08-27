import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Metodologia" };

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Metodologia</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Como os números desta plataforma são calculados a partir dos dados
        abertos do ITBI de Porto Alegre.
      </p>

      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que é o ITBI</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            O Imposto sobre Transmissão de Bens Imóveis (ITBI) é pago a cada
            transferência de propriedade. O valor registrado é a{" "}
            <span className="font-medium text-foreground">base de cálculo</span>{" "}
            usada pela Prefeitura — um dos melhores indicadores de{" "}
            <span className="font-medium text-foreground">preço real de venda</span>{" "}
            disponíveis, pois captura transações concluídas, não anúncios.
            Fonte:{" "}
            <a
              href="https://dadosabertos.poa.br/dataset/itbi"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              dadosabertos.poa.br/dataset/itbi
            </a>
            .
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">R$/m²</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            Para cada transação:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              R$/m² = base_de_calculo / area_constr_privativa
            </code>
            . Filtramos para apartamentos e coberturas, mantendo apenas linhas
            com base e área privativa positivas.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Células de comparação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            Como o R$/m² cai conforme a unidade cresce e varia com a época de
            construção, as comparações usam células de{" "}
            <span className="font-medium text-foreground">construção × tamanho</span>:
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground">
                  Construção
                </p>
                <ul className="space-y-1 font-mono text-xs">
                  <li>pré-1950</li>
                  <li>A · 1950–1969</li>
                  <li>B · 1970–1989</li>
                  <li>C · 1990–2009</li>
                  <li>D · 2010+</li>
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground">
                  Tamanho (m² privativos)
                </p>
                <ul className="space-y-1 font-mono text-xs">
                  <li>S · &lt; 50</li>
                  <li>M · 50–89</li>
                  <li>L · 90–149</li>
                  <li>XL · ≥ 150</li>
                </ul>
              </div>
            </div>
            Células com menos de 3 transações não geram mediana.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benchmark e a comparação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            O benchmark de cada bairro é a{" "}
            <span className="font-medium text-foreground">mediana (p50)</span>{" "}
            do R$/m² de cada célula. Ao listar uma transação, o desvio{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              % vs p50
            </code>{" "}
            mostra o quanto ela ficou acima ou abaixo da mediana da sua
            célula no mesmo bairro. Valores abaixo da mediana aparecem em
            verde; acima, em âmbar.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deduplicação e limpeza</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            A mesma unidade pode aparecer mais de uma vez no cadastro (ex.:
            linha <em>Reestimada</em> seguida de <em>Impressa</em>).
            Deduplicamos por rua + número + unidade, priorizando as linhas
            pagas e descartando reestimadas sombreadas. Transferências
            parciais (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">perc_transmitido &lt; 100</code>)
            são normalizadas para o valor integral do imóvel.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limitações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            <ul className="list-disc space-y-1 pl-5">
              <li>Nomes de bairro na fonte vêm truncados (15 caracteres) e em caixa alta.</li>
              <li>2026 é um ano parcial.</li>
              <li>A base de cálculo pode diferir do preço negociado (ITBI tem piso fiscal).</li>
              <li>A série começa em 2020 — sem dados anteriores.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}