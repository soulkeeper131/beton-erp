"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { formatDate, formatCurrency } from "@/lib/utils";
import { useIsAdmin } from "@/lib/use-is-admin";
import { ArrowLeft, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { PhotoGallery } from "@/components/photo-gallery";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  clientId: z.coerce.number().int().positive("Изберете клиент"),
  name: z.string().min(1, "Името е задължително"),
  city: z.string().optional().default(""),
  address: z.string().min(1, "Адресът е задължителен"),
  status: z.enum(["active", "completed", "cancelled"]),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

type SiteData = {
  id: number;
  clientId: number;
  name: string;
  city: string;
  address: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  clientName: string | null;
  clientCompany: string | null;
  pourings?: Pouring[];
};

type Pouring = {
  id: number;
  date: string;
  quantityM3: number;
  status: string;
  weather: string | null;
  notes: string | null;
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

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [site, setSite] = useState<SiteData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/sites/${params.id}`);
      if (!res.ok) {
        router.push("/sites");
        return;
      }
      const data = await res.json();
      setSite(data);

      // Load clients for edit form
      const clientsRes = await fetch("/api/clients");
      if (clientsRes.ok) {
        setClients(await clientsRes.json());
      }

      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const openEdit = () => {
    if (!site) return;
    form.reset({
      clientId: site.clientId,
      name: site.name,
      city: site.city || "",
      address: site.address,
      status: site.status as FormValues["status"],
      startDate: site.startDate || "",
      endDate: site.endDate || "",
      notes: site.notes || "",
      latitude: site.latitude ?? null,
      longitude: site.longitude ?? null,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const res = await fetch(`/api/sites/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      const updated = await res.json();
      setSite((prev) => prev ? { ...prev, ...updated } : prev);
      setDialogOpen(false);
      // Reload full data
      const fullRes = await fetch(`/api/sites/${params.id}`);
      if (fullRes.ok) setSite(await fullRes.json());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Зареждане...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Обектът не е намерен.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/sites")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <p className="text-muted-foreground">{site.address}</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={openEdit} className="gap-2">
            <Pencil className="h-4 w-4" /> Редактирай
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Информация за обекта</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Име</dt>
                <dd className="text-sm">{site.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Град/Село</dt>
                <dd className="text-sm">{site.city || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Адрес</dt>
                <dd className="text-sm">{site.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Клиент</dt>
                <dd className="text-sm">
                  <button
                    onClick={() => router.push(`/clients/${site.clientId}`)}
                    className="text-primary hover:underline"
                  >
                    {site.clientName || `Клиент #${site.clientId}`}
                  </button>
                  {site.clientCompany && (
                    <span className="text-muted-foreground"> — {site.clientCompany}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Статус</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      statusColors[site.status] || ""
                    }`}
                  >
                    {statusLabels[site.status] || site.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Начална дата</dt>
                <dd className="text-sm">{site.startDate ? formatDate(site.startDate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Крайна дата</dt>
                <dd className="text-sm">{site.endDate ? formatDate(site.endDate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Създаден на</dt>
                <dd className="text-sm">{formatDate(site.createdAt)}</dd>
              </div>
            </dl>
            {site.latitude != null && site.longitude != null && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm font-medium text-muted-foreground">📍 GPS координати</dt>
                <dd className="text-sm">
                  {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                  {" "}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}&zoom=17`}
                    target="_blank"
                    rel="noopener"
                    className="text-orange-400 hover:underline text-xs ml-2"
                  >
                    Отвори карта ↗
                  </a>
                </dd>
              </div>
            )}
            {site.notes && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Бележки</dt>
                <dd className="text-sm mt-1 whitespace-pre-wrap">{site.notes}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последни наливания</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!site.pourings || site.pourings.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Няма наливания за този обект.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {site.pourings.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date)}</TableCell>
                        <TableCell>{p.quantityM3} m³</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{p.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PhotoGallery siteId={params.id as string} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактиране на обект</DialogTitle>
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Град/Село</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="гр. София" />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPS ширина (Latitude)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="42.6977"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPS дължина (Longitude)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="23.3219"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                      <Textarea rows={3} {...field} />
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
