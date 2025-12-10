import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { User, UserRole } from './types';
import { StorageService } from './services/storage';
import { LogOut, Database } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      // Create a timeout promise that resolves after 3 seconds
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Initialize DB, but don't let it block forever
      try {
        await Promise.race([
          StorageService.init(),
          timeoutPromise
        ]);
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-blue-600 flex-col">
      <Database className="w-10 h-10 mb-4 animate-bounce" />
      <span className="font-medium">Conectando con BiblioTech...</span>
    </div>;
  }

  // Component to render based on user state
  const renderContent = () => {
    if (!user) {
      return <Auth onLogin={setUser} />;
    }
    return user.role === UserRole.ADMIN ? <AdminDashboard /> : <StudentDashboard user={user} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* Navbar */}
      {user && (
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600 tracking-tight">BiblioTech</span>
                <span className="ml-3 px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                  {user.role === UserRole.ADMIN ? 'MODO ADMINISTRADOR' : 'MODO ALUMNO'}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  {user.matricula && <p className="text-xs text-gray-500">{user.matricula}</p>}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main>
        {renderContent()}
      </main>
    </div>
  );
}