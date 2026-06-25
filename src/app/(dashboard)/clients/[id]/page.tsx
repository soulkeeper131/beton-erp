"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Името е задължително"),
  companyName: z.string().optional().default(""),
  eik: z.string().optional().default(""),
  vatNumber: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

type Client = {
  id: number;
  name: string;
  companyName: string | null;
  eik: string | null;
  vatNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Site = {
  id: number;
  name: string;
  address: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/clients/${params.id}`);
      if (!res.ok) {
        router.push("/clients");
        return;
      }
      const data = await res.json();
      setClient(data);

      // Load associated sites
      const sitesRes = await fetch(`/api/sites?status=all`);
      if (sitesRes.ok) {
        const allSites = await sitesRes.json();
        setSites(allSites.filter((s: any) => s.clientId === data.id));
      }

      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const openEdit = () => {
    if (!client) return;
    form.reset({
      name: client.name,
      companyName: client.companyName || "",
      eik: client.eik || "",
      vatNumber: client.vatNumber || "",
      address: client.address || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const res = await fetch(`/api/clients/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      const updated = await res.json();
      setClient(updated);
      setDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Зареждане...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Клиентът не е намерен.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/clients")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.companyName && (
            <p className="text-muted-foreground">{client.companyName}</p>
          )}
        </div>
        <Button variant="outline" onClick={openEdit} className="gap-2">
          <Pencil className="h-4 w-4" /> Редактирай
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация за клиента</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Име</dt>
              <dd className="text-sm">{client.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Фирма</dt>
              <dd className="text-sm">{client.companyName || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ЕИК</dt>
              <dd className="text-sm">{client.eik || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ДДС номер</dt>
              <dd className="text-sm">{client.vatNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Адрес</dt>
              <dd className="text-sm">{client.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Телефон</dt>
              <dd className="text-sm">{client.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Имейл</dt>
              <dd className="text-sm">{client.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Създаден на</dt>
              <dd className="text-sm">{formatDate(client.createdAt)}</dd>
            </div>
          </dl>
          {client.notes && (
            <div className="mt-4 pt-4 border-t">
              <dt className="text-sm font-medium text-muted-foreground">Бележки</dt>
              <dd className="text-sm mt-1 whitespace-pre-wrap">{client.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Обекти ({sites.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sites.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Няма обекти за този клиент.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Име</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden md:table-cell">Начало</TableHead>
                    <TableHead className="hidden md:table-cell">Край</TableHead>
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
                      <TableCell>{site.address}</TableCell>
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
                      <TableCell className="hidden md:table-cell">
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
            <DialogTitle>Редактиране на клиент</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Име *</FormLabel>
                    <FormControl>
                      <Input placeholder="Име на клиента" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фирма</FormLabel>
                      <FormControl>
                        <Input placeholder="Име на фирма" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ЕИК</FormLabel>
                      <FormControl>
                        <Input placeholder="ЕИК номер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ДДС номер</FormLabel>
                      <FormControl>
                        <Input placeholder="ДДС номер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input placeholder="Телефонен номер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имейл</FormLabel>
                      <FormControl>
                        <Input placeholder="Имейл адрес" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес</FormLabel>
                    <FormControl>
                      <Input placeholder="Адрес" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <Button type="submit">Запази</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
