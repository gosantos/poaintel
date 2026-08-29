import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Dados abertos da Secretaria Municipal da Fazenda de Porto Alegre.{" "}
          <a
            href="https://dadosabertos.poa.br/dataset/itbi"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            dadosabertos.poa.br/itbi
          </a>
          .
        </p>
        <nav aria-label="Rodapé" className="flex gap-4">
          <Link href="/insights" className="underline-offset-2 hover:text-foreground hover:underline">
            Intel
          </Link>
          <Link href="/sobre" className="underline-offset-2 hover:text-foreground hover:underline">
            Metodologia
          </Link>
          <Link href="/bairros" className="underline-offset-2 hover:text-foreground hover:underline">
            Bairros
          </Link>
        </nav>
      </div>
    </footer>
  );
}