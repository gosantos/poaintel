import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Dados abertos da Secretaria Municipal da Fazenda de Porto Alegre —{" "}
          <a
            href="https://dadosabertos.poa.br/dataset/itbi"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            dadosabertos.poa.br/itbi
          </a>
          .
        </p>
        <div className="flex gap-4">
          <Link href="/insights" className="hover:text-foreground">
            Intel
          </Link>
          <Link href="/sobre" className="hover:text-foreground">
            Metodologia
          </Link>
          <Link href="/bairros" className="hover:text-foreground">
            Bairros
          </Link>
        </div>
      </div>
    </footer>
  );
}