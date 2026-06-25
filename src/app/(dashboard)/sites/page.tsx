"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

const formSchema = z.object({
  clientId: z.coerce.number().int().positive("Изберете клиент"),
  name: z.string().min(1, "Името е задължително"),
  address: z.string().min(1, "Адресът е задължителен"),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

type Site = {
  id: number;
  clientId: number;
  name: string;
  address: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  clientName: string | null;
  clientCompany: string | null;
};

type Client = {
  id: number;
  name: string;
};

const statusLabels: Record<string, string> = {
  active: "Активен",
  completed: "Завършен",
  cancelled: "Отказан",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: 0,
      name: "",
      address: "",
      status: "active",
      startDate: "",
      endDate: "",
      notes: "",
    },
  });

  const fetchSites = useCallback(async (status: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    const res = await fetch(`/api/sites?${params.toString()}`);
    const data = await res.json();
    setSites(data);
    setLoading(false);
  }, []);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
  }, []);

  useEffect(() => {
    fetchSites(statusFilter);
  }, [statusFilter, fetchSites]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      clientId: 0,
      name: "",
      address: "",
      status: "active",
      startDate: "",
      endDate: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditing(site);
    form.reset({
      clientId: site.clientId,
      name: site.name,
      address: site.address,
      status: site.status as FormValues["status"],
      startDate: site.startDate || "",
      endDate: site.endDate || "",
      notes: site.notes || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (editing) {
      await fetch(`/api/sites/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } else {
      await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    }
    setDialogOpen(false);
    fetchSites(statusFilter);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Обекти</h1>
        <Button onClick={openCreate}>Добави обект</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Всички</TabsTrigger>
          <TabsTrigger value="active">Активни</TabsTrigger>
          <TabsTrigger value="completed">Завършени</TabsTrigger>
          <TabsTrigger value="cancelled">Отказани</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Зареждане...</div>
          ) : sites.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Няма намерени обекти.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Име</TableHead>
                    <TableHead className="hidden md:table-cell">Клиент</TableHead>
                    <TableHead className="hidden lg:table-cell">Адрес</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Начало</TableHead>
                    <TableHead className="hidden lg:table-cell">Край</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow
                      key={site.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/sites/${site.id}`)}
                    >
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {site.clientName || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                        {site.address}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            statusColors[site.status] || ""
                          }`}
                        >
                          {statusLabels[site.status] || site.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {site.startDate ? formatDate(site.startDate) : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {site.endDate ? formatDate(site.endDate) : "—"}
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактиране на обект" : "Нов обект"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Клиент *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(val) => field.onChange(parseInt(val))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Изберете клиент" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Име на обект *</FormLabel>
                    <FormControl>
                      <Input placeholder="напр. Жилищна сграда ул. Витоша" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес *</FormLabel>
                    <FormControl>
                      <Input placeholder="Пълен адрес" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Активен</SelectItem>
                        <SelectItem value="completed">Завършен</SelectItem>
                        <SelectItem value="cancelled">Отказан</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Начална дата</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Крайна дата</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Бележки</FormLabel>
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
