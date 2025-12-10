import React, { useState } from 'react';
import { User, UserRole, ADMIN_SECRET_KEY } from '../types';
import { StorageService } from '../services/storage';
import { BookOpen, UserPlus, LogIn, Lock, GraduationCap, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isAdminRegister) {
        if (adminKey !== ADMIN_SECRET_KEY) {
          setError('Clave de administrador incorrecta.');
          setIsLoading(false);
          return;
        }
      } else {
        if (!/^\d{8}$/.test(matricula)) {
          setError('La matrícula debe tener exactamente 8 dígitos.');
          setIsLoading(false);
          return;
        }
      }

      // Check if user exists already
      const existingUser = await StorageService.login(isAdminRegister ? name : matricula);
      if (existingUser) {
          setError('Este usuario ya está registrado.');
          setIsLoading(false);
          return;
      }

      // Construct user object conditionally to avoid undefined values
      const newUser: User = {
        id: '', // Will be set by Firestore
        name,
        role: isAdminRegister ? UserRole.ADMIN : UserRole.STUDENT,
        ...(isAdminRegister ? {} : { matricula }) // Only add matricula if it is a student
      };

      await StorageService.saveUser(newUser);
      
      // Fetch the created user to get the ID
      const createdUser = await StorageService.login(isAdminRegister ? name : matricula);
      if (createdUser) {
        onLogin(createdUser);
      } else {
        // Fallback local login if fetch fails immediately
        onLogin(newUser); 
      }
    } catch (err) {
      console.error(err);
      setError('Error al registrar. Intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const identifier = isAdminRegister ? name : matricula; 
      const user = await StorageService.login(identifier);

      if (user) {
        onLogin(user);
      } else {
        setError('Usuario no encontrado. Por favor regístrate.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión o permisos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-center text-white">
          <BookOpen className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">BiblioTech</h1>
          <p className="opacity-80">Sistema de Préstamos Escolar</p>
        </div>

        <div className="p-8">
          <div className="flex justify-center mb-6 bg-gray-100 p-1 rounded-lg">
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isLogin ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Ingresar
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isLogin ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            
            {/* Role Toggle for Registration/Login context */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <label className={`flex items-center cursor-pointer ${!isAdminRegister ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  className="hidden" 
                  checked={!isAdminRegister} 
                  onChange={() => setIsAdminRegister(false)}
                />
                <GraduationCap className="w-5 h-5 mr-1" /> Alumno
              </label>
              <label className={`flex items-center cursor-pointer ${isAdminRegister ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  className="hidden" 
                  checked={isAdminRegister} 
                  onChange={() => setIsAdminRegister(true)}
                />
                <Lock className="w-5 h-5 mr-1" /> Admin
              </label>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            )}

            {/* Student Matricula */}
            {!isAdminRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula (8 Dígitos)</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={matricula}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setMatricula(val);
                  }}
                  placeholder="12345678"
                />
              </div>
            )}

            {/* Admin Name for Login */}
            {isLogin && isAdminRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {/* Admin Secret Key */}
            {isAdminRegister && !isLogin && (
              <div>
                <label className="block text-sm font-medium text-red-600 mb-1">Clave Especial (Admin)</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Clave maestra"
                />
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="mr-2 w-5 h-5" /> : <UserPlus className="mr-2 w-5 h-5" />}
                  {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};