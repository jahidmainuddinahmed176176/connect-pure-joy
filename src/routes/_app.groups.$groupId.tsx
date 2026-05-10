import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./_app.index";
import { ArrowLeft, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/groups/$groupId")({
  component: GroupPage,
});

type Group = { id: string; name: string; description: string | null };
type GPost = {
  id: string; user_id: string; content: string; created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

function GroupPage() {
  const { groupId } = Route.useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GPost[]>([]);
  const [member, setMember] = useState(false);
  const [text, setText] = useState("");

  const load = async () => {
    const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
    setGroup(g as any);
    const { data: p } = await supabase
      .from("group_posts")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    setPosts((p as any) ?? []);
    if (user) {
      const { data: m } = await supabase.from("group_members").select("user_id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
      setMember(!!m);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`gp-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_posts", filter: `group_id=eq.${groupId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId, user]);

  const join = async () => {
    if (!user) return;
    await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
    setMember(true);
  };

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const content = text.trim(); setText("");
    const { error } = await supabase.from("group_posts").insert({ group_id: groupId, user_id: user.id, content });
    if (error) toast.error(error.message);
  };

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
        <Link to="/groups" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-lg font-semibold">{group?.name ?? "…"}</h2>
          {group?.description && <p className="truncate text-xs text-muted-foreground">{group.description}</p>}
        </div>
        {!member && user && (
          <button onClick={join} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Join</button>
        )}
      </div>

      {member && (
        <form onSubmit={post} className="flex gap-2 border-b border-border/60 px-5 py-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something with the group"
            className="flex-1 rounded-full bg-input px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button disabled={!text.trim()} className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="divide-y divide-border/60">
        {posts.map((p) => (
          <div key={p.id} className="px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <Avatar name={p.profiles?.display_name ?? p.profiles?.username ?? "?"} url={p.profiles?.avatar_url} size={32} />
              <div className="text-sm">
                <div className="font-semibold">{p.profiles?.display_name ?? p.profiles?.username}</div>
                <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</div>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.content}</p>
          </div>
        ))}
        {posts.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No posts yet.</div>}
      </div>
    </div>
  );
}
