"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HomeSearch() {
  const router = useRouter();
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (rua.trim()) q.set("rua", rua.trim());
    if (numero.trim()) q.set("numero", numero.trim());
    router.push(`/busca?${q.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
    >
      <Input
        value={rua}
        onChange={(e) => setRua(e.target.value)}
        placeholder="Digite a rua ou avenida… ex.: Fernando Machado"
        className="h-12 flex-1 bg-card text-base"
      />
      <Input
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        placeholder="Nº"
        className="h-12 w-full bg-card text-base sm:w-24"
        inputMode="numeric"
      />
      <Button type="submit" size="lg" className="h-12">
        <Search className="size-4" />
        Buscar
      </Button>
    </form>
  );
}