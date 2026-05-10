import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./_app.index";
import { toast } from "sonner";
import { LogOut, Camera } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url);
      }
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const onAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(url);
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="px-5 py-6">
      <h2 className="font-display mb-6 text-xl font-semibold">Profile</h2>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          <Avatar name={displayName || username || "?"} url={avatarUrl} size={72} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground disabled:opacity-40"
            aria-label="Change avatar"
          >
            <Camera className="h-3 w-3" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatar(f);
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{displayName || username}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full resize-none rounded-xl bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>

      <button
        onClick={signOut}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 py-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
