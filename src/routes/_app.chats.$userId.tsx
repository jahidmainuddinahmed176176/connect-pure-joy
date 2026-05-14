import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./_app.index";
import { ArrowLeft, Send, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chats/$userId")({
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string };
type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(url);
}

function ChatPage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (!user || (!text.trim() && !file)) return;
    setUploading(true);
    try {
      let content = text.trim();
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file);
        if (upErr) throw upErr;
        const url = supabase.storage.from("chat-files").getPublicUrl(path).data.publicUrl;
        content = content ? `${content}\n${url}` : url;
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
      setText("");
      await supabase.from("messages").insert({ sender_id: user.id, recipient_id: userId, content });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
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
          const lines = m.content.split("\n");
          const urlRegex = /^https?:\/\//;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] space-y-1 rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                {lines.map((line, i) =>
                  urlRegex.test(line) ? (
                    isImageUrl(line) ? (
                      <img key={i} src={line} alt="attachment" className="max-w-full rounded-xl" loading="lazy" />
                    ) : (
                      <a key={i} href={line} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline opacity-90">
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="truncate">{decodeURIComponent(line.split("/").pop() ?? "File")}</span>
                      </a>
                    )
                  ) : (
                    line ? <span key={i} className="block">{line}</span> : null
                  )
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-border/60 px-5 py-3 space-y-2">
        {file && (
          <div className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{file.name}</span>
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message"
            className="flex-1 rounded-full bg-input px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40"
            disabled={uploading || (!text.trim() && !file)}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
