"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bairroDisplay } from "@/lib/bairros";

export interface BairroOption {
  bairroNorm: string;
  bairro: string;
}

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

export function SearchForm({ bairros }: { bairros: BairroOption[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [rua, setRua] = useState(params.get("rua") ?? "");
  const [numero, setNumero] = useState(params.get("numero") ?? "");
  const [bairro, setBairro] = useState(params.get("bairro") ?? "");
  const [ano, setAno] = useState(params.get("ano") ?? "");
  const [minM2, setMinM2] = useState(params.get("minM2") ?? "");
  const [maxM2, setMaxM2] = useState(params.get("maxM2") ?? "");
  const [porUnidade, setPorUnidade] = useState(
    params.get("porUnidade") === "1",
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (rua.trim()) q.set("rua", rua.trim());
    if (numero.trim()) q.set("numero", numero.trim());
    if (bairro) q.set("bairro", bairro);
    if (ano) q.set("ano", ano);
    if (minM2) q.set("minM2", minM2);
    if (maxM2) q.set("maxM2", maxM2);
    if (porUnidade) q.set("porUnidade", "1");
    router.push(`/busca?${q.toString()}`);
  };

  const clear = () => {
    setRua("");
    setNumero("");
    setBairro("");
    setAno("");
    setMinM2("");
    setMaxM2("");
    setPorUnidade(false);
    router.push("/busca");
  };

  const hasQuery = params.toString().length > 0;

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="grid gap-1.5 lg:col-span-2">
        <Label htmlFor="rua">Rua / avenida</Label>
        <Input
          id="rua"
          value={rua}
          onChange={(e) => setRua(e.target.value)}
          placeholder="ex.: Fernando Machado"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="numero">Número</Label>
        <Input
          id="numero"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="ex.: 813"
          inputMode="numeric"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Bairro</Label>
        <Select
          value={bairro}
          onValueChange={(v) => setBairro(!v || v === "__any" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Qualquer bairro" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__any">Qualquer bairro</SelectItem>
            {bairros.map((b) => (
              <SelectItem key={b.bairroNorm} value={b.bairroNorm}>
                {bairroDisplay(b.bairro)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Ano</Label>
        <Select
          value={ano}
          onValueChange={(v) => setAno(!v || v === "__all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col justify-end gap-2">
        <Button type="submit" className="w-full">
          <Search className="size-4" />
          Buscar
        </Button>
        {hasQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={clear}
          >
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-3">
        <div className="grid gap-1.5">
          <Label htmlFor="minM2">Área mínima (m²)</Label>
          <Input
            id="minM2"
            value={minM2}
            onChange={(e) => setMinM2(e.target.value)}
            inputMode="numeric"
            placeholder="ex.: 50"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="maxM2">Área máxima (m²)</Label>
          <Input
            id="maxM2"
            value={maxM2}
            onChange={(e) => setMaxM2(e.target.value)}
            inputMode="numeric"
            placeholder="ex.: 120"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
        <input
          type="checkbox"
          checked={porUnidade}
          onChange={(e) => setPorUnidade(e.target.checked)}
          className="size-4 rounded border-input accent-foreground"
        />
        Agrupar por unidade (média R$/m² por apto)
      </label>
    </form>
  );
}