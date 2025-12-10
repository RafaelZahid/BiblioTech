import { User, Book, LoanRequest, UserRole } from '../types';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  setDoc
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Configuración de Firebase proporcionada
const firebaseConfig = {
  apiKey: "AIzaSyAyx2LGSim2Om9O101kBIDsQxowPRko19U",
  authDomain: "blibliotech.firebaseapp.com",
  projectId: "blibliotech",
  storageBucket: "blibliotech.firebasestorage.app",
  messagingSenderId: "1059710871946",
  appId: "1:1059710871946:web:10d7e34caa06840bf64073"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos Firestore de manera estándar para máxima compatibilidad
// Si hay problemas de "backend unreachable", suele ser la red, no la config de caché en web
const db = getFirestore(app);

const auth = getAuth(app);

const COLLECTIONS = {
  USERS: 'users',
  BOOKS: 'books',
  LOANS: 'loans'
};

// Función auxiliar para eliminar campos undefined que Firestore rechaza
const cleanData = (data: any) => {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

// Inicializar datos de prueba si la DB está vacía
const initializeData = async () => {
  // Intentar autenticación anónima para satisfacer reglas básicas de seguridad
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn("Autenticación anónima fallida o ya activa:", e);
  }

  try {
    // 1. Crear colección de Libros si no existe
    // Validamos permisos con una lectura simple primero
    const booksSnapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
    
    if (booksSnapshot.empty) {
      console.log("Inicializando base de datos: Creando colección de Libros...");
      const dummyBooks: Omit<Book, 'id'>[] = [
        {
          title: 'Cien años de soledad',
          author: 'Gabriel García Márquez',
          description: 'La historia de la familia Buendía en el pueblo ficticio de Macondo.',
          coverUrl: 'https://picsum.photos/200/300?random=1',
          available: true
        },
        {
          title: 'Don Quijote de la Mancha',
          author: 'Miguel de Cervantes',
          description: 'Las aventuras de un hidalgo pobre que lee tantas novelas de caballería que enloquece.',
          coverUrl: 'https://picsum.photos/200/300?random=2',
          available: true
        },
        {
          title: 'Matemáticas I',
          author: 'Baldor',
          description: 'Libro de texto fundamental para álgebra y aritmética básica.',
          coverUrl: 'https://picsum.photos/200/300?random=3',
          available: true
        }
      ];
      
      for (const book of dummyBooks) {
        await addDoc(collection(db, COLLECTIONS.BOOKS), cleanData(book));
      }
    }

    // 2. Crear colección de Usuarios si no existe (Admin por defecto)
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    if (usersSnapshot.empty) {
      console.log("Inicializando base de datos: Creando colección de Usuarios (Admin)...");
      const defaultAdmin: Omit<User, 'id'> = {
        name: "Admin",
        role: UserRole.ADMIN
        // No matricula needed for admin
      };
      await addDoc(collection(db, COLLECTIONS.USERS), cleanData(defaultAdmin));
    }

  } catch (error: any) {
    // Manejo de error de permisos específico para mostrar ayuda en consola
    if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
       console.error("%cError de Permisos Firebase:", "font-weight: bold; font-size: 16px; color: red; background: #ffebeb; padding: 4px; border-radius: 4px;");
       console.error("No se puede leer/escribir en la base de datos.");
       console.error("SOLUCIÓN: Ve a Firebase Console > Firestore Database > Reglas y cámbialas a:");
       console.warn(`
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }
       `);
    } else {
      console.error("Error inicializando datos:", error);
    }
  }
};

export const StorageService = {
  init: initializeData,

  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  saveUser: async (user: User) => {
    // Eliminamos el ID generado localmente si existe, Firestore crea uno propio
    const { id, ...userData } = user;
    // IMPORTANTE: Limpiamos undefined
    await addDoc(collection(db, COLLECTIONS.USERS), cleanData(userData));
  },

  getBooks: async (): Promise<Book[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
  },

  saveBook: async (book: Book) => {
    const { id, ...bookData } = book;
    await addDoc(collection(db, COLLECTIONS.BOOKS), cleanData(bookData));
  },

  updateBook: async (updatedBook: Book) => {
    if (!updatedBook.id) return;
    const bookRef = doc(db, COLLECTIONS.BOOKS, updatedBook.id);
    const { id, ...bookData } = updatedBook;
    await updateDoc(bookRef, cleanData(bookData));
  },

  getLoans: async (): Promise<LoanRequest[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.LOANS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanRequest));
  },

  saveLoan: async (loan: LoanRequest) => {
    const { id, ...loanData } = loan;
    const docRef = await addDoc(collection(db, COLLECTIONS.LOANS), cleanData(loanData));
    return docRef.id; 
  },

  updateLoanStatus: async (loanId: string, status: LoanRequest['status']) => {
    const loanRef = doc(db, COLLECTIONS.LOANS, loanId);
    await updateDoc(loanRef, { status });
  },

  login: async (matriculaOrName: string): Promise<User | null> => {
    try {
      // Intentamos buscar por matrícula
      const qMatricula = query(collection(db, COLLECTIONS.USERS), where("matricula", "==", matriculaOrName));
      const snapshotMatricula = await getDocs(qMatricula);
      
      if (!snapshotMatricula.empty) {
        const doc = snapshotMatricula.docs[0];
        return { id: doc.id, ...doc.data() } as User;
      }

      // Si falla, intentamos por nombre (útil para Admin)
      const qName = query(collection(db, COLLECTIONS.USERS), where("name", "==", matriculaOrName));
      const snapshotName = await getDocs(qName);

      if (!snapshotName.empty) {
        const doc = snapshotName.docs[0];
        return { id: doc.id, ...doc.data() } as User;
      }

      return null;
    } catch (e) {
      console.error("Login error (Verifique permisos en consola si persiste):", e);
      return null;
    }
  }
};