"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Pencil, Trash2, Shield, ShieldCheck, ShieldAlert, User } from "lucide-react";

type UserRow = { id: number; email: string; name: string; role: string; phone: string | null; active: boolean };

const roleIcons: Record<string, any> = {
  admin: ShieldCheck,
  manager: Shield,
  brigadir: ShieldAlert,
  employee: User,
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  brigadir: "bg-yellow-100 text-yellow-700",
  employee: "bg-green-100 text-green-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [form, setForm] = useState({ email: "", password: "", name: "", role: "employee", phone: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/users");
      if (r.status === 403) { setError("Нямате администраторски права"); setUsers([]); return; }
      const d = await r.json();
      setUsers(Array.isArray(d) ? d : []);
      setError("");
    } catch { setError("Грешка при зареждане"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAdd = () => {
    setEditingUser(null);
    setForm({ email: "", password: "", name: "", role: "employee", phone: "" });
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({ email: u.email, password: "", name: u.name, role: u.role, phone: u.phone || "" });
    setFormError("");
    setDialogOpen(true);
  };

  const saveUser = async () => {
    setFormError("");
    if (!form.email || !form.name) { setFormError("Email и име са задължителни"); return; }
    if (!editingUser && !form.password) { setFormError("Паролата е задължителна за нов потребител"); return; }

    setSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: any = { email: form.email, name: form.name, role: form.role, phone: form.phone };
      if (form.password) body.password = form.password;

      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || "Грешка"); return; }

      setDialogOpen(false);
      fetchUsers();
    } catch { setFormError("Грешка при запис"); } finally { setSaving(false); }
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${u.name}"?`)) return;
    try {
      await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      fetchUsers();
    } catch { alert("Грешка при изтриване"); }
  };

  const toggleActive = async (u: UserRow) => {
    try {
      await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !u.active }),
      });
      fetchUsers();
    } catch { alert("Грешка"); }
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Потребители</h1>
        <Button onClick={openAdd} className="gap-2">
          <UserPlus className="w-4 h-4" /> Нов потребител
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Зареждане...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Няма потребители</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Име</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Роля</th>
                    <th className="text-left p-3 font-medium">Телефон</th>
                    <th className="text-center p-3 font-medium">Активен</th>
                    <th className="text-right p-3 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const Icon = roleIcons[u.role] || User;
                    return (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3 text-gray-500">{u.email}</td>
                        <td className="p-3">
                          <Badge className={`inline-flex items-center gap-1 ${roleColors[u.role] || "bg-gray-100"}`}>
                            <Icon className="w-3 h-3" /> {u.role}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-500">{u.phone || "-"}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleActive(u)}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
                          >
                            {u.active ? "Да" : "Не"}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-800" onClick={() => deleteUser(u)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Редакция на потребител" : "Нов потребител"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Име *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Иван Иванов" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ivan@beton.bg" />
            </div>
            <div>
              <Label>Парола {!editingUser ? "*" : "(остави празно за без промяна)"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
            </div>
            <div>
              <Label>Роля</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <option value="admin">Администратор</option>
                <option value="manager">Мениджър</option>
                <option value="brigadir">Бригадир</option>
                <option value="employee">Служител</option>
              </Select>
            </div>
            <div>
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+359..." />
            </div>
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отказ</Button>
              <Button onClick={saveUser} disabled={saving}>{saving ? "Запис..." : "Запис"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
