import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import HealthCard from '../components/HealthCard';
import HealthStatusBadge from '../components/HealthStatusBadge';
import '../App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
          <header className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Exploravis Dashboard</h1>
              <HealthStatusBadge />
            </div>
            <p className="text-gray-600 mt-2">
              Monitor the health and status of your system components
            </p>
          </header>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-8xl">
              <HealthCard />
            </div>
          </div>

          <footer className="mt-8 text-center text-gray-500 text-sm">
            <p>Data refreshes automatically every 30 seconds</p>
            <p className="mt-1">
              API Endpoint: {import.meta.env.VITE_API_URL || 'http://api.dev-exploravis.mywire.org'}
            </p>
          </footer>
        </div>
      </ConfigProvider >
    </QueryClientProvider >
  );
};

export default App;
