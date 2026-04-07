import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import MasterData from './pages/MasterData';

function AppContent() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-300 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 transition-colors duration-300 overflow-y-auto">
        <div key={location.pathname} className="animate-slide-up-fade min-h-full">
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/master" element={<MasterData />} />
            <Route path="/scan" element={<Scanner />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
