import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  return token ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
};

export default ProtectedRoute;
