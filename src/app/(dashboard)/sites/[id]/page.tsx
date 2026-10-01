"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  acts: SiteAct[];
  offers: { id: number; number: string; date: string; validUntil: string | null; status: string; total: number }[];
  upcoming: { id: number; plannedDate: string; estimatedM3: number | null; status: string; notes: string | null; concreteTypeName: string | null; machineName: string | null }[];
  summary: {
    actsCount: number; pouredM3: number; unbilledCount: number; unbilledM3: number;
    offered?: number; pouredValue?: number; invoicedValue?: number; unbilledValue?: number;
  };
};

type SiteAct = {
  id: number;
  date: string;
  quantityM3: number;
  total: number | null;
  offerId: number | null;
  offerNumber: string | null;
  invoiced: boolean;
  invoice: { id: number; number: string; status: string } | null;
};

const offerStatusLabels: Record<string, string> = { draft: "📝 Чернова", sent: "📤 Изпратена", accepted: "✅ Приета", rejected: "❌ Отказана" };
const planStatusLabels: Record<string, string> = { planned: "Планиран", confirmed: "Потвърден", done: "Изпълнен", postponed: "Отложен" };

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
    } else {
      alert((await res.json().catch(() => null))?.error || "Грешка при запис");
    }
  };

  const hasFinance = site?.summary?.pouredValue !== undefined;
  const unbilledIds = (site?.acts || []).filter((a) => !a.invoiced).map((a) => a.id);

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

      </div>

      {/* Обобщение */}
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-sm" data-testid="site-summary">
          {site.summary.offered !== undefined && (
            <div><div className="text-muted-foreground text-xs">Оферирано</div><div className="text-lg font-semibold">{formatCurrency(site.summary.offered)}</div></div>
          )}
          <div>
            <div className="text-muted-foreground text-xs">Изляно ({site.summary.actsCount} {site.summary.actsCount === 1 ? "акт" : "акта"})</div>
            <div className="text-lg font-semibold">{site.summary.pouredM3.toFixed(2)} m³</div>
            {site.summary.pouredValue !== undefined && <div className="text-xs text-muted-foreground">{formatCurrency(site.summary.pouredValue)} без ДДС</div>}
          </div>
          {site.summary.invoicedValue !== undefined && (
            <div><div className="text-muted-foreground text-xs">Фактурирано</div><div className="text-lg font-semibold">{formatCurrency(site.summary.invoicedValue)}</div></div>
          )}
          <div>
            <div className="text-muted-foreground text-xs">Чака фактура</div>
            <div className={`text-lg font-semibold ${site.summary.unbilledCount ? "text-orange-600" : ""}`}>
              {site.summary.unbilledValue !== undefined ? formatCurrency(site.summary.unbilledValue) : `${site.summary.unbilledM3.toFixed(2)} m³`}
            </div>
            <div className="text-xs text-muted-foreground">{site.summary.unbilledCount} {site.summary.unbilledCount === 1 ? "акт" : "акта"} · {site.summary.unbilledM3.toFixed(2)} m³</div>
          </div>
        </CardContent>
      </Card>

      {/* Актове */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>📋 Актове</CardTitle>
          <div className="flex gap-2">
            {isAdmin && unbilledIds.length > 0 && (
              <Button size="sm" onClick={() => router.push(`/invoices/new?pourings=${unbilledIds.join(",")}`)}>
                🧾 Фактурирай нефактурираните ({unbilledIds.length})
              </Button>
            )}
            {isAdmin && <Button size="sm" variant="outline" onClick={() => router.push(`/pourings/new?siteId=${site.id}`)}>+ Нов акт</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {site.acts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Няма актове за този обект.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Акт</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                    {hasFinance && <TableHead className="text-right">Сума</TableHead>}
                    <TableHead>Оферта</TableHead>
                    {hasFinance && <TableHead>Фактура</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {site.acts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><Link href={`/pourings/${a.id}`} className="text-primary hover:underline">№{a.id}</Link></TableCell>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.quantityM3.toFixed(2)} m³</TableCell>
                      {hasFinance && <TableCell className="text-right tabular-nums">{formatCurrency(a.total || 0)}</TableCell>}
                      <TableCell>{a.offerId ? <Link href={`/offers/${a.offerId}`} className="hover:underline">{a.offerNumber}</Link> : "—"}</TableCell>
                      {hasFinance && (
                        <TableCell>{a.invoice
                          ? <Link href={`/invoices/${a.invoice.id}`} className="hover:underline">{a.invoice.status === "draft" ? "чернова" : a.invoice.number}</Link>
                          : <span className="text-orange-600">нефактуриран</span>}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasFinance && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>📄 Оферти</CardTitle>
              {isAdmin && <Button size="sm" variant="outline" onClick={() => router.push(`/offers/new?siteId=${site.id}`)}>+ Нова оферта</Button>}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {site.offers.length === 0 ? <p className="text-muted-foreground">Няма оферти.</p> : site.offers.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <Link href={`/offers/${o.id}`} className="text-primary hover:underline">{o.number}</Link>
                  <span className="text-muted-foreground">{offerStatusLabels[o.status] || o.status}</span>
                  <span className="tabular-nums">{formatCurrency(o.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>📅 Предстоящи наливания</CardTitle>
            <Button size="sm" variant="outline" onClick={() => router.push("/calendar")}>Календар</Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {site.upcoming.length === 0 ? <p className="text-muted-foreground">Няма планирани.</p> : site.upcoming.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{formatDate(u.plannedDate)}</span>
                <span className="text-muted-foreground">
                  {[u.concreteTypeName, u.estimatedM3 ? `${u.estimatedM3} m³` : null, u.machineName].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="text-xs">{planStatusLabels[u.status] || u.status}</span>
              </div>
            ))}
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
