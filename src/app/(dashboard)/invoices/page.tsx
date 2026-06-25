"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<string, string> = { draft: "📝 Чернова", sent: "📤 Изпратена", paid: "✅ Платена", overdue: "🔴 Просрочена" };

export default function InvoicesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { fetch("/api/invoices").then(r => r.json()).then(setItems); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧾 Фактури</h1>
        <Button onClick={() => router.push("/invoices/new")}>+ Нова фактура</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Номер</TableHead><TableHead>Клиент</TableHead><TableHead>Дата</TableHead><TableHead>Сума</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={5}>Няма фактури</TableCell></TableRow> :
              items.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.number}</TableCell>
                  <TableCell>{i.client?.name || "—"}</TableCell>
                  <TableCell>{i.date}</TableCell>
                  <TableCell>{(i.total + i.vatAmount).toFixed(2)} лв</TableCell>
                  <TableCell>{statusLabels[i.status] || i.status}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
