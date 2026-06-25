"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatCurrency } from "@/lib/utils";

// Inline status badge component
const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      active
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800"
    }`}
  >
    {active ? "Активен" : "Неактивен"}
  </span>
);

const formSchema = z.object({
  name: z.string().min(1, "Името е задължително"),
  className: z.string().optional().default(""),
  pricePerM3: z.coerce.number().min(0, "Цената трябва да е положителна"),
  description: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

type ConcreteType = {
  id: number;
  name: string;
  className: string | null;
  pricePerM3: number;
  description: string | null;
  active: boolean;
};

export default function ConcreteTypesPage() {
  const [types, setTypes] = useState<ConcreteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConcreteType | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", className: "", pricePerM3: 0, description: "" },
  });

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/concrete-types");
    const data = await res.json();
    setTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", className: "", pricePerM3: 0, description: "" });
    setDialogOpen(true);
  };

  const openEdit = (ct: ConcreteType) => {
    setEditing(ct);
    form.reset({
      name: ct.name,
      className: ct.className || "",
      pricePerM3: ct.pricePerM3,
      description: ct.description || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (editing) {
      await fetch(`/api/concrete-types/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } else {
      await fetch("/api/concrete-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    }
    setDialogOpen(false);
    fetchTypes();
  };

  const toggleActive = async (ct: ConcreteType) => {
    await fetch(`/api/concrete-types/${ct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !ct.active }),
    });
    fetchTypes();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Типове бетон</h1>
        <Button onClick={openCreate}>Добави тип</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Зареждане...</div>
          ) : types.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Няма въведени типове бетон.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Име</TableHead>
                    <TableHead>Клас</TableHead>
                    <TableHead>Цена/m³</TableHead>
                    <TableHead className="hidden md:table-cell">Описание</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((ct) => (
                    <TableRow key={ct.id}>
                      <TableCell className="font-medium">{ct.name}</TableCell>
                      <TableCell>{ct.className || "—"}</TableCell>
                      <TableCell>{formatCurrency(ct.pricePerM3).replace(/\s*lv\./i, " лв.")}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {ct.description || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge active={ct.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(ct)}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(ct)}
                            title={ct.active ? "Деактивирай" : "Активирай"}
                          >
                            {ct.active ? "🔴" : "🟢"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактиране на тип бетон" : "Нов тип бетон"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Име</FormLabel>
                    <FormControl>
                      <Input placeholder="напр. Бетон C25/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="className"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Клас</FormLabel>
                    <FormControl>
                      <Input placeholder="напр. B25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerM3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена на m³ (лв.)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Допълнителна информация..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Отказ
                </Button>
                <Button type="submit">
                  {editing ? "Запази" : "Създай"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
