"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<string, string> = { active: "✅ Активен", inactive: "❌ Неактивен" };

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workers").then(r => r.json()).then(data => { setWorkers(data); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/workers/${id}`, { method: "DELETE" });
    setWorkers(workers.filter((w: any) => w.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👷 Работници</h1>
        <Button onClick={() => router.push("/workers/new")}>+ Нов работник</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Име</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Дневна ставка</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Зареждане...</TableCell></TableRow>
              ) : workers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center">Няма работници</TableCell></TableRow>
              ) : workers.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.phone || "—"}</TableCell>
                  <TableCell>{w.dailyRate} лв</TableCell>
                  <TableCell>{statusLabels[w.status] || w.status}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/workers/${w.id}`)}>✏️</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(w.id)}>🗑️</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
