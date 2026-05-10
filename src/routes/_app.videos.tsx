import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/videos")({
  component: VideosPage,
});

type Video = {
  id: string; title: string; description: string | null; video_url: string; thumbnail_url: string | null; created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*, profiles(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setVideos((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-display text-xl font-semibold">Videos</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Upload className="h-3.5 w-3.5" /> Upload
        </button>
      </div>

      <div className="space-y-6 px-5 pb-6">
        {videos.map((v) => (
          <div key={v.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <video src={v.video_url} controls poster={v.thumbnail_url ?? undefined} className="aspect-video w-full bg-black" />
            <div className="p-4">
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {v.profiles?.display_name ?? v.profiles?.username}
              </p>
              {v.description && <p className="mt-2 text-sm text-muted-foreground">{v.description}</p>}
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">No videos yet.</div>
        )}
      </div>

      {showUpload && user && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} userId={user.id} />}
    </div>
  );
}

function UploadModal({ onClose, onDone, userId }: { onClose: () => void; onDone: () => void; userId: string }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setBusy(true);
    try {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file);
      if (upErr) throw upErr;
      const url = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("videos").insert({
        user_id: userId, title: title.trim(), description: desc.trim() || null, video_url: url,
      });
      if (error) throw error;
      toast.success("Uploaded");
      onDone();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur sm:items-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Upload video</h3>
          <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full resize-none rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground hover:bg-accent/40">
          {file ? file.name : "Choose video file"}
        </button>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button disabled={busy || !file || !title.trim()} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
