"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataList } from "@/components/ui/data-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

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
type Client = { id: number; name: string; companyName: string | null; eik: string | null; vatNumber: string | null; address: string | null; phone: string | null; email: string | null; notes: string | null };

export default function ClientsPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", companyName: "", eik: "", vatNumber: "", address: "", phone: "", email: "", notes: "" } });

  const fetchClients = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    const res = await fetch(`/api/clients?${params.toString()}`);
    setClients(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(search); }, [search, fetchClients]);

  const openCreate = () => { setEditing(null); form.reset({ name: "", companyName: "", eik: "", vatNumber: "", address: "", phone: "", email: "", notes: "" }); setDialogOpen(true); };
  const openEdit = (client: Client) => { setEditing(client); form.reset({ name: client.name, companyName: client.companyName || "", eik: client.eik || "", vatNumber: client.vatNumber || "", address: client.address || "", phone: client.phone || "", email: client.email || "", notes: client.notes || "" }); setDialogOpen(true); };

  const onSubmit = async (values: FormValues) => {
    if (editing) {
      await fetch(`/api/clients/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    } else {
      await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    }
    setDialogOpen(false);
    fetchClients(search);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Клиенти</h1>
        {isAdmin && <Button onClick={openCreate}>Добави клиент</Button>}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Търсене..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "companyName", label: "Фирма" },
          { key: "eik", label: "ЕИК" },
          { key: "phone", label: "Телефон" },
          { key: "email", label: "Имейл" },
        ]}
        data={clients}
        loading={loading}
        onEdit={(id) => router.push(`/clients/${id}/edit`)}
        isAdmin={isAdmin}
        emptyText={search ? "Няма намерени клиенти" : "Няма клиенти"}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Редактиране на клиент" : "Нов клиент"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Име *</FormLabel><FormControl><Input placeholder="Име на клиента" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Фирма</FormLabel><FormControl><Input placeholder="Име на фирма" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="eik" render={({ field }) => (<FormItem><FormLabel>ЕИК</FormLabel><FormControl><Input placeholder="ЕИК номер" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="vatNumber" render={({ field }) => (<FormItem><FormLabel>ДДС номер</FormLabel><FormControl><Input placeholder="ДДС номер" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Телефон</FormLabel><FormControl><Input placeholder="Телефонен номер" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Имейл</FormLabel><FormControl><Input placeholder="Имейл адрес" type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Адрес</FormLabel><FormControl><Input placeholder="Адрес" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Бележки</FormLabel><FormControl><Textarea placeholder="Допълнителна информация..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отказ</Button>
                <Button type="submit">{editing ? "Запази" : "Създай"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
