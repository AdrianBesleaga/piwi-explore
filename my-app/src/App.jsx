import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

// Services
import { checkRequirements } from './services/browser/capability.service';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import ClientList from './pages/ClientList';
import ClientDetail from './pages/ClientDetail';
import Settings from './pages/Settings';
import AIPlayground from './pages/AIPlayground';
import TemplateManagement from './pages/TemplateManagement';
import UnsupportedBrowser from './pages/UnsupportedBrowser';

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Checking browser compatibility...</p>
    </div>
  </div>
);

function App() {
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check browser capabilities on mount
    const checkBrowserSupport = async () => {
      try {
        const caps = await checkRequirements();
        setCapabilities(caps);
        console.log('Browser Capabilities:', caps);
      } catch (error) {
        console.error('Error checking browser capabilities:', error);
        setCapabilities({
          isCompatible: false,
          compatibilityMessage: 'Error checking browser compatibility'
        });
      } finally {
        setLoading(false);
      }
    };

    checkBrowserSupport();
  }, []);

  // Show loading screen while checking
  if (loading) {
    return <LoadingScreen />;
  }

  // Show unsupported browser page if not compatible
  if (!capabilities?.isCompatible) {
    return <UnsupportedBrowser capabilities={capabilities} />;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <BrowserRouter>
          <Routes>
            {/* Main app routes with layout */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<ClientList />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings" element={<Settings />} />
              <Route path="ai" element={<AIPlayground />} />
              <Route path="templates" element={<TemplateManagement />} />
              {/* Add more routes as needed */}
            </Route>

            {/* Unsupported browser route */}
            <Route path="/unsupported" element={<UnsupportedBrowser capabilities={capabilities} />} />

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
}

export default App;
