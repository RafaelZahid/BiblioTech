import React, { useState, useEffect } from 'react';
import { User, Book, LoanRequest } from '../types';
import { StorageService } from '../services/storage';
import { Search, Calendar, CheckCircle, X, Loader2, Filter } from 'lucide-react';
import QRCode from 'react-qr-code';

interface StudentProps {
  user: User;
}

export const StudentDashboard: React.FC<StudentProps> = ({ user }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'unavailable'>('all');
  
  // Loan States
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [generatedLoan, setGeneratedLoan] = useState<LoanRequest | null>(null);
  const [creatingLoan, setCreatingLoan] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await StorageService.getBooks();
      setBooks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Robust Filtering Logic
  const filteredBooks = books.filter(b => {
    // 1. Filter by Text (Title OR Author)
    const matchesText = 
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.author.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Filter by Availability Status
    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'available' ? b.available :
      !b.available;

    return matchesText && matchesStatus;
  });

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    setCreatingLoan(true);
    try {
      const newLoan: LoanRequest = {
        id: crypto.randomUUID(),
        bookId: selectedBook.id,
        studentId: user.id,
        studentName: user.name,
        studentMatricula: user.matricula || '',
        bookTitle: selectedBook.title,
        pickupDate,
        returnDate,
        status: 'PENDING'
      };

      await StorageService.saveLoan(newLoan);
      setGeneratedLoan(newLoan);
      setSelectedBook(null); // Close modal
    } catch (err) {
      alert("Error al crear la solicitud.");
    } finally {
      setCreatingLoan(false);
    }
  };

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

      {/* Advanced Search Bar Area */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título o autor..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Availability Filter Dropdown */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="all">Todos los libros</option>
              <option value="available">Solo Disponibles</option>
              <option value="unavailable">Agotados / Prestados</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
              ▼
            </div>
          </div>
        </div>
        
        {/* Results Counter */}
        <div className="mt-2 text-xs text-gray-500 px-1">
          Mostrando {filteredBooks.length} {filteredBooks.length === 1 ? 'libro' : 'libros'} 
          {searchTerm && <span> para "{searchTerm}"</span>}
          {filterStatus !== 'all' && <span> ({filterStatus === 'available' ? 'Disponibles' : 'Agotados'})</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map(book => (
            <div key={book.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100 flex flex-col group">
              <div className="h-48 overflow-hidden bg-gray-200 relative">
                 <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                 <span className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold rounded-full shadow-sm backdrop-blur-md ${book.available ? 'bg-green-100/90 text-green-800' : 'bg-red-100/90 text-red-800'}`}>
                   {book.available ? 'Disponible' : 'Agotado'}
                 </span>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-1 leading-tight">{book.title}</h3>
                <p className="text-blue-600 font-medium text-sm mb-3">{book.author}</p>
                <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{book.description}</p>
                <button 
                  onClick={() => setSelectedBook(book)}
                  disabled={!book.available}
                  className={`w-full py-2.5 rounded-lg font-semibold transition-all shadow-sm ${
                    book.available 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {book.available ? 'Solicitar Préstamo' : 'No Disponible'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredBooks.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No se encontraron libros</h3>
          <p className="text-gray-500">Intenta ajustar los filtros de búsqueda.</p>
          <button 
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Loan Request Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Solicitud de Préstamo</h2>
              <p className="text-gray-500 text-sm mt-1">Libro: <span className="font-semibold text-blue-600">{selectedBook.title}</span></p>
            </div>
            
            <form onSubmit={handleCreateLoan} className="space-y-5">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800 font-medium mb-1">TUS DATOS</p>
                <div className="flex justify-between text-sm">
                   <span className="text-gray-600">{user.name}</span>
                   <span className="text-gray-900 font-mono">{user.matricula}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-2 text-gray-400" />
                  ¿Cuándo vendrás a recogerlo?
                </label>
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-2 text-gray-400" />
                  ¿Cuándo lo entregarás?
                </label>
                <input 
                  type="date" 
                  required
                  min={pickupDate || new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={creatingLoan}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
                >
                  {creatingLoan ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Confirmar y Generar QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};