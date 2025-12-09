import React, { useState } from 'react';
import { X, HelpCircle, Settings, Globe, Copy } from 'lucide-react';

export const FirebaseSetupGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-bounce">
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-orange-600 text-white px-4 py-3 rounded-full shadow-lg font-bold flex items-center hover:bg-orange-700 transition-colors border-2 border-white"
        >
          <HelpCircle className="w-6 h-6 mr-2" />
          ¿No encuentras tus claves de Firebase?
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-orange-600 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center">
            <Settings className="mr-2" /> Configurar Firebase
          </h2>
          <button onClick={() => setIsOpen(false)} className="hover:bg-orange-700 p-1 rounded-full"><X /></button>
        </div>

        <div className="p-8 overflow-y-auto">
          <p className="text-gray-600 mb-6 text-lg">
            Si ya creaste el proyecto pero no ves los datos (apiKey, projectId, etc.), es porque te falta <strong>registrar la App Web</strong>. Sigue estos pasos:
          </p>

          <div className="space-y-6">
            <div className="flex">
              <div className="flex-shrink-0 bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4">1</div>
              <div>
                <h3 className="font-bold text-gray-900">Ve a la Configuración del Proyecto</h3>
                <p className="text-sm text-gray-600">En la consola de Firebase, haz clic en el icono de <strong>Engranaje ⚙️</strong> (arriba a la izquierda) y selecciona <strong>Project settings</strong>.</p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0 bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4">2</div>
              <div>
                <h3 className="font-bold text-gray-900">Baja hasta "Your apps"</h3>
                <p className="text-sm text-gray-600">Desplázate hasta el final de la página. Si ves un mensaje que dice "There are no apps in your project", haz clic en el icono circular que parece un código: <strong>{`</>`}</strong> (Web).</p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0 bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4">3</div>
              <div>
                <h3 className="font-bold text-gray-900">Registra la App</h3>
                <p className="text-sm text-gray-600">
                  1. Ponle un nombre (ej: "Biblioteca Escolar").<br/>
                  2. <strong>No</strong> marques la casilla de "Firebase Hosting" por ahora.<br/>
                  3. Haz clic en el botón azul <strong>Register app</strong>.
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0 bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4">4</div>
              <div>
                <h3 className="font-bold text-gray-900">¡Ahí están los datos!</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Verás un bloque de código que dice <code>const firebaseConfig = ...</code>. Copia todo lo que está entre las llaves <code>{`{ ... }`}</code>.
                </p>
                <div className="bg-gray-800 text-gray-300 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  apiKey: "AIzaSy...",<br/>
                  authDomain: "...",<br/>
                  projectId: "...",<br/>
                  ...
                </div>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0 bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4">5</div>
              <div>
                <h3 className="font-bold text-gray-900">Pégalos en tu código</h3>
                <p className="text-sm text-gray-600">
                  Ve al archivo <code>services/firebase.ts</code> en este editor y reemplaza los valores de ejemplo con los tuyos.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center border-t">
          <button 
            onClick={() => setIsOpen(false)}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-black transition-colors"
          >
            Entendido, voy a buscarlos
          </button>
        </div>
      </div>
    </div>
  );
};