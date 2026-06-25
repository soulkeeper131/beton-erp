"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MaterialsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { fetch("/api/materials").then(r => r.json()).then(setItems); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 Склад</h1>
        <Button onClick={() => router.push("/materials/new")}>+ Нов материал</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Име</TableHead><TableHead>Наличност</TableHead><TableHead>Мин. праг</TableHead><TableHead>Цена</TableHead><TableHead>Действия</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={5}>Няма материали</TableCell></TableRow> :
              items.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.quantity} {m.unit}</TableCell>
                  <TableCell>{m.minThreshold} {m.unit}</TableCell>
                  <TableCell>{m.pricePerUnit ? `${m.pricePerUnit} лв` : "—"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/materials/${m.id}`)}>✏️</Button>
                    <Button variant="destructive" size="sm" onClick={async () => { if(confirm("Сигурен ли си?")) { await fetch(`/api/materials/${m.id}`, {method:"DELETE"}); setItems(items.filter(x => x.id !== m.id)); }}}>🗑️</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
