import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
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
import AdminUsers from "./pages/AdminUsers";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { SECTION_ROLES } from "./lib/permissions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
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
          <Route path="/admin/finances" element={<ProtectedRoute requiredRoles={SECTION_ROLES.finances}><AdminFinances /></ProtectedRoute>} />
          <Route path="/admin/shop"     element={<ProtectedRoute requiredRoles={SECTION_ROLES.shop}><AdminShop /></ProtectedRoute>} />
          <Route path="/admin/events"   element={<ProtectedRoute requiredRoles={SECTION_ROLES.events}><AdminEvents /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
