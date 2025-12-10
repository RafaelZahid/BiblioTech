import React, { useState, useEffect, useRef } from 'react';
import { Book, LoanRequest } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Scan, BookOpen, Save, X, Check, Pencil, ChevronLeft, ChevronRight, History, Calendar, Filter, Search, AlertTriangle, FileText, RefreshCcw, Camera, Loader2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import jsQR from 'jsqr';

export const AdminDashboard: React.FC = () => {
  const [view, setView] = useState<'BOOKS' | 'SCAN' | 'HISTORY'>('BOOKS');
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination State (Books)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Add/Edit Book Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newBook, setNewBook] = useState<Partial<Book>>({
    title: '', author: '', description: '', coverUrl: ''
  });
  const [urlError, setUrlError] = useState('');

  // Scanner State
  const [scannedData, setScannedData] = useState<LoanRequest | null>(null);
  const [scanInput, setScanInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState('');

  // History Filters State
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<'ALL' | 'ACTIVE' | 'RETURNED' | 'PENDING' | 'OVERDUE'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Load loans on mount or when view changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (view === 'BOOKS') {
        const data = await StorageService.getBooks();
        setBooks(data);
      } else {
        const data = await StorageService.getLoans();
        setLoans(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [view]);

  // Camera Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      if (view !== 'SCAN' || scannedData) return;

      try {
        setCameraError('');
        const constraints = { video: { facingMode: 'environment' } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // iOS fix
          await videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError('No se pudo acceder a la cámara. Verifique los permisos o use la entrada manual.');
      }
    };

    const tick = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
             try {
                const parsed = JSON.parse(code.data);
                if (parsed.bookId) { // Check for bookId as minimal requirement
                   // For scanned objects from offline/QR generation that might not have a DB ID yet if logic was different, 
                   // but current logic saves to DB then generates QR with ID.
                   setScannedData(parsed);
                   return; // Stop scanning loop
                }
             } catch (e) {
                // Ignore non-json or invalid data
             }
          }
        }
      }
      
      if (!scannedData && view === 'SCAN') {
        animationId = requestAnimationFrame(tick);
      }
    };

    if (view === 'SCAN' && !scannedData) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [view, scannedData]);

  // Pagination Logic
  const totalPages = Math.ceil(books.length / ITEMS_PER_PAGE);
  const paginatedBooks = books.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(''); // Reset error
    setActionLoading(true);

    if (!newBook.title || !newBook.author) {
       setActionLoading(false);
       return;
    }

    // Validate URL
    if (newBook.coverUrl && !newBook.coverUrl.startsWith('data:')) {
      try {
        new URL(newBook.coverUrl);
      } catch (error) {
        setUrlError('La URL de la imagen no es válida. Ingrese una URL completa (http://...) o suba una imagen.');
        setActionLoading(false);
        return;
      }
    }

    try {
      if (newBook.id) {
        // EDIT MODE
        const updatedBook = { ...newBook } as Book;
        await StorageService.updateBook(updatedBook);
        setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
      } else {
        // CREATE MODE
        const book: Book = {
          id: '', // Firestore generates ID
          title: newBook.title!,
          author: newBook.author!,
          description: newBook.description || '',
          coverUrl: newBook.coverUrl || `https://picsum.photos/200/300?random=${Date.now()}`,
          available: true
        };
        await StorageService.saveBook(book);
        const allBooks = await StorageService.getBooks(); // Refresh to get IDs
        setBooks(allBooks);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving book:", error);
      alert("Error al guardar el libro");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (book: Book) => {
    setNewBook({ ...book });
    setUrlError('');
    setIsAdding(true);
  };

  const handleToggleAvailability = async (book: Book) => {
    try {
      const updatedBook = { ...book, available: !book.available };
      await StorageService.updateBook(updatedBook);
      setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
    } catch (e) {
      console.error(e);
      alert("Error al actualizar disponibilidad");
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setNewBook({ title: '', author: '', description: '', coverUrl: '' });
    setUrlError('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBook({ ...newBook, coverUrl: reader.result as string });
        setUrlError(''); // Clear error if valid file uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateScan = () => {
    try {
      const data = JSON.parse(scanInput);
      setScannedData(data);
    } catch (e) {
      alert("Error al leer el código. Asegúrate de copiar el JSON completo generado por el alumno.");
    }
  };

  const confirmLoan = async () => {
    if (scannedData) {
      try {
        setActionLoading(true);
        await StorageService.updateLoanStatus(scannedData.id, 'ACTIVE');
        alert(`Préstamo confirmado para ${scannedData.studentName}.`);
        setScannedData(null);
        setScanInput('');
        const freshLoans = await StorageService.getLoans();
        setLoans(freshLoans); // Refresh loans
      } catch (error) {
        alert("Error al confirmar préstamo");
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Helper for History Filter Logic
  const getFilteredLoans = () => {
    return loans.filter(loan => {
      // 1. Text Search
      const matchesSearch = 
        loan.studentName.toLowerCase().includes(historySearch.toLowerCase()) ||
        loan.studentMatricula.includes(historySearch) ||
        loan.bookTitle.toLowerCase().includes(historySearch.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Status Filter
      const isLate = new Date(loan.returnDate) < new Date();
      const isCalculatedOverdue = isLate && loan.status === 'ACTIVE';
      
      if (historyStatus === 'OVERDUE') {
        if (loan.status !== 'OVERDUE' && !isCalculatedOverdue) return false;
      }
      else if (historyStatus === 'ACTIVE') {
        if (loan.status !== 'ACTIVE' || isCalculatedOverdue) return false;
      }
      else if (historyStatus === 'RETURNED' && loan.status !== 'RETURNED') return false;
      else if (historyStatus === 'PENDING' && loan.status !== 'PENDING') return false;

      // 3. Date Filter
      if (dateStart && new Date(loan.pickupDate) < new Date(dateStart)) return false;
      if (dateEnd && new Date(loan.pickupDate) > new Date(dateEnd)) return false;

      return true;
    });
  };

  const handleReturnBook = async (loanId: string) => {
    if (window.confirm('¿Confirmar devolución del libro?')) {
      try {
        await StorageService.updateLoanStatus(loanId, 'RETURNED');
        setLoans(loans.map(l => l.id === loanId ? { ...l, status: 'RETURNED' } : l));
        
        // Optionally make book available again logic here if requirements changed, 
        // currently user does it manually via book list as per previous requests.
      } catch (e) {
        alert("Error al devolver libro");
      }
    }
  };

  const handleMarkOverdue = async (loanId: string) => {
    if (window.confirm('¿Marcar este préstamo como vencido?')) {
      try {
        await StorageService.updateLoanStatus(loanId, 'OVERDUE');
        setLoans(loans.map(l => l.id === loanId ? { ...l, status: 'OVERDUE' } : l));
      } catch (e) {
         alert("Error al actualizar estado");
      }
    }
  };

  const generateLoanPDF = (loan: LoanRequest) => {
    const doc = new jsPDF();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BiblioTech - Reporte de Préstamo", 15, 17);
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    let y = 45;
    const lineHeight = 10;
    const leftCol = 20;
    const rightCol = 70;

    const addSection = (title: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text(title, leftCol, y);
      doc.line(leftCol, y + 2, 190, y + 2);
      y += 15;
    };

    const addField = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`${label}:`, leftCol, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, rightCol, y);
      y += lineHeight;
    };

    addSection("Información del Préstamo");
    addField("ID Transacción", loan.id);
    addField("Estado Actual", loan.status);
    y += 5;
    addSection("Datos del Alumno");
    addField("Nombre", loan.studentName);
    addField("Matrícula", loan.studentMatricula);
    y += 5;
    addSection("Datos del Libro");
    addField("Título", loan.bookTitle);
    addField("ID Libro", loan.bookId);
    y += 5;
    addSection("Fechas");
    addField("Fecha de Salida", loan.pickupDate);
    addField("Fecha de Devolución", loan.returnDate);
    doc.setFontSize(10);
    doc.setTextColor(150);
    const dateStr = new Date().toLocaleString();
    doc.text(`Documento generado electrónicamente el ${dateStr}`, leftCol, 280);
    doc.save(`prestamo_${loan.studentMatricula}_${loan.id}.pdf`);
  };

  const filteredLoans = getFilteredLoans();

  if (loading && view !== 'SCAN') {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8"/></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
        <div className="flex space-x-2 bg-white p-1 rounded-lg shadow-sm border">
          <button 
            onClick={() => setView('BOOKS')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center transition-all ${view === 'BOOKS' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Libros
          </button>
          <button 
            onClick={() => setView('SCAN')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center transition-all ${view === 'SCAN' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Scan className="w-4 h-4 mr-2" /> Escáner
          </button>
          <button 
            onClick={() => setView('HISTORY')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center transition-all ${view === 'HISTORY' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <History className="w-4 h-4 mr-2" /> Historial
          </button>
        </div>
      </div>

      {view === 'BOOKS' && (
        <div>
          {!isAdding ? (
            <button 
              onClick={() => {
                setNewBook({ title: '', author: '', description: '', coverUrl: '' });
                setIsAdding(true);
              }}
              className="mb-6 bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" /> Agregar Nuevo Libro
            </button>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-blue-100 animate-fade-in">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {newBook.id ? 'Editar Libro' : 'Registrar Libro'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-red-500"><X /></button>
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
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id="available"
                      checked={newBook.available ?? true}
                      onChange={e => setNewBook({...newBook, available: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="available" className="text-sm font-medium text-gray-700">
                      Disponible para préstamo
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Portada del Libro</label>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/portada.jpg"
                      className={`w-full border rounded-lg p-2 mb-2 text-sm ${urlError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
                      value={newBook.coverUrl?.startsWith('data:') ? '' : newBook.coverUrl || ''}
                      onChange={(e) => {
                        setNewBook({ ...newBook, coverUrl: e.target.value });
                        setUrlError('');
                      }}
                    />
                    {newBook.coverUrl?.startsWith('data:') && (
                       <p className="text-xs text-green-600 mb-2 font-medium flex items-center">
                         <Check className="w-3 h-3 mr-1" /> Imagen cargada desde archivo
                       </p>
                    )}
                    {urlError && <p className="text-red-500 text-xs mb-2 font-medium">{urlError}</p>}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center bg-gray-50 overflow-hidden relative transition-colors hover:bg-gray-100">
                      {newBook.coverUrl ? (
                        <img src={newBook.coverUrl} alt="Preview" className="h-full object-contain" />
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-gray-400 text-sm">Arrastra una imagen o haz clic para subir</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                    </div>
                  </div>
                  <button 
                     type="submit" 
                     disabled={actionLoading}
                     className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center hover:bg-blue-700 disabled:opacity-70"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> {newBook.id ? 'Actualizar Libro' : 'Guardar Libro'}</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginatedBooks.map(book => (
              <div key={book.id} className={`bg-white p-4 rounded-lg shadow flex space-x-4 relative group ${!book.available ? 'opacity-90 bg-gray-50' : ''}`}>
                <div className="relative shrink-0">
                  <img src={book.coverUrl} alt={book.title} className="w-16 h-24 object-cover rounded bg-gray-200" />
                  {!book.available && (
                    <div className="absolute inset-0 bg-black/10 rounded flex items-center justify-center">
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-gray-800 truncate" title={book.title}>{book.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{book.author}</p>
                  <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${book.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {book.available ? 'Disponible' : 'Agotado'}
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(book)}
                    className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-blue-600"
                    title="Editar libro"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!book.available && (
                    <button 
                      onClick={() => handleToggleAvailability(book)}
                      className="p-2 bg-white rounded-full shadow-md text-red-500 hover:text-green-600 hover:bg-green-50"
                      title="Marcar como Disponible (Restock)"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {books.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center mt-8 space-x-4">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'SCAN' && (
        <div className="max-w-2xl mx-auto">
          {!scannedData ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center justify-center">
                <Scan className="w-6 h-6 mr-2 text-blue-600" /> Escanear QR
              </h2>

              {cameraError ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm font-medium">
                  {cameraError}
                </div>
              ) : (
                <div className="relative w-full max-w-sm mx-auto aspect-square bg-black rounded-xl overflow-hidden mb-6 shadow-inner">
                  <video ref={videoRef} className="w-full h-full object-cover"></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-400 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                     <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                       Apunta la cámara al código del alumno
                     </span>
                  </div>
                </div>
              )}

              {/* Manual Input Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <details className="text-left group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center">
                    <Camera className="w-4 h-4 mr-2" />
                    ¿Problemas con la cámara? Usar entrada manual
                  </summary>
                  <div className="mt-4 animate-fade-in">
                    <textarea 
                      className="w-full border p-3 rounded-lg mb-3 text-xs font-mono bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
                      rows={3}
                      placeholder='Pega el contenido del JSON del QR aquí...'
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                    />
                    <button 
                      onClick={simulateScan}
                      disabled={!scanInput}
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-black disabled:opacity-50 text-sm"
                    >
                      Procesar Entrada Manual
                    </button>
                  </div>
                </details>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-white p-6 rounded-2xl shadow-xl border-l-4 border-green-500 animate-slide-up">
              <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
                <Check className="w-6 h-6 mr-2" /> Solicitud Detectada
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-gray-500">Alumno</p>
                  <p className="font-semibold text-lg">{scannedData.studentName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Matrícula</p>
                  <p className="font-semibold text-lg">{scannedData.studentMatricula}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Libro Solicitado</p>
                  <p className="font-semibold text-lg text-blue-600">{scannedData.bookTitle}</p>
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

              <div className="flex gap-4">
                <button 
                   onClick={() => setScannedData(null)}
                   className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                   Cancelar
                </button>
                <button 
                  onClick={confirmLoan}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg transition-transform transform hover:scale-[1.02] flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Aprobar Préstamo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'HISTORY' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-600" /> Filtros de Búsqueda
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Alumno, Matrícula o Libro" 
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <div>
                <select 
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value as any)}
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="ACTIVE">En Préstamo (Al día)</option>
                  <option value="RETURNED">Devueltos</option>
                  <option value="PENDING">Pendientes de Entrega</option>
                  <option value="OVERDUE">Vencidos (Atrasados)</option>
                </select>
              </div>
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">DE</span>
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
              </div>
              <div>
                 <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">A</span>
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Alumno</th>
                    <th className="px-6 py-4">Libro</th>
                    <th className="px-6 py-4">Salida</th>
                    <th className="px-6 py-4">F. Entrega</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No se encontraron préstamos con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const today = new Date();
                      const todayStr = today.toISOString().split('T')[0];
                      
                      const isOverdue = loan.returnDate < todayStr;
                      
                      const threeDaysFromNow = new Date();
                      threeDaysFromNow.setDate(today.getDate() + 3);
                      const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
                      
                      const isDueSoon = !isOverdue && loan.returnDate <= threeDaysStr && loan.returnDate >= todayStr;
                      
                      const showOverdueWarning = (isOverdue && loan.status === 'ACTIVE') || loan.status === 'OVERDUE';
                      const showSoonWarning = isDueSoon && loan.status === 'ACTIVE';

                      return (
                        <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{loan.studentName}</p>
                            <p className="text-xs text-gray-500">{loan.studentMatricula}</p>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {loan.bookTitle}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {loan.pickupDate}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`flex items-center font-medium ${showOverdueWarning ? 'text-red-600' : showSoonWarning ? 'text-yellow-600' : 'text-blue-600'}`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              {loan.returnDate}
                              {showOverdueWarning && <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold">Vencido</span>}
                              {showSoonWarning && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold">Pronto</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {loan.status === 'RETURNED' && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                Devuelto
                              </span>
                            )}
                            {loan.status === 'PENDING' && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                Pendiente QR
                              </span>
                            )}
                            {loan.status === 'ACTIVE' && (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${showOverdueWarning ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {showOverdueWarning ? 'Vencido (Activo)' : 'En Préstamo'}
                              </span>
                            )}
                            {loan.status === 'OVERDUE' && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                                Marcado Vencido
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              <button
                                onClick={() => generateLoanPDF(loan)}
                                className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded border border-gray-200 transition-colors flex items-center"
                                title="Descargar Reporte PDF"
                              >
                                <FileText className="w-3 h-3" />
                              </button>

                              {loan.status === 'ACTIVE' && (
                                <button 
                                  onClick={() => handleReturnBook(loan.id)}
                                  className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded border border-blue-200 transition-colors"
                                >
                                  Devuelto
                                </button>
                              )}
                              
                              {showOverdueWarning && loan.status === 'ACTIVE' && (
                                <button 
                                  onClick={() => handleMarkOverdue(loan.id)}
                                  className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded border border-red-200 transition-colors flex items-center"
                                  title="Marcar como Vencido"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Vencido
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 border-t flex justify-between">
               <span>Mostrando {filteredLoans.length} registro(s)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};