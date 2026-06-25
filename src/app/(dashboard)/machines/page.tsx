"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const typeLabels: Record<string, string> = {
  mixer: "🚛 Миксер", pump: "🏗️ Помпа", vibrator: "〰️ Вибратор", other: "🔧 Друго"
};
const statusLabels: Record<string, string> = {
  available: "✅ Свободна", in_use: "🔴 Заета", maintenance: "🔧 Ремонт"
};

export default function MachinesPage() {
  const router = useRouter();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/machines").then(r => r.json()).then(data => { setMachines(data); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/machines/${id}`, { method: "DELETE" });
    setMachines(machines.filter((m: any) => m.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🚛 Машини</h1>
        <Button onClick={() => router.push("/machines/new")}>+ Нова машина</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Име</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Зареждане...</TableCell></TableRow>
              ) : machines.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center">Няма машини</TableCell></TableRow>
              ) : machines.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{typeLabels[m.type] || m.type}</TableCell>
                  <TableCell>{m.plateNumber || "—"}</TableCell>
                  <TableCell>{statusLabels[m.status] || m.status}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/machines/${m.id}`)}>✏️</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(m.id)}>🗑️</Button>
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
