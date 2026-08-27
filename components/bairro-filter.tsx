"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function BairroFilter() {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Filtrar bairros…"
        className="pl-9"
        onChange={(e) => {
          const q = e.target.value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
          document.querySelectorAll<HTMLElement>("tr[data-bairro]").forEach((tr) => {
            const b = tr.dataset.bairro ?? "";
            tr.style.display = !q || b.includes(q) ? "" : "none";
          });
        }}
      />
    </div>
  );
}