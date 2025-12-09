import { BrowserRouter, Routes, Route } from "react-router-dom";
import SimpleLayout from "./components/Layout";
import ScanSearch from "./pages/ScanSearch";
import IPPage from "./pages/IPPage";
import ScanIdSearch from "./pages/ScanIdSearch";
import HomePage from "./pages/HomePage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DispatchScan from "./pages/DispatchScan";
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SimpleLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scans" element={<ScanSearch />} />
            <Route path="/scans/:scan_id" element={<ScanIdSearch />} />
            <Route path="/dispatch" element={<DispatchScan />} />
            <Route path="/ip/:ip" element={<IPPage />} />
          </Routes>
        </SimpleLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
