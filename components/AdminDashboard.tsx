import React, { useState, useEffect } from 'react';
import { Book, LoanRequest } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Scan, BookOpen, Save, X, Check, Info, Pencil, Search, Filter, Loader2, ClipboardList, Clock, AlertTriangle, CheckCircle, FileText, Bell, Calendar, Printer } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [view, setView] = useState<'BOOKS' | 'SCAN' | 'LOANS'>('BOOKS');
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notification State
  const [showNotification, setShowNotification] = useState(true);
  
  // Filter State (Books)
  const [authorFilter, setAuthorFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  
  // Form State (Add / Edit)
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBook, setNewBook] = useState<Partial<Book>>({
    title: '', author: '', description: '', coverUrl: ''
  });

  // Book Detail Modal State
  const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);

  // Report Modal State (Replaces window.open for APK compatibility)
  const [viewingReport, setViewingReport] = useState<LoanRequest | null>(null);

  // Scanner State (Simulated for Browser safety)
  const [scannedData, setScannedData] = useState<LoanRequest | null>(null);
  const [scanInput, setScanInput] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [booksData, loansData] = await Promise.all([
        StorageService.getBooks(),
        StorageService.getLoans()
      ]);
      setBooks(booksData);
      setLoans(loansData);
    } catch (e) {
      console.error(e);
      alert("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic Books
  const filteredBooks = books.filter(book => {
    const matchesAuthor = book.author.toLowerCase().includes(authorFilter.toLowerCase());
    const matchesAvailability = 
      availabilityFilter === 'all' ? true :
      availabilityFilter === 'available' ? book.available :
      !book.available;
    
    return matchesAuthor && matchesAvailability;
  });

  // Loan Logic
  const getLoanStatusInfo = (loan: LoanRequest) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    // Parse 'YYYY-MM-DD' correctly to local midnight to avoid timezone shifts
    const [year, month, day] = loan.returnDate.split('-').map(Number);
    const returnDate = new Date(year, month - 1, day);
    
    const diffTime = returnDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isOverdue = loan.status === 'ACTIVE' && diffDays < 0;
    // Modified to 3 days as requested
    const isDueSoon = loan.status === 'ACTIVE' && !isOverdue && diffDays >= 0 && diffDays <= 3;

    return { isOverdue, isDueSoon, diffDays };
  };

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const pendingLoans = loans.filter(l => l.status === 'PENDING');
  const overdueLoans = loans.filter(l => getLoanStatusInfo(l).isOverdue);
  const dueSoonLoans = loans.filter(l => getLoanStatusInfo(l).isDueSoon);

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) return;

    setIsSaving(true);
    try {
      if (editingId) {
        // Logic for Editing
        const originalBook = books.find(b => b.id === editingId);
        const updatedBook: Book = {
          id: editingId,
          title: newBook.title!,
          author: newBook.author!,
          description: newBook.description || '',
          coverUrl: newBook.coverUrl || '',
          available: originalBook ? originalBook.available : true
        };

        await StorageService.updateBook(updatedBook);
        setBooks(books.map(b => b.id === editingId ? updatedBook : b));
      } else {
        // Logic for Adding
        const book: Book = {
          id: Date.now().toString(),
          title: newBook.title!,
          author: newBook.author!,
          description: newBook.description || '',
          coverUrl: newBook.coverUrl || `https://picsum.photos/200/300?random=${Date.now()}`,
          available: true
        };

        await StorageService.saveBook(book);
        setBooks([...books, book]);
      }
      
      // Reset Form
      setIsAdding(false);
      setEditingId(null);
      setNewBook({ title: '', author: '', description: '', coverUrl: '' });
    } catch (err) {
      alert("Error al guardar en base de datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (book: Book) => {
    setNewBook(book);
    setEditingId(book.id);
    setIsAdding(true);
    setSelectedBookDetail(null); // Close modal if open
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewBook({ title: '', author: '', description: '', coverUrl: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBook({ ...newBook, coverUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateScan = () => {
    try {
      // In a real app, this would come from a QR scanner library callback
      const data = JSON.parse(scanInput);
      setScannedData(data);
    } catch (e) {
      alert("Error al leer el código. Asegúrate de copiar el JSON completo generado por el alumno.");
    }
  };

  const confirmLoan = async () => {
    if (scannedData) {
      try {
        await StorageService.updateLoanStatus(scannedData.id, 'ACTIVE');
        alert(`Préstamo confirmado para ${scannedData.studentName}.`);
        setScannedData(null);
        setScanInput('');
        loadData(); // Reload stats
      } catch (e) {
        alert("Error actualizando el préstamo.");
      }
    }
  };

  const markAsReturned = async (loanId: string) => {
    if(confirm("¿Confirmar devolución del libro?")) {
      try {
        await StorageService.updateLoanStatus(loanId, 'RETURNED');
        // Update local state immediately for better UX
        setLoans(loans.map(l => l.id === loanId ? {...l, status: 'RETURNED'} : l));
      } catch(e) {
        alert("Error al actualizar estado");
      }
    }
  };

  // Safe Report Generation for APKs (No window.open)
  const openReportModal = (loan: LoanRequest) => {
    setViewingReport(loan);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto relative print:p-0 print:m-0 print:w-full">
      
      {/* CSS para Impresión: Oculta todo lo que no sea el área de impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white;
            border: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Toast Notification for Due Soon Loans */}
      {showNotification && dueSoonLoans.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-2xl rounded-r max-w-sm z-50 animate-slide-up flex items-start no-print">
          <Bell className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-yellow-800 text-sm">Próximos Vencimientos</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Hay {dueSoonLoans.length} préstamos que vencen en los próximos 3 días.
            </p>
            <button 
              onClick={() => setView('LOANS')}
              className="text-xs font-bold text-yellow-800 underline mt-2 hover:text-black"
            >
              Ver detalles
            </button>
          </div>
          <button 
            onClick={() => setShowNotification(false)}
            className="text-yellow-500 hover:text-yellow-800 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
        <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button 
            onClick={() => setView('BOOKS')}
            className={`px-4 py-2 rounded-md font-medium flex items-center transition-all ${view === 'BOOKS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Libros
          </button>
          <button 
            onClick={() => setView('LOANS')}
            className={`px-4 py-2 rounded-md font-medium flex items-center transition-all ${view === 'LOANS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ClipboardList className="w-4 h-4 mr-2" /> Préstamos
            <div className="flex space-x-1 ml-2">
              {overdueLoans.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{overdueLoans.length}</span>}
              {dueSoonLoans.length > 0 && <span className="bg-yellow-500 text-white text-[10px] px-1.5 rounded-full">{dueSoonLoans.length}</span>}
            </div>
          </button>
          <button 
            onClick={() => setView('SCAN')}
            className={`px-4 py-2 rounded-md font-medium flex items-center transition-all ${view === 'SCAN' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Scan className="w-4 h-4 mr-2" /> Escáner
          </button>
        </div>
      </div>

      {view === 'BOOKS' && (
        <div className="no-print">
          {!isAdding ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <button 
                onClick={() => {
                  setEditingId(null);
                  setNewBook({ title: '', author: '', description: '', coverUrl: '' });
                  setIsAdding(true);
                }}
                className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" /> Agregar Libro
              </button>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por autor..." 
                    className="pl-9 pr-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-100 w-full sm:w-48"
                    value={authorFilter}
                    onChange={(e) => setAuthorFilter(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select 
                    className="pl-9 pr-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-100 w-full sm:w-40 bg-white appearance-none cursor-pointer"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                  >
                    <option value="all">Todos</option>
                    <option value="available">Disponibles</option>
                    <option value="unavailable">Agotados</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-blue-100 animate-fade-in">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingId ? 'Editar Libro' : 'Registrar Libro'}
                </h2>
                <button onClick={cancelForm} className="text-gray-400 hover:text-red-500"><X /></button>
              </div>
              <form onSubmit={handleSaveBook} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Título</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border rounded-lg p-2"
                      value={newBook.title}
                      onChange={e => setNewBook({...newBook, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Autor</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border rounded-lg p-2"
                      value={newBook.author}
                      onChange={e => setNewBook({...newBook, author: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <textarea 
                      className="w-full border rounded-lg p-2"
                      rows={3}
                      value={newBook.description}
                      onChange={e => setNewBook({...newBook, description: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Portada del Libro</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                      {newBook.coverUrl ? (
                        <img src={newBook.coverUrl} alt="Preview" className="h-full object-contain" />
                      ) : (
                        <span className="text-gray-400 text-sm p-4 text-center">Seleccionar archivo de imagen</span>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                    </div>
                  </div>
                  <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center hover:bg-blue-700 disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Save className="w-5 h-5 mr-2" />}
                    {editingId ? 'Actualizar Libro' : 'Guardar Libro'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500">Cargando libros...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredBooks.map(book => (
                <div 
                  key={book.id} 
                  onClick={() => setSelectedBookDetail(book)}
                  className="bg-white p-4 rounded-lg shadow flex items-center space-x-4 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-500 transition-all group"
                >
                  <div className="relative">
                    <img src={book.coverUrl} alt={book.title} className="w-16 h-24 object-cover rounded bg-gray-200" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
                      <Info className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 line-clamp-2">{book.title}</h3>
                    <p className="text-sm text-gray-500">{book.author}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${book.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {book.available ? 'Disponible' : 'Agotado'}
                    </span>
                  </div>
                </div>
              ))}
              
              {filteredBooks.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400">
                  <p>No se encontraron libros con los filtros seleccionados.</p>
                </div>
              )}
            </div>
          )}

          {/* Book Detail Modal */}
          {selectedBookDetail && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
                <button 
                  onClick={() => setSelectedBookDetail(null)}
                  className="absolute top-4 right-4 bg-white/80 rounded-full p-1 text-gray-500 hover:text-red-500 hover:bg-white z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="md:w-1/3 h-64 md:h-auto bg-gray-100 relative">
                  <img 
                    src={selectedBookDetail.coverUrl} 
                    alt={selectedBookDetail.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className={`absolute bottom-0 left-0 right-0 p-2 text-center text-xs font-bold text-white ${selectedBookDetail.available ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
                    {selectedBookDetail.available ? 'DISPONIBLE' : 'AGOTADO'}
                  </div>
                </div>
                
                <div className="p-8 md:w-2/3 flex flex-col">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedBookDetail.title}</h2>
                  <p className="text-blue-600 font-medium mb-4 text-lg">{selectedBookDetail.author}</p>
                  
                  <div className="prose prose-sm text-gray-600 overflow-y-auto max-h-60 mb-6">
                    <h4 className="font-bold text-gray-900 mb-1">Sinopsis</h4>
                    <p>{selectedBookDetail.description}</p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                    <button 
                      onClick={() => startEditing(selectedBookDetail)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </button>
                    <button 
                      onClick={() => setSelectedBookDetail(null)}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LOANS VIEW */}
      {view === 'LOANS' && (
        <div className="space-y-8 no-print">
           {/* Stats Overview */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 flex items-center">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Préstamos Activos</p>
                  <p className="text-2xl font-bold text-gray-800">{activeLoans.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-100 flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full text-yellow-600 mr-4">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Pendientes de Recoger</p>
                  <p className="text-2xl font-bold text-gray-800">{pendingLoans.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex items-center">
                <div className="p-3 bg-red-100 rounded-full text-red-600 mr-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Vencidos / Atrasados</p>
                  <p className="text-2xl font-bold text-red-600">{overdueLoans.length}</p>
                </div>
              </div>
           </div>

           {/* Alerts Section (Overdue) */}
           {overdueLoans.length > 0 && (
             <div className="bg-red-50 border border-red-200 rounded-xl p-6">
               <h3 className="text-red-800 font-bold flex items-center mb-4">
                 <AlertTriangle className="w-5 h-5 mr-2" /> Vencidos - Atención Requerida ({overdueLoans.length})
               </h3>
               <div className="grid gap-3">
                 {overdueLoans.map(loan => (
                   <div key={loan.id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-bold text-gray-800">{loan.studentName} <span className="text-gray-400 font-normal">({loan.studentMatricula})</span></p>
                        <p className="text-sm text-gray-600">Libro: {loan.bookTitle}</p>
                        <p className="text-xs text-red-600 font-semibold mt-1">Venció el: {loan.returnDate}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openReportModal(loan)}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 font-medium flex items-center"
                          title="Ver Reporte"
                        >
                           <FileText className="w-4 h-4 mr-1" /> Reporte
                        </button>
                        <button 
                          onClick={() => markAsReturned(loan.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 font-medium"
                        >
                          Marcar Devuelto
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {/* Alerts Section (Due Soon - 3 days) */}
           {dueSoonLoans.length > 0 && (
             <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
               <h3 className="text-yellow-800 font-bold flex items-center mb-4">
                 <Calendar className="w-5 h-5 mr-2" /> Próximos a Vencer (3 días)
               </h3>
               <div className="grid gap-3">
                 {dueSoonLoans.map(loan => {
                   const { diffDays } = getLoanStatusInfo(loan);
                   return (
                    <div key={loan.id} className="bg-white p-3 rounded-lg border border-yellow-100 flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-bold text-gray-800">{loan.studentName} <span className="text-gray-400 font-normal">({loan.studentMatricula})</span></p>
                          <p className="text-sm text-gray-600">Libro: {loan.bookTitle}</p>
                          <p className="text-xs text-yellow-600 font-semibold mt-1">
                            Vence el: {loan.returnDate} {diffDays === 0 ? '(HOY)' : diffDays === 1 ? '(MAÑANA)' : `(en ${diffDays} días)`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openReportModal(loan)}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 font-medium flex items-center"
                            title="Ver Reporte"
                          >
                            <FileText className="w-4 h-4 mr-1" /> Reporte
                          </button>
                          <button 
                            onClick={() => markAsReturned(loan.id)}
                            className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-100 font-medium"
                          >
                            Devolver
                          </button>
                        </div>
                    </div>
                   );
                 })}
               </div>
             </div>
           )}

           {/* Active Loans Table */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50">
               <h3 className="font-bold text-gray-700">Listado de Préstamos Activos</h3>
             </div>
             {activeLoans.length === 0 ? (
               <div className="p-8 text-center text-gray-400">
                 No hay préstamos activos en este momento.
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-600 border-b">
                     <tr>
                       <th className="p-4 font-medium">Alumno</th>
                       <th className="p-4 font-medium">Libro</th>
                       <th className="p-4 font-medium">Recogido</th>
                       <th className="p-4 font-medium">Fecha Devolución Estimada</th>
                       <th className="p-4 font-medium">Estado</th>
                       <th className="p-4 font-medium text-right">Acción</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {activeLoans.map(loan => {
                       const { isOverdue, isDueSoon, diffDays } = getLoanStatusInfo(loan);
                       return (
                         <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                           <td className="p-4">
                             <div className="font-bold text-gray-800">{loan.studentName}</div>
                             <div className="text-xs text-gray-500 font-mono">{loan.studentMatricula}</div>
                           </td>
                           <td className="p-4 text-gray-700">{loan.bookTitle}</td>
                           <td className="p-4 text-gray-500">{loan.pickupDate}</td>
                           <td className="p-4">
                             <div className="flex flex-col">
                               <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-bold' : isDueSoon ? 'text-yellow-600 font-bold' : 'text-gray-600'}`}>
                                 {(isOverdue || isDueSoon) && <AlertTriangle className="w-3 h-3" />}
                                 {loan.returnDate}
                               </span>
                               <span className="text-[10px] text-gray-400 mt-0.5">
                                 {isOverdue 
                                   ? `Vencido hace ${Math.abs(diffDays)} días` 
                                   : diffDays === 0 
                                     ? 'Vence hoy' 
                                     : diffDays === 1 
                                        ? 'Vence mañana' 
                                        : `Vence en ${diffDays} días`
                                 }
                               </span>
                             </div>
                           </td>
                           <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                isOverdue ? 'bg-red-100 text-red-700' : isDueSoon ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {isOverdue ? 'ATRASADO' : isDueSoon ? 'POR VENCER' : 'AL CORRIENTE'}
                              </span>
                           </td>
                           <td className="p-4 flex justify-end gap-2">
                             <button
                               onClick={() => openReportModal(loan)}
                               className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                               title="Ver Reporte"
                             >
                               <FileText className="w-5 h-5" />
                             </button>
                             <button 
                               onClick={() => markAsReturned(loan.id)}
                               className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                               title="Marcar como Devuelto"
                             >
                               <CheckCircle className="w-5 h-5" />
                             </button>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             )}
           </div>
        </div>
      )}

      {/* REPORT MODAL (APK Safe) */}
      {viewingReport && (() => {
         const { isOverdue } = getLoanStatusInfo(viewingReport);
         const statusText = isOverdue ? "ATRASADO" : "ACTIVO";
         const statusColor = isOverdue ? "bg-red-600" : "bg-green-600";
         
         return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm print:bg-white print:static print:p-0 print:block">
              <div id="printable-report" className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center print:hidden">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" /> Reporte de Préstamo
                  </h3>
                  <button onClick={() => setViewingReport(null)} className="text-gray-400 hover:text-red-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 font-serif">
                   <div className="text-center border-b-2 border-blue-600 pb-4 mb-6">
                     <h1 className="text-2xl font-bold text-blue-700">BiblioTech</h1>
                     <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Comprobante Oficial</p>
                   </div>

                   <div className="flex justify-between text-xs text-gray-400 mb-6">
                      <span>ID: {viewingReport.id.slice(0, 8)}...</span>
                      <span>{new Date().toLocaleDateString()}</span>
                   </div>

                   <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                         <p className="text-xs font-bold text-gray-400 uppercase mb-1">Alumno</p>
                         <p className="font-bold text-lg text-gray-900">{viewingReport.studentName}</p>
                         <p className="font-mono text-gray-600">{viewingReport.studentMatricula}</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                         <p className="text-xs font-bold text-gray-400 uppercase mb-1">Libro</p>
                         <p className="font-bold text-gray-800">{viewingReport.bookTitle}</p>
                         <p className="text-xs text-gray-500 mt-1">ID: {viewingReport.bookId}</p>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-400 uppercase">Recolección</p>
                          <p className="font-medium">{viewingReport.pickupDate}</p>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase">Vencimiento</p>
                          <p className="font-bold text-red-600">{viewingReport.returnDate}</p>
                        </div>
                      </div>

                      <div className="text-center mt-6 pt-4 border-t border-dashed border-gray-300">
                        <span className={`inline-block px-4 py-1 rounded-full text-white text-xs font-bold ${statusColor}`}>
                          ESTADO: {statusText}
                        </span>
                      </div>
                   </div>

                   <div className="mt-8 text-center text-[10px] text-gray-400">
                     <p>BiblioTech System 2024</p>
                   </div>
                </div>

                <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3 print:hidden">
                   <button 
                     onClick={handlePrint}
                     className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center"
                   >
                     <Printer className="w-4 h-4 mr-2" /> Imprimir
                   </button>
                   <button 
                     onClick={() => setViewingReport(null)}
                     className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50"
                   >
                     Cerrar
                   </button>
                </div>
              </div>
            </div>
         );
      })()}

      {view === 'SCAN' && (
        <div className="max-w-2xl mx-auto no-print">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
            <Scan className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Escanear Solicitud</h2>
            <p className="text-gray-500 mb-6">
              Escanea el código QR del alumno para ver los detalles del préstamo.
            </p>
            
            {/* Simulation Input due to browser limitations with direct camera access in some environments without HTTPS */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left text-sm">
              <p className="font-bold text-yellow-800 mb-1">Nota del Desarrollador:</p>
              <p>En un entorno real, esto abriría la cámara automáticamente. Para esta demo, pega el contenido JSON generado por el código QR del alumno aquí para simular el escaneo.</p>
            </div>

            <textarea 
              className="w-full border p-3 rounded-lg mb-4 text-xs font-mono bg-gray-50"
              rows={4}
              placeholder='Pega el contenido del QR aquí...'
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
            
            <button 
              onClick={simulateScan}
              disabled={!scanInput}
              className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-black disabled:opacity-50"
            >
              Simular Escaneo
            </button>
          </div>

          {scannedData && (
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-xl border-l-4 border-green-500 animate-slide-up">
              <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
                <Check className="w-6 h-6 mr-2" /> Solicitud Válida
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Alumno</p>
                  <p className="font-semibold text-lg">{scannedData.studentName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Matrícula</p>
                  <p className="font-semibold text-lg">{scannedData.studentMatricula}</p>
                </div>
                <div>
                  <p className="text-gray-500">Libro Solicitado</p>
                  <p className="font-semibold text-lg text-blue-600">{scannedData.bookTitle}</p>
                </div>
                <div>
                  <p className="text-gray-500">Estatus Actual</p>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">{scannedData.status}</span>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-gray-500 text-xs">Fecha Recogida</p>
                    <p className="font-medium">{scannedData.pickupDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Fecha Entrega</p>
                    <p className="font-medium">{scannedData.returnDate}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={confirmLoan}
                className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg transition-transform transform hover:scale-[1.02]"
              >
                Aprobar Préstamo y Entregar Libro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};