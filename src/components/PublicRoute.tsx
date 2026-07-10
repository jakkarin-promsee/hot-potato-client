import { Navigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { isSafeRedirectTarget } from "../lib/axios";

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((s) => s.token);
  const [searchParams] = useSearchParams();

  if (token) {
    const redirect = searchParams.get("redirect");
    if (redirect && isSafeRedirectTarget(redirect)) {
      return <Navigate to={redirect} replace />;
    }
    return <Navigate to="/explore" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
