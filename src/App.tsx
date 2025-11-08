import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Surebet from "./pages/Surebet";
import RiscoCalculado from "./pages/RiscoCalculado";
import Combos from "./pages/Combos";
import Relatorio from "./pages/Relatorio";
import IAInsights from "./pages/IAInsights";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/surebet" element={<Surebet />} />
            <Route path="/risco-calculado" element={<RiscoCalculado />} />
            <Route path="/combos" element={<Combos />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/ia-insights" element={<IAInsights />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
