import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Servers from "./pages/Servers";
import Plans from "./pages/Plans";
import Bills from "./pages/Bills";
import Coupons from "./pages/Coupons";
import Referrals from "./pages/Referrals";
import Templates from "./pages/Templates";
import Sellers from "./pages/Sellers";
import Reports from "./pages/Reports";
import Backup from "./pages/Backup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/sellers" element={<Sellers />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/backup" element={<Backup />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
