import { useAuthStore } from "@/stores/auth.store";
import { isSafeRedirectTarget } from "@/lib/axios";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const SESSION_BANNER_COPY: Record<string, string> = {
  TOKEN_EXPIRED: "เซสชันหมดอายุแล้ว เข้าสู่ระบบอีกครั้งเพื่อไปต่อได้เลย",
  TOKEN_INVALID: "กรุณาเข้าสู่ระบบอีกครั้ง",
  TOKEN_MISSING: "กรุณาเข้าสู่ระบบอีกครั้ง",
  USER_NOT_FOUND: "กรุณาเข้าสู่ระบบอีกครั้ง",
};

function resolveRedirectTarget(
  stateFrom: unknown,
  redirectParam: string | null,
): string {
  if (typeof stateFrom === "string" && isSafeRedirectTarget(stateFrom)) {
    return stateFrom;
  }
  if (redirectParam && isSafeRedirectTarget(redirectParam)) {
    return redirectParam;
  }
  return "/explore";
}

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const reason = searchParams.get("reason");
  const code = searchParams.get("code");
  const sessionBanner =
    code && SESSION_BANNER_COPY[code]
      ? SESSION_BANNER_COPY[code]
      : reason || null;

  const clearErrors = () => {
    setFieldErrors({});
    setServerError("");
  };

  const toggleMode = () => {
    setIsSignUp((v) => !v);
    clearErrors();
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (isSignUp) {
      if (!name.trim()) errors.name = "Name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (isSignUp && password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    try {
      if (isSignUp) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      const target = resolveRedirectTarget(
        (location.state as { from?: string } | null)?.from,
        searchParams.get("redirect"),
      );
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Something went wrong";
      setServerError(message);
      useAuthStore.setState({ isLoading: false });
    }
  };

  useEffect(() => {
    clearErrors();
  }, [searchParams]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-120 w-120 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-100">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? "Enter your details to get started"
              : "Sign in to your account"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          {sessionBanner && (
            <div
              className="mb-4 flex gap-2 rounded-md border border-border bg-accent px-3 py-2.5 text-sm text-foreground"
              role="status"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{sessionBanner}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm text-secondary-foreground"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }
                  }}
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm text-secondary-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.email;
                      return next;
                    });
                  }
                }}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm text-secondary-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-500" role="alert">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading
                ? "Please wait..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            {isSignUp ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
