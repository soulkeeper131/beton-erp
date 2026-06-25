"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Poured {
  id: number;
  date: string;
  quantityM3: number;
  status: string;
  weather: string | null;
  notes: string | null;
  siteId: number;
  concreteTypeId: number;
  machineId: number | null;
  site: { id: number; name: string } | null;
  concreteType: { id: number; name: string; pricePerM3: number } | null;
  machine: { id: number; name: string } | null;
}

export default function PouringsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pourings, setPourings] = useState<Poured[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [filterSite, setFilterSite] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(setSites);
    loadPourings();
  }, [filterSite]);

  async function loadPourings() {
    setLoading(true);
    const url = filterSite !== "all" ? `/api/pourings?siteId=${filterSite}` : "/api/pourings";
    const res = await fetch(url);
    if (res.ok) setPourings(await res.json());
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/pourings/${id}`, { method: "DELETE" });
    loadPourings();
  }

  const statusLabel: Record<string, string> = { completed: "✅ Изпълнено", planned: "📋 Планирано" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Актувания</h1>
        <Button onClick={() => router.push("/pourings/new")}>+ Ново актуване</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Филтри</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filterSite} onValueChange={setFilterSite}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Всички обекти" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички обекти</SelectItem>
              {sites.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Обект</TableHead>
                <TableHead>Тип бетон</TableHead>
                <TableHead>К-во m³</TableHead>
                <TableHead>Машина</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Зареждане...</TableCell></TableRow>
              ) : pourings.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center">Няма актувания</TableCell></TableRow>
              ) : pourings.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{p.site?.name || "—"}</TableCell>
                  <TableCell>{p.concreteType?.name || "—"}</TableCell>
                  <TableCell>{p.quantityM3}</TableCell>
                  <TableCell>{p.machine?.name || "—"}</TableCell>
                  <TableCell>{statusLabel[p.status] || p.status}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/pourings/${p.id}`)}>✏️</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>🗑️</Button>
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
