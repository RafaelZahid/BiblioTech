import { initializeApp } from "firebase/app";
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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
  // Inicializamos Firestore con configuración básica para asegurar compatibilidad
  dbInstance = getFirestore(app);
  
  console.log(`Conectado exitosamente al proyecto: ${firebaseConfig.projectId}`);
} catch (e) {
  console.error("Error al inicializar Firebase. Puede ser un problema de red.", e);
}

export const db = dbInstance;