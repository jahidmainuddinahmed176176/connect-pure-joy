import { AddDestination } from '~/components/AddDestination'
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Paperclip, X, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/")({
  component: FeedPage,
});

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(url);
}

function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(100);
    setPosts((data as any) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!content.trim() && !image)) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (image) {
        const path = `${user.id}/${Date.now()}-${image.name}`;
        const { error: upErr } = await supabase.storage.from("post-images").upload(path, image);
        if (upErr) throw upErr;
        image_url = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: content.trim(), image_url });
      if (error) throw error;
      setContent(""); setImage(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="divide-y divide-border/60">
      {/* Add Destination Form */}
      <div className="border-b border-border/60">
        <AddDestination />
      </div>

      {/* Existing Post Form */}
      <form onSubmit={submit} className="space-y-3 px-5 py-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={2}
          maxLength={2000}
          className="w-full resize-none rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {image && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{image.name}</span>
            <button type="button" onClick={() => setImage(null)}><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" /> Attach
          </button>
          <input ref={fileRef} type="file" hidden onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          <button
            disabled={busy || (!content.trim() && !image)}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> Post
          </button>
        </div>
      </form>

      {/* Posts Feed */}
      {posts.map((p) => (
        <article key={p.id} className="px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Avatar name={p.profiles?.display_name ?? p.profiles?.username ?? "?"} url={p.profiles?.avatar_url} />
            <div className="text-sm">
              <div className="font-semibold">{p.profiles?.display_name ?? p.profiles?.username}</div>
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</div>
            </div>
          </div>
          {p.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.content}</p>}
          {p.image_url && (
            isImageUrl(p.image_url)
              ? <img src={p.image_url} alt="" className="mt-3 w-full rounded-xl border border-border/60" loading="lazy" />
              : (
                <a
                  href={p.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm text-primary hover:bg-accent/40"
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">{decodeURIComponent(p.image_url.split("/").pop() ?? "Attachment")}</span>
                </a>
              )
          )}
        </article>
      ))}
      {posts.length === 0 && (
        <div className="p-12 text-center text-sm text-muted-foreground">No posts yet. Be first.</div>
      )}
    </div>
  );
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div
      className="flex items-center justify-center rounded-full bg-accent font-display text-xs font-semibold uppercase"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1)}
    </div>
  );
}