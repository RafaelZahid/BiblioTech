import React, { useState, useEffect } from 'react';
import { User, Book, LoanRequest } from '../types';
import { StorageService } from '../services/storage';
import { Search, Calendar, CheckCircle, X, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';

interface StudentProps {
  user: User;
}

export const StudentDashboard: React.FC<StudentProps> = ({ user }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [generatedLoan, setGeneratedLoan] = useState<LoanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    const data = await StorageService.getBooks();
    setBooks(data);
    setLoading(false);
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setProcessing(true);

    try {
      const newLoanData: LoanRequest = {
        id: '', // Placeholder, will be replaced by Firestore ID inside saveLoan return logic if we used it, but here we construct object
        bookId: selectedBook.id,
        studentId: user.id,
        studentName: user.name,
        studentMatricula: user.matricula || '',
        bookTitle: selectedBook.title,
        pickupDate,
        returnDate,
        status: 'PENDING'
      };

      // 1. Create the loan request (async)
      const loanId = await StorageService.saveLoan(newLoanData);
      const newLoanWithId = { ...newLoanData, id: loanId };
      
      // 2. Mark the book as unavailable (async)
      const updatedBook = { ...selectedBook, available: false };
      await StorageService.updateBook(updatedBook);

      // 3. Update local state
      setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
      setGeneratedLoan(newLoanWithId);
      setSelectedBook(null); // Close input modal
    } catch (error) {
      console.error("Error creating loan:", error);
      alert("Error al procesar el préstamo. Intente de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Bienvenido, {user.name}</h1>
        <p className="text-gray-600">Busca el libro que necesitas para tus estudios.</p>
      </header>

      {/* Generated QR View */}
      {generatedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-green-600 mb-2">¡Solicitud Lista!</h2>
            <p className="text-gray-600 mb-6">Muestra este código al bibliotecario.</p>
            
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 inline-block mb-6">
              <QRCode 
                value={JSON.stringify(generatedLoan)} 
                size={200}
                level="M"
              />
            </div>

            <div className="text-left text-sm text-gray-700 bg-gray-50 p-4 rounded-lg mb-6">
              <p><strong>Libro:</strong> {generatedLoan.bookTitle}</p>
              <p><strong>Recoger:</strong> {generatedLoan.pickupDate}</p>
              <p><strong>Entregar:</strong> {generatedLoan.returnDate}</p>
              <p className="mt-2 text-red-500 text-xs font-bold">* El libro ha sido marcado como Agotado en el sistema.</p>
            </div>

            <button 
              onClick={() => setGeneratedLoan(null)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por título, autor..."
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map(book => (
          <div key={book.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100 flex flex-col">
            <div className="h-48 overflow-hidden bg-gray-200 relative">
               <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
               <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full ${book.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                 {book.available ? 'Disponible' : 'Agotado'}
               </span>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-800 mb-1">{book.title}</h3>
              <p className="text-gray-500 mb-2">{book.author}</p>
              <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">{book.description}</p>
              <button 
                onClick={() => setSelectedBook(book)}
                disabled={!book.available}
                className={`w-full py-2 rounded-lg font-semibold transition-colors ${book.available ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {book.available ? 'Solicitar Préstamo' : 'No Disponible'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron libros con ese nombre.
        </div>
      )}

      {/* Loan Request Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in">
            <button 
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-4">Solicitar "{selectedBook.title}"</h2>
            
            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Recogida
                </label>
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-lg p-2"
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Entrega
                </label>
                <input 
                  type="date" 
                  required
                  min={pickupDate || new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-lg p-2"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={processing}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-70"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5 mr-2" /> Confirmar y Generar QR</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};