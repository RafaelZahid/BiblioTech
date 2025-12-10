import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { User, UserRole } from './types';
import { StorageService } from './services/storage';
import { LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    StorageService.init();
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
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

      {/* Main Content Area */}
      <main>
        {user.role === UserRole.ADMIN ? (
          <AdminDashboard />
        ) : (
          <StudentDashboard user={user} />
        )}
      </main>
    </div>
  );
}