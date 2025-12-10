import { initializeApp } from "firebase/app";
import { getFirestore, Firestore, initializeFirestore } from "firebase/firestore";

// Configuración real de Firebase para BiblioTech
const firebaseConfig = {
  apiKey: "AIzaSyDLmV6zeg-8Mz8inSOu4W0nkgt4ew2eTKw",
  authDomain: "smartlabsystem-cdcb3.firebaseapp.com",
  databaseURL: "https://smartlabsystem-cdcb3-default-rtdb.firebaseio.com",
  projectId: "smartlabsystem-cdcb3",
  storageBucket: "smartlabsystem-cdcb3.firebasestorage.app",
  messagingSenderId: "1080019905154",
  appId: "1:1080019905154:web:785c3ee4bd3f0e65cfe29b"
};

// Variable para verificar que la configuración es válida
export const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app;
let dbInstance: Firestore | null = null;

try {
  app = initializeApp(firebaseConfig);
  
  // Usamos getFirestore estándar que es más robusto para la mayoría de conexiones
  try {
    dbInstance = getFirestore(app);
    console.log(`Conectado exitosamente a Firebase: ${firebaseConfig.projectId}`);
  } catch (e) {
    console.warn("Fallo getFirestore estándar. Intentando inicialización forzada...", e);
    // Fallback solo si el estándar falla
    try {
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (e2) {
       console.error("No se pudo conectar a Firestore. La app funcionará en modo OFFLINE.", e2);
    }
  }
  
} catch (e) {
  console.error("Error crítico en configuración de Firebase. Se usará modo Offline.", e);
}

// Exportamos la instancia (puede ser null, lo que activará MockStorage en storage.ts)
export const db = dbInstance;