import { Link, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";

type RequireLoginProps = {
  /** Page heading shown when logged out */
  title: string;
  /** Short explanation of why sign-in is needed */
  description: string;
  children: React.ReactNode;
};

/**
 * Renders `children` when authenticated; otherwise a centered prompt inside AppLayout
 * (TopNav stays visible — only the main area changes).
 */
export function RequireLogin({
  title,
  description,
  children,
}: RequireLoginProps) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (token) {
    return <>{children}</>;
  }

  return (
    <div className="container flex min-h-[min(70vh,560px)] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Button className="mt-8 gap-2" asChild>
        <Link
          to="/login"
          state={{ from: location.pathname + location.search }}
        >
          <LogIn className="h-4 w-4" />
          Log in
        </Link>
      </Button>
    </div>
  );
}
