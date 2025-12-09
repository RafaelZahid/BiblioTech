export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  matricula?: string; // Only for students (8 digits)
  role: UserRole;
  password?: string; // In a real app, this would be hashed
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  available: boolean;
}

export interface LoanRequest {
  id: string;
  bookId: string;
  studentId: string;
  studentName: string;
  studentMatricula: string;
  bookTitle: string;
  pickupDate: string;
  returnDate: string;
  status: 'PENDING' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';
}

export const ADMIN_SECRET_KEY = "BIBLIO-KEY-2024";