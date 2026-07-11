import { useAuthStore } from "@/stores/auth.store";
import { isSafeRedirectTarget } from "@/lib/axios";
import { useAppI18n } from "@/lib/i18n";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const SESSION_BANNER_COPY: Record<string, { en: string; th: string }> = {
  TOKEN_EXPIRED: {
    en: "Your session expired. Sign in again to continue.",
    th: "เซสชันหมดอายุแล้ว เข้าสู่ระบบอีกครั้งเพื่อไปต่อได้เลย",
  },
  TOKEN_INVALID: {
    en: "Please sign in again.",
    th: "กรุณาเข้าสู่ระบบอีกครั้ง",
  },
  TOKEN_MISSING: {
    en: "Please sign in again.",
    th: "กรุณาเข้าสู่ระบบอีกครั้ง",
  },
  USER_NOT_FOUND: {
    en: "Please sign in again.",
    th: "กรุณาเข้าสู่ระบบอีกครั้ง",
  },
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

  const { login, loginWithGoogle, register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t, isThai } = useAppI18n();

  // Read per render (not module scope) so tests can stub the env var.
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
    | string
    | undefined;

  const reason = searchParams.get("reason");
  const code = searchParams.get("code");
  const sessionBanner =
    code && SESSION_BANNER_COPY[code]
      ? t(SESSION_BANNER_COPY[code].en, SESSION_BANNER_COPY[code].th)
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
      if (!name.trim()) {
        errors.name = t("Name is required.", "กรุณากรอกชื่อ");
      }
    }

    if (!email.trim()) {
      errors.email = t("Email is required.", "กรุณากรอกอีเมล");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t(
        "Enter a valid email address.",
        "กรอกอีเมลให้ถูกต้อง",
      );
    }

    if (!password) {
      errors.password = t("Password is required.", "กรุณากรอกรหัสผ่าน");
    } else if (isSignUp && password.length < 8) {
      errors.password = t(
        "Password must be at least 8 characters.",
        "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      );
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const redirectAfterAuth = () => {
    const target = resolveRedirectTarget(
      (location.state as { from?: string } | null)?.from,
      searchParams.get("redirect"),
    );
    navigate(target, { replace: true });
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
      redirectAfterAuth();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("Something went wrong", "เกิดข้อผิดพลาด");
      setServerError(message);
      useAuthStore.setState({ isLoading: false });
    }
  };

  const handleGoogleSuccess = async (credential?: string) => {
    clearErrors();
    if (!credential) {
      setServerError(
        t("Google sign-in failed", "เข้าสู่ระบบด้วย Google ไม่สำเร็จ"),
      );
      return;
    }
    try {
      await loginWithGoogle(credential);
      redirectAfterAuth();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        t("Google sign-in failed", "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
      setServerError(message);
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
            {isSignUp
              ? t("Create account", "สร้างบัญชี")
              : t("Welcome back", "ยินดีต้อนรับกลับ")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? t(
                  "Enter your details to get started",
                  "กรอกข้อมูลเพื่อเริ่มต้น",
                )
              : t("Sign in to your account", "เข้าสู่บัญชีของคุณ")}
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
                  {t("Name", "ชื่อ")}
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder={t("Your name", "ชื่อของคุณ")}
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
                {t("Email", "อีเมล")}
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
                {t("Password", "รหัสผ่าน")}
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
                ? t("Please wait...", "กรุณารอสักครู่...")
                : isSignUp
                  ? t("Create account", "สร้างบัญชี")
                  : t("Sign in", "เข้าสู่ระบบ")}
            </button>
          </form>

          {googleClientId && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {t("or", "หรือ")}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex justify-center">
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLogin
                    onSuccess={(res) => void handleGoogleSuccess(res.credential)}
                    onError={() =>
                      setServerError(
                        t(
                          "Google sign-in failed",
                          "เข้าสู่ระบบด้วย Google ไม่สำเร็จ",
                        ),
                      )
                    }
                    locale={isThai ? "th" : "en"}
                    text={isSignUp ? "signup_with" : "signin_with"}
                    width={300}
                  />
                </GoogleOAuthProvider>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp
            ? t("Already have an account?", "มีบัญชีอยู่แล้ว?")
            : t("Don't have an account?", "ยังไม่มีบัญชี?")}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            {isSignUp
              ? t("Sign in", "เข้าสู่ระบบ")
              : t("Create account", "สร้างบัญชี")}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
