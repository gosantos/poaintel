import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Metodologia" };

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Metodologia</h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Como esta plataforma calcula os números a partir dos dados abertos do
        ITBI de Porto Alegre.
      </p>

      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que é o ITBI</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            O Imposto sobre Transmissão de Bens Imóveis (ITBI) é pago a cada
            transferência de propriedade. O valor registrado é a{" "}
            <span className="font-medium text-foreground">base de cálculo</span>{" "}
            da Prefeitura e captura o{" "}
            <span className="font-medium text-foreground">preço real de venda</span>{" "}
            em transações concluídas. Fonte:{" "}
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
          <CardContent className="text-sm leading-relaxed text-foreground">
            Para cada transação:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              R$/m² = base_de_calculo / area_constr_privativa
            </code>
            . Filtramos apartamentos e coberturas, e mantemos linhas com base
            e área privativa positivas.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Células de comparação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            O R$/m² cai conforme a unidade cresce e varia com a época de
            construção, então as comparações usam células de{" "}
            <span className="font-medium text-foreground">construção × tamanho</span>:
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Construção
                </p>
                <ul className="space-y-1 font-mono text-sm">
                  <li>A · até 1969</li>
                  <li>B · 1970–1989</li>
                  <li>C · 1990–2009</li>
                  <li>D · 2010–2019</li>
                  <li>E · 2020+</li>
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Tamanho (m² privativos)
                </p>
                <ul className="space-y-1 font-mono text-sm">
                  <li>S · &lt; 50</li>
                  <li>M · 50–89</li>
                  <li>L · 90–149</li>
                  <li>XL · ≥ 150</li>
                </ul>
              </div>
            </div>
            Células com menos de 3 transações ficam sem mediana. Na cidade o m²
            do XL pode sair mais caro que o do studio, porque o estoque grande
            está nos bairros caros. Por isso comparamos por célula. A mediana
            da cidade ao longo dos anos mistura esses grupos: prédio novo é
            caro e velho é barato, então um X% na média da cidade não é
            valorização do mesmo estoque.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benchmark e a comparação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            O benchmark de cada bairro é a{" "}
            <span className="font-medium text-foreground">mediana (p50)</span>{" "}
            do R$/m² de cada célula. Ao listar uma transação, o desvio{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              % vs p50
            </code>{" "}
            mostra o quanto ela ficou acima ou abaixo da mediana da sua
            célula no mesmo bairro. Valores abaixo da mediana aparecem em
            verde e os acima, em âmbar.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deduplicação e limpeza</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            A mesma unidade pode aparecer mais de uma vez no cadastro, por
            exemplo uma linha <em>Reestimada</em> seguida de <em>Impressa</em>.
            Deduplicamos por rua, número e unidade, priorizamos as linhas
            pagas e descartamos reestimadas sombreadas. Transferências
            parciais (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">perc_transmitido &lt; 100</code>)
            passam para o valor integral do imóvel.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limitações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            <ul className="list-disc space-y-1 pl-5">
              <li>A fonte trunca nomes de bairro em 15 caracteres e usa caixa alta.</li>
              <li>2026 é um ano parcial.</li>
              <li>A base de cálculo pode diferir do preço negociado (ITBI tem piso fiscal).</li>
              <li>A série começa em 2020.</li>
              <li>Médias de R$/m² e área distorcem com outliers, então usamos medianas.</li>
              <li>A série da cidade mistura épocas de obra; a valorização lê-se dentro de cada grupo.</li>
              <li>Busca de rua ignora maiúsculas/acentos e aproxima erros com distância de Levenshtein.</li>
              <li>
                A linha de IPCA mostra a mediana do primeiro ano da série
                reajustada pela variação oficial do índice (IBGE, série BCB SGS
                433). 2026 usa o acumulado até julho.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}