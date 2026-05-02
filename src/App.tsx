import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import '@/i18n';
import Index from "./pages/Index";
import Finances from "./pages/Finances";
import Shop from "./pages/Shop";
import Events from "./pages/Events";
import Donations from "./pages/Donations";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminFinances from "./pages/AdminFinances";
import AdminShop from "./pages/AdminShop";
import AdminEvents from "./pages/AdminEvents";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/events" element={<Events />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/admin/finances" element={<ProtectedRoute><AdminFinances /></ProtectedRoute>} />
          <Route path="/admin/shop" element={<ProtectedRoute><AdminShop /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
