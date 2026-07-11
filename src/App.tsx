import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/auth.store";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { RequireLogin } from "./components/RequireLogin";
import { AppLayout } from "./layouts/AppLayout";
import { PageLoader } from "./components/PageLoader";

import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const TipTapCanvas = lazy(() => import("./pages/TipTapCanvas"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TiptapView = lazy(() => import("./pages/TiptapView"));
const Status = lazy(() => import("./pages/Status"));
const CloudinaryUpload = lazy(() => import("./pages/Cloudinaryupload"));
const Explore = lazy(() => import("./pages/Explore"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Setting"));
const LearningShowcase = lazy(() => import("./pages/guide/LearningShowcase"));
const CreatingShowcase = lazy(() => import("./pages/guide/CreatingShowcase"));
const History = lazy(() => import("./pages/History"));
const Create = lazy(() => import("./pages/Create"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

const queryClient = new QueryClient();

const App = () => {
  const token = useAuthStore((s) => s.token);
  const recheckToken = useAuthStore((s) => s.recheckToken);
  const didRecheckOnMount = useRef(false);

  // Re-validate persisted token once on mount (sliding session). Guard with a ref
  // because recheck issues a fresh JWT and would retrigger a token-dependent effect.
  useEffect(() => {
    if (didRecheckOnMount.current || !token) return;
    didRecheckOnMount.current = true;
    void recheckToken();
  }, [token, recheckToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/status" element={<Status />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/canvas/:id"
              element={
                <ProtectedRoute>
                  <TipTapCanvas />
                </ProtectedRoute>
              }
            />

            <Route
              path="/uploadimage"
              element={
                <ProtectedRoute>
                  <CloudinaryUpload />
                </ProtectedRoute>
              }
            />

            {/* Public read-only view (optional auth on API for public / link-only) */}
            <Route path="/view/:id" element={<TiptapView />} />

            <Route element={<AppLayout />}>
              {/* Landing + guide hub merged (2026-07-11); stays an eager import. */}
              <Route path="/" element={<Landing />} />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route path="/explore" element={<Explore />} />
              {/* The old hub — its role cards now live on Landing. */}
              <Route path="/guide" element={<Navigate to="/" replace />} />
              <Route path="/guide/learning" element={<LearningShowcase />} />
              <Route path="/guide/creating" element={<CreatingShowcase />} />
              <Route
                path="/history"
                element={
                  <RequireLogin
                    title="Sign in to view history"
                    description="Your learning history is tied to your account. Log in to see lessons you've opened and continue where you left off."
                  >
                    <History />
                  </RequireLogin>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <Create />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireLogin
                    title="Sign in to view your profile"
                    description="Your profile and account details are available after you log in."
                  >
                    <Profile />
                  </RequireLogin>
                }
              />
              <Route
                path="/change-password"
                element={
                  <RequireLogin
                    title="Sign in to access security settings"
                    description="Changing your password requires an authenticated session."
                  >
                    <ChangePassword />
                  </RequireLogin>
                }
              />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
