import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import AppShell from "@/components/layout/AppShell";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import { ScientificFoundationSection as About } from "./pages/About";
import Topics from "./pages/Topics";
import TopicDetail from "./pages/TopicDetail";
import LineageDashboard from "./pages/LineageDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Topics />} />
            <Route path="/articles" element={<Index />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/:clusterId" element={<TopicDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/lineage" element={<LineageDashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;