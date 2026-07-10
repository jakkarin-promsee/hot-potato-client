import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Trash2,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import { useAuthStore } from "../stores/auth.store";
import { useContentStore } from "../stores/content.store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    contents,
    isLoading,
    error,
    fetchMyContents,
    searchContents,
    createContent,
    deleteContent,
  } = useContentStore();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchMyContents();
  }, [fetchMyContents]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.trim()) {
        searchContents(search);
      } else {
        fetchMyContents();
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, searchContents, fetchMyContents]);

  const handleCreate = async () => {
    setCreating(true);
    const content_id = await createContent();
    navigate(`/canvas/${content_id}`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await deleteContent(deleteTarget.id);
    setDeletingId(null);
    setDeleteTarget(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <LayoutDashboard size={18} />
            <span>Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 md:py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
              My Contents
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {contents.length} content{contents.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {creating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {creating ? "Creating..." : "New Content"}
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        )}

        {!isLoading && contents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText size={48} className="text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              {search
                ? "No contents match your search."
                : "No contents yet. Create your first one!"}
            </p>
          </div>
        )}

        {!isLoading && contents.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {contents.map((content) => (
              <div
                key={content._id}
                onClick={() => navigate(`/canvas/${content._id}`)}
                className="group relative rounded-lg border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="h-36 bg-secondary flex items-center justify-center overflow-hidden">
                  {content.title_image ? (
                    <img
                      src={content.title_image}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText size={36} className="text-muted-foreground/30" />
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-foreground text-sm truncate">
                    {content.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock size={11} />
                    <span>{formatDate(content.updatedAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Delete lesson"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({
                      id: content._id,
                      title: content.title,
                    });
                  }}
                  disabled={deletingId === content._id}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                >
                  {deletingId === content._id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
