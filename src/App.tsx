import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TenantManagement from "./pages/admin/TenantManagement";
import RentTracking from "./pages/admin/RentTracking";
import MaintenanceManagement from "./pages/admin/MaintenanceManagement";
import MyRentHistory from "./pages/tenant/MyRentHistory";
import SubmitRequest from "./pages/tenant/SubmitRequest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Admin Routes */}
      <Route
        path="/tenants"
        element={
          <ProtectedRoute>
            <TenantManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rent"
        element={
          <ProtectedRoute>
            <RentTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <MaintenanceManagement />
          </ProtectedRoute>
        }
      />
      {/* Tenant Routes */}
      <Route
        path="/my-rent"
        element={
          <ProtectedRoute>
            <MyRentHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/submit-request"
        element={
          <ProtectedRoute>
            <SubmitRequest />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
