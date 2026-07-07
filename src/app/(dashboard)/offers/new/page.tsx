"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

const itemSchema = z.object({
  itemType: z.enum(["concrete", "service"]).default("concrete"),
  concreteTypeId: z.coerce.number().int().positive().optional().nullable(),
  serviceId: z.coerce.number().int().positive().optional().nullable(),
  quantityM3: z.coerce.number().positive("Количеството трябва да е положително"),
  pricePerM3: z.coerce.number().min(0, "Цената не може да е отрицателна"),
  transportCost: z.coerce.number().min(0).optional().default(0),
  pumpCost: z.coerce.number().min(0).optional().default(0),
});

const formSchema = z.object({
  clientId: z.coerce.number().int().positive("Изберете клиент"),
  siteId: z.coerce.number().int().optional().nullable(),
  date: z.string().min(1, "Датата е задължителна"),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, "Добавете поне един ред"),
});

type FormValues = z.infer<typeof formSchema>;

type Client = {
  id: number;
  name: string;
};

type Site = {
  id: number;
  name: string;
  clientId: number;
};

type Service = {
  id: number;
  name: string;
  basePrice: number | null;
  unit: string;
};

type ConcreteType = {
  id: number;
  name: string;
  className: string | null;
  pricePerM3: number;
  active?: boolean;
};

export default function NewOfferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSiteId = searchParams.get("siteId");
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [concreteTypes, setConcreteTypes] = useState<ConcreteType[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: 0,
      siteId: null,
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      notes: "",
      items: [
        {
          itemType: "concrete" as const,
          concreteTypeId: 0,
          serviceId: null,
          quantityM3: 1,
          pricePerM3: 0,
          transportCost: 0,
          pumpCost: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchClientId = form.watch("clientId");

  // Calculate grand total
  const grandTotal = (watchItems || []).reduce(
    (sum, item) =>
      sum +
      (item.quantityM3 || 0) * (item.pricePerM3 || 0) +
      (item.transportCost || 0) +
      (item.pumpCost || 0),
    0
  );

  // Load data
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients);
    fetch("/api/sites")
      .then((r) => r.json())
      .then(setSites);
    fetch("/api/concrete-types")
      .then((r) => r.json())
      .then(setConcreteTypes);
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices);
    fetch("/api/catalog")
      .then((r) => r.json())
      .then(setCatalog);
  }, []);

  // Pre-select site from URL param (e.g. from map popup)
  useEffect(() => {
    if (!preselectedSiteId || sites.length === 0) return;
    const site = sites.find(s => String(s.id) === preselectedSiteId);
    if (site) {
      form.setValue("clientId", site.clientId);
      form.setValue("siteId", site.id);
    }
  }, [preselectedSiteId, sites]);

  // Filter sites by selected client
  const filteredSites = watchClientId
    ? sites.filter((s) => s.clientId === watchClientId)
    : sites;

  // When concrete type changes, auto-fill price
  const handleConcreteTypeChange = (index: number, typeId: string) => {
    const ct = concreteTypes.find((c) => c.id === parseInt(typeId));
    if (ct) {
      form.setValue(`items.${index}.pricePerM3`, ct.pricePerM3);
    }
  };

  const addItem = () => {
    append({
      itemType: "concrete" as const,
      concreteTypeId: 0,
      serviceId: null,
      quantityM3: 1,
      pricePerM3: 0,
      transportCost: 0,
      pumpCost: 0,
    });
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      // Create the offer
      const offerRes = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: values.clientId,
          siteId: values.siteId || null,
          date: values.date,
          validUntil: values.validUntil || null,
          notes: values.notes || null,
        }),
      });

      if (!offerRes.ok) {
        const err = await offerRes.json();
        alert("Грешка при създаване: " + JSON.stringify(err));
        setSaving(false);
        return;
      }

      const offer = await offerRes.json();

      // Create items
      for (const item of values.items) {
        await fetch(`/api/offers/${offer.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concreteTypeId: item.itemType === "concrete" ? item.concreteTypeId : null,
            serviceId: item.itemType === "service" ? item.serviceId : null,
            quantityM3: item.quantityM3,
            pricePerM3: item.pricePerM3,
            transportCost: item.transportCost || 0,
            pumpCost: item.pumpCost || 0,
          }),
        });
      }

      router.push(`/offers/${offer.id}`);
    } catch (e) {
      alert("Грешка при създаване на оферта");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Нова оферта</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header fields */}
          <Card>
            <CardHeader>
              <CardTitle>Основна информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Клиент *</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => {
                          field.onChange(val ? parseInt(val) : 0);
                          form.setValue("siteId", null);
                        }}
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
                  name="siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Обект</FormLabel>
                      <Select
                        value={
                          field.value ? String(field.value) : ""
                        }
                        onValueChange={(val) =>
                          field.onChange(val ? parseInt(val) : null)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Изберете обект (опционално)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredSites.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Валидна до</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
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
                        rows={2}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Редове в офертата</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Добави ред
              </Button>
              {catalog?.allVariants?.length > 0 && (
                <Select onValueChange={(val) => {
                  const v = catalog.allVariants.find((x: any) => String(x.id) === val);
                  if (!v) return;
                  append({
                    itemType: "concrete" as const,
                    concreteTypeId: v.concreteTypeId || null,
                    serviceId: v.serviceId || null,
                    quantityM3: v.quantity || 1,
                    pricePerM3: v.pricePerUnit || 0,
                    transportCost: 0,
                    pumpCost: 0,
                  });
                }}>
                  <SelectTrigger className="w-[260px] h-8 text-xs">
                    <SelectValue placeholder="➕ От каталог (варианти)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {catalog.allVariants.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                        <span className="font-medium">{v.label}</span>
                        <span className="text-muted-foreground ml-2">{v.pricePerUnit} лв/{v.unit}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Няма добавени редове. Натиснете &quot;Добави ред&quot; за да започнете.
                </p>
              )}

              {fields.map((field, index) => {
                const item = watchItems?.[index];
                const itemTotal = item
                  ? (item.quantityM3 || 0) * (item.pricePerM3 || 0) +
                    (item.transportCost || 0) +
                    (item.pumpCost || 0)
                  : 0;

                return (
                  <div
                    key={field.id}
                    className="border rounded-lg p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Ред {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant={item?.itemType === "concrete" ? "default" : "outline"} className="h-7 text-xs px-2" onClick={() => { form.setValue(`items.${index}.itemType`, "concrete"); form.setValue(`items.${index}.serviceId`, null); }}>
                        🧱 Бетон
                      </Button>
                      <Button type="button" size="sm" variant={item?.itemType === "service" ? "default" : "outline"} className="h-7 text-xs px-2" onClick={() => { form.setValue(`items.${index}.itemType`, "service"); form.setValue(`items.${index}.concreteTypeId`, null); }}>
                        🔧 Услуга
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {item?.itemType === "service" ? (
                        <FormField
                          control={form.control}
                          name={`items.${index}.serviceId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Услуга *</FormLabel>
                              <Select
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(val) => {
                                  field.onChange(val ? parseInt(val) : 0);
                                  const svc = services.find(s => s.id === parseInt(val));
                                  if (svc?.basePrice) form.setValue(`items.${index}.pricePerM3`, svc.basePrice);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Изберете услуга" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {services.filter(s => s.basePrice != null).map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {s.name} ({s.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name={`items.${index}.concreteTypeId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Тип бетон *</FormLabel>
                              <Select
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(val) => {
                                  field.onChange(val ? parseInt(val) : 0);
                                  handleConcreteTypeChange(index, val);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Изберете" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {concreteTypes.filter(ct => ct.active !== false).map((ct) => (
                                    <SelectItem key={ct.id} value={String(ct.id)}>
                                      {ct.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantityM3`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Количество *
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                className="h-9"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.pricePerM3`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Цена/m³ (лв) *
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-9"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.transportCost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Транспорт (лв)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-9"
                                value={field.value ?? 0}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.pumpCost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Помпа (лв)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-9"
                                value={field.value ?? 0}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="text-right text-sm font-semibold">
                      Общо за реда: {formatCurrency(itemTotal)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Total and save */}
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="text-lg">
                <span className="text-muted-foreground">Сума без ДДС: </span>
                <span className="font-bold text-2xl">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Отказ
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Запазване..." : "Запази оферта"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
