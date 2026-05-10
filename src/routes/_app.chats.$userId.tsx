import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./_app.index";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/_app/chats/$userId")({
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string };
type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function ChatPage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", userId).maybeSingle();
      setOther(prof as any);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order("created_at");
      setMsgs((data as any) ?? []);
    })();

    const ch = supabase
      .channel(`chat-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (
          (m.sender_id === user?.id && m.recipient_id === userId) ||
          (m.sender_id === userId && m.recipient_id === user?.id)
        ) setMsgs((prev) => [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({ sender_id: user.id, recipient_id: userId, content });
  };

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
        <Link to="/chats" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        {other && <Avatar name={other.display_name ?? other.username} url={other.avatar_url} size={32} />}
        <div className="text-sm font-semibold">{other?.display_name ?? other?.username ?? "…"}</div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border/60 px-5 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="flex-1 rounded-full bg-input px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
