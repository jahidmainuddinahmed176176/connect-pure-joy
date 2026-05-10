import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/groups/")({
  component: GroupsPage,
});

type Group = { id: string; name: string; description: string | null; created_at: string; member_count?: number };

function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    setGroups((data as any) ?? []);
    if (user) {
      const { data: mems } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
      setMemberOf(new Set((mems ?? []).map((m: any) => m.group_id)));
    }
  };
  useEffect(() => { load(); }, [user]);

  const join = async (id: string) => {
    if (!user) return;
    await supabase.from("group_members").insert({ group_id: id, user_id: user.id });
    setMemberOf((s) => new Set(s).add(id));
  };

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-display text-xl font-semibold">Groups</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Create
        </button>
      </div>

      <div className="space-y-3 px-5 pb-6">
        {groups.map((g) => {
          const joined = memberOf.has(g.id);
          return (
            <div key={g.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to="/groups/$groupId" params={{ groupId: g.id }} className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                  {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                </Link>
                {joined ? (
                  <span className="rounded-full bg-accent px-3 py-1 text-xs">Joined</span>
                ) : (
                  <button onClick={() => join(g.id)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Join</button>
                )}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No groups yet. Start one.</div>}
      </div>

      {showCreate && user && <CreateGroup onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} userId={user.id} />}
    </div>
  );
}

function CreateGroup({ onClose, onDone, userId }: { onClose: () => void; onDone: () => void; userId: string }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.from("groups").insert({ name: name.trim(), description: desc.trim() || null, created_by: userId }).select("id").single();
      if (error) throw error;
      await supabase.from("group_members").insert({ group_id: data.id, user_id: userId });
      onDone();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur sm:items-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">New group</h3>
          <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <input required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name"
          className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's it about?" rows={3}
          className="w-full resize-none rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={busy || !name.trim()} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {busy ? "…" : "Create group"}
        </button>
      </form>
    </div>
  );
}
