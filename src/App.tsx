import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const Guide = lazy(() => import("./pages/Guide"));
const History = lazy(() => import("./pages/History"));
const Create = lazy(() => import("./pages/Create"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

const queryClient = new QueryClient();

const App = () => {
  const token = useAuthStore((s) => s.token);
  const recheckToken = useAuthStore((s) => s.recheckToken);

  useEffect(() => {
    if (token) {
      void recheckToken();
    }
  }, [token, recheckToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />

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
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route path="/explore" element={<Explore />} />
              <Route path="/guide" element={<Guide />} />
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
