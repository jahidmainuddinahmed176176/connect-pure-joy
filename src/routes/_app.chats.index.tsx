import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./_app.index";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/chats/")({
  component: ChatsPage,
});

type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null };
type Convo = { other: Profile; last: string; at: string };

function ChatsPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("content, created_at, sender_id, recipient_id, sender:profiles!messages_sender_id_fkey(id,username,display_name,avatar_url), recipient:profiles!messages_recipient_id_fkey(id,username,display_name,avatar_url)")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      const map = new Map<string, Convo>();
      (msgs as any[] ?? []).forEach((m) => {
        const other: Profile = m.sender_id === user.id ? m.recipient : m.sender;
        if (!other) return;
        if (!map.has(other.id)) map.set(other.id, { other, last: m.content, at: m.created_at });
      });
      setConvos([...map.values()]);
    })();
  }, [user]);

  useEffect(() => {
    if (!q.trim()) { setPeople([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .ilike("username", `%${q.trim()}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      setPeople((data as any) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q, user]);

  return (
    <div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-input px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find someone by username"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {q.trim()
          ? people.map((p) => <PersonRow key={p.id} p={p} />)
          : convos.map((c) => (
              <Link
                key={c.other.id}
                to="/chats/$userId"
                params={{ userId: c.other.id }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40"
              >
                <Avatar name={c.other.display_name ?? c.other.username} url={c.other.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.other.display_name ?? c.other.username}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.last}</div>
                </div>
              </Link>
            ))}
        {!q.trim() && convos.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">Search a username to start chatting.</div>
        )}
      </div>
    </div>
  );
}

function PersonRow({ p }: { p: Profile }) {
  return (
    <Link
      to="/chats/$userId"
      params={{ userId: p.id }}
      className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40"
    >
      <Avatar name={p.display_name ?? p.username} url={p.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{p.display_name ?? p.username}</div>
        <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
      </div>
    </Link>
  );
}
