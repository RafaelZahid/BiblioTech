import { User, Book, LoanRequest } from '../types';
import { db, isFirebaseConfigured } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  setDoc
} from 'firebase/firestore';

const COLLECTIONS = {
  USERS: 'users',
  BOOKS: 'books',
  LOANS: 'loans'
};

// --- MOCK SERVICE (LocalStorage Fallback) ---
const MockStorage = {
  init: async () => {
    if (!localStorage.getItem(COLLECTIONS.BOOKS)) {
      console.log("Modo Offline: Inicializando datos locales...");
      const dummyBooks: Book[] = [
        {
          id: '1',
          title: 'Cien años de soledad',
          author: 'Gabriel García Márquez',
          description: 'La historia de la familia Buendía en el pueblo ficticio de Macondo.',
          coverUrl: 'https://picsum.photos/200/300?random=1',
          available: true
        },
        {
          id: '2',
          title: 'Don Quijote de la Mancha',
          author: 'Miguel de Cervantes',
          description: 'Las aventuras de un hidalgo pobre que lee tantas novelas de caballería que enloquece.',
          coverUrl: 'https://picsum.photos/200/300?random=2',
          available: true
        }
      ];
      localStorage.setItem(COLLECTIONS.BOOKS, JSON.stringify(dummyBooks));
    }
  },
  getUsers: async (): Promise<User[]> => JSON.parse(localStorage.getItem(COLLECTIONS.USERS) || '[]'),
  saveUser: async (user: User) => {
    const users = JSON.parse(localStorage.getItem(COLLECTIONS.USERS) || '[]');
    // Simple check for mock
    if (users.find((u: User) => u.matricula === user.matricula && user.role === 'STUDENT')) {
      throw new Error("El alumno ya está registrado.");
    }
    users.push(user);
    localStorage.setItem(COLLECTIONS.USERS, JSON.stringify(users));
  },
  login: async (matriculaOrName: string): Promise<User | null> => {
    const users = JSON.parse(localStorage.getItem(COLLECTIONS.USERS) || '[]');
    return users.find((u: User) => u.name === matriculaOrName || u.matricula === matriculaOrName) || null;
  },
  getBooks: async (): Promise<Book[]> => JSON.parse(localStorage.getItem(COLLECTIONS.BOOKS) || '[]'),
  saveBook: async (book: Book) => {
    const books = JSON.parse(localStorage.getItem(COLLECTIONS.BOOKS) || '[]');
    books.push(book);
    localStorage.setItem(COLLECTIONS.BOOKS, JSON.stringify(books));
  },
  updateBook: async (updatedBook: Book) => {
    const books = JSON.parse(localStorage.getItem(COLLECTIONS.BOOKS) || '[]');
    const index = books.findIndex((b: Book) => b.id === updatedBook.id);
    if (index !== -1) {
      books[index] = updatedBook;
      localStorage.setItem(COLLECTIONS.BOOKS, JSON.stringify(books));
    }
  },
  getLoans: async (): Promise<LoanRequest[]> => JSON.parse(localStorage.getItem(COLLECTIONS.LOANS) || '[]'),
  saveLoan: async (loan: LoanRequest) => {
    const loans = JSON.parse(localStorage.getItem(COLLECTIONS.LOANS) || '[]');
    loans.push(loan);
    localStorage.setItem(COLLECTIONS.LOANS, JSON.stringify(loans));
  },
  updateLoanStatus: async (loanId: string, status: LoanRequest['status']) => {
    const loans = JSON.parse(localStorage.getItem(COLLECTIONS.LOANS) || '[]');
    const index = loans.findIndex((l: LoanRequest) => l.id === loanId);
    if (index !== -1) {
      loans[index].status = status;
      localStorage.setItem(COLLECTIONS.LOANS, JSON.stringify(loans));
    }
  }
};

// Helper to remove undefined fields which Firestore does not support
const cleanDataForFirestore = (data: any) => {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

// --- FIREBASE IMPLEMENTATION ---
const FirebaseStorage = {
  init: async () => {
    if (!db) return;
    try {
      // Verificamos si hay libros, si no, creamos unos de ejemplo
      const booksRef = collection(db, COLLECTIONS.BOOKS);
      const snapshot = await getDocs(booksRef);
      if (snapshot.empty) {
        console.log("Firebase Empty: Seeding data...");
        const seedBooks: Book[] = [
           {
             id: '1',
             title: 'Cien años de soledad',
             author: 'Gabriel García Márquez',
             description: 'La historia de la familia Buendía en el pueblo ficticio de Macondo.',
             coverUrl: 'https://picsum.photos/200/300?random=1',
             available: true
           },
           {
             id: '2',
             title: 'Don Quijote de la Mancha',
             author: 'Miguel de Cervantes',
             description: 'Las aventuras de un hidalgo pobre que lee tantas novelas de caballería que enloquece.',
             coverUrl: 'https://picsum.photos/200/300?random=2',
             available: true
           }
         ];
        for (const book of seedBooks) {
           await setDoc(doc(db, COLLECTIONS.BOOKS, book.id), book);
        }
      }
    } catch (error) {
      console.error("Error init firebase:", error);
    }
  },

  getUsers: async (): Promise<User[]> => {
    if(!db) throw new Error("DB not init");
    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
  },

  // REGISTRO DE USUARIOS (Alumnos y Admins)
  saveUser: async (user: User) => {
    if(!db) throw new Error("DB not init");
    
    const usersRef = collection(db, COLLECTIONS.USERS);
    let q;

    // 1. Verificar si el usuario ya existe para evitar duplicados
    if (user.role === 'STUDENT' && user.matricula) {
      // Si es alumno, buscamos por matrícula
      q = query(usersRef, where("matricula", "==", user.matricula));
    } else {
      // Si es admin, buscamos por nombre (o podrías añadir un campo 'email' o 'username' específico)
      q = query(usersRef, where("name", "==", user.name), where("role", "==", "ADMIN"));
    }

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error(user.role === 'STUDENT' 
        ? "Ya existe un alumno registrado con esta matrícula." 
        : "Ya existe un administrador con este nombre.");
    }

    // 2. Guardar el nuevo usuario
    // Desestructuramos para quitar el ID temporal que genera el frontend y dejar que Firestore cree uno real
    const { id, ...userData } = user; 
    
    // Safety check: Firestore throws if any field is undefined
    const cleanUserData = cleanDataForFirestore(userData);
    
    await addDoc(collection(db, COLLECTIONS.USERS), cleanUserData);
  },

  login: async (matriculaOrName: string): Promise<User | null> => {
    if(!db) throw new Error("DB not init");
    const usersRef = collection(db, COLLECTIONS.USERS);
    
    // Intenta buscar por Matrícula (Alumnos)
    const qMatricula = query(usersRef, where("matricula", "==", matriculaOrName));
    const snapMatricula = await getDocs(qMatricula);
    if (!snapMatricula.empty) {
      const docData = snapMatricula.docs[0].data();
      return { ...docData, id: snapMatricula.docs[0].id } as User;
    }
    
    // Intenta buscar por Nombre (Admins o Alumnos por nombre)
    const qName = query(usersRef, where("name", "==", matriculaOrName));
    const snapName = await getDocs(qName);
    if (!snapName.empty) {
      const docData = snapName.docs[0].data();
      return { ...docData, id: snapName.docs[0].id } as User;
    }

    return null;
  },

  getBooks: async (): Promise<Book[]> => {
    if(!db) throw new Error("DB not init");
    const snapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Book));
  },
  saveBook: async (book: Book) => {
    if(!db) throw new Error("DB not init");
    const { id, ...bookData } = book;
    const cleanBookData = cleanDataForFirestore(bookData);
    // Usamos setDoc con el ID generado por timestamp en el frontend, o podríamos usar addDoc
    await setDoc(doc(db, COLLECTIONS.BOOKS, id), { ...cleanBookData, id });
  },
  updateBook: async (updatedBook: Book) => {
    if(!db) throw new Error("DB not init");
    const cleanBookData = cleanDataForFirestore(updatedBook);
    // Remove ID from payload just in case, though setDoc merges
    delete (cleanBookData as any).id;
    await updateDoc(doc(db, COLLECTIONS.BOOKS, updatedBook.id), cleanBookData);
  },
  getLoans: async (): Promise<LoanRequest[]> => {
    if(!db) throw new Error("DB not init");
    const snapshot = await getDocs(collection(db, COLLECTIONS.LOANS));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LoanRequest));
  },
  saveLoan: async (loan: LoanRequest) => {
    if(!db) throw new Error("DB not init");
    const { id, ...loanData } = loan;
    const cleanLoanData = cleanDataForFirestore(loanData);
    await setDoc(doc(db, COLLECTIONS.LOANS, id), { ...cleanLoanData, id });
  },
  updateLoanStatus: async (loanId: string, status: LoanRequest['status']) => {
    if(!db) throw new Error("DB not init");
    await updateDoc(doc(db, COLLECTIONS.LOANS, loanId), { status });
  }
};

// Export based on config
export const StorageService = (isFirebaseConfigured && db) ? FirebaseStorage : MockStorage;