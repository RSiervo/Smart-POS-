import React, { useState, useRef, useEffect } from 'react';
import { CartItem, Product, User, PrinterSettings } from '../types';
import { 
    ScanBarcode, Printer, Trash2, Plus, Minus, Search, LogOut, 
    PackageX, X, FileText, ShoppingCart, Calculator, CreditCard, 
    History, Keyboard
} from 'lucide-react';

interface CashierViewProps {
  currentUser: User;
  cart: CartItem[];
  products: Product[];
  printerSettings: PrinterSettings;
  onLogout: () => void;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onCheckout: (items: CartItem[], total: number) => Promise<void>;
}

const CashierView: React.FC<CashierViewProps> = ({
  currentUser,
  cart,
  products,
  printerSettings,
  onLogout,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onCheckout
}) => {
  const [scannerInput, setScannerInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F2') {
            e.preventDefault();
            scannerInputRef.current?.focus();
        }
        if (e.key === 'F4') {
            e.preventDefault();
            setShowSearchModal(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Auto-focus logic
    scannerInputRef.current?.focus();
    const interval = setInterval(() => {
        if (!showSearchModal && !showReceiptPreview) {
            scannerInputRef.current?.focus();
        }
    }, 3000); 

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        clearInterval(interval);
    };
  }, [showSearchModal, showReceiptPreview]);

  // Calculation Logic
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; 
  const vatableSales = total / 1.12; 
  const vatAmount = total - vatableSales;

  const lastScannedItem = cart.length > 0 ? cart[cart.length - 1] : null;

  // Quick Picks (Simulated "Favorites" - taking first 8 items)
  const quickPicks = products.slice(0, 8);

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    const product = products.find(p => p.barcode === scannerInput.trim());
    
    if (product) {
      onAddToCart(product);
      setScannerInput('');
    } else {
      // Simple shake effect or alert could go here
      alert(`Item not found: ${scannerInput}`);
      setScannerInput('');
    }
  };

  const handlePreviewReceipt = () => {
    if (cart.length === 0) return;
    setShowReceiptPreview(true);
  };

  const handleConfirmPrint = async () => {
    setIsProcessing(true);
    await onCheckout(cart, total);
    setIsProcessing(false);
    setShowReceiptPreview(false);
  };

  const filteredSearchProducts = products.filter(p => 
    p.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) || 
    p.barcode.includes(manualSearchQuery)
  );
  
  const previewPaperWidthClass = printerSettings.paperWidth === '58mm' ? 'w-[300px]' : 'w-[400px]';

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-900">
      
      {/* --- LEFT SIDE: MAIN TRANSACTION AREA (65%) --- */}
      <div className="flex-grow flex flex-col h-full border-r border-gray-200 bg-white relative">
        
        {/* Top Bar */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
                    <ShoppingCart size={20} />
                </div>
                <div>
                    <h1 className="font-bold text-gray-900 leading-tight">Current Transaction</h1>
                    <p className="text-xs text-gray-400 font-medium">{new Date().toLocaleDateString()} • ID: #{Date.now().toString().slice(-6)}</p>
                </div>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={() => setShowSearchModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                    title="Press F4"
                >
                    <Search size={16} />
                    Search Product
                </button>
                <button 
                    onClick={onClearCart}
                    disabled={cart.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 size={16} />
                    Void Cart
                </button>
            </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[45%]">Item Description</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[20%]">Quantity</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[15%]">Price</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[20%]">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {cart.length === 0 ? (
                        <tr>
                            <td colSpan={4}>
                                <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                                    <ShoppingCart size={48} strokeWidth={1} className="mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Cart is empty</p>
                                    <p className="text-sm">Scan a barcode or select a quick item</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        cart.map((item) => (
                            <tr key={item.id} className="group hover:bg-indigo-50/30 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        {/* Optional small image */}
                                        <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden">
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{item.barcode}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center justify-center bg-white border border-gray-200 rounded-lg w-fit mx-auto shadow-sm">
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, -1)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-l-lg transition-colors"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, 1)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-r-lg transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-right font-mono text-gray-600">
                                    ₱{item.price.toFixed(2)}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-4">
                                        <span className="font-bold text-gray-900 font-mono">₱{(item.price * item.quantity).toFixed(2)}</span>
                                        <button 
                                            onClick={() => onRemoveFromCart(item.id)}
                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Quick Keys Section (Bottom of Main) */}
        <div className="h-48 bg-gray-50 border-t border-gray-200 p-4 flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Keyboard size={14} />
                Quick Access Keys
            </h3>
            <div className="flex-1 grid grid-cols-4 gap-3 overflow-y-auto no-scrollbar">
                {quickPicks.map(product => (
                    <button
                        key={product.id}
                        onClick={() => onAddToCart(product)}
                        className="bg-white border border-gray-200 rounded-xl p-3 hover:border-indigo-500 hover:shadow-md hover:ring-2 hover:ring-indigo-500/20 transition-all flex flex-col items-start justify-between group h-full"
                    >
                        <span className="font-semibold text-sm text-gray-700 group-hover:text-indigo-700 line-clamp-2 text-left leading-tight">{product.name}</span>
                        <span className="text-xs font-bold text-gray-400 mt-2 group-hover:text-indigo-500">₱{product.price.toFixed(2)}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: CONTROLS & TOTALS (35%) --- */}
      <div className="w-[400px] flex flex-col bg-gray-50 shadow-xl z-10 border-l border-gray-200">
        
        {/* User Info */}
        <div className="h-16 bg-gray-900 text-white flex items-center justify-between px-6 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {currentUser.name.charAt(0)}
                </div>
                <div className="leading-tight">
                    <p className="font-bold text-sm">{currentUser.name}</p>
                    <p className="text-xs text-gray-400 uppercase">Cashier</p>
                </div>
            </div>
            <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors" title="Logout">
                <LogOut size={18} />
            </button>
        </div>

        <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
            
            {/* Scanner Section */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex justify-between">
                    <span>Scan Barcode (F2)</span>
                    {isProcessing && <span className="text-indigo-600 animate-pulse">Processing...</span>}
                </label>
                <form onSubmit={handleBarcodeScan} className="relative">
                    <input 
                        ref={scannerInputRef}
                        type="text"
                        value={scannerInput}
                        onChange={(e) => setScannerInput(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-mono text-lg font-bold transition-all"
                        placeholder="Scan item..."
                        autoFocus
                        disabled={showReceiptPreview || showSearchModal}
                    />
                    <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </form>
            </div>

            {/* Last Scanned Item Display */}
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <History size={80} />
                </div>
                {lastScannedItem ? (
                    <div className="relative z-10 animate-in slide-in-from-right fade-in duration-300">
                         <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Last Added</p>
                         <h3 className="text-xl font-bold leading-tight mb-2 line-clamp-2">{lastScannedItem.name}</h3>
                         <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-bold">₱{lastScannedItem.price.toFixed(2)}</span>
                             <span className="text-indigo-300 text-sm">x{lastScannedItem.quantity}</span>
                         </div>
                    </div>
                ) : (
                    <div className="text-center opacity-60 relative z-10">
                        <p className="font-medium">Ready to scan</p>
                        <p className="text-xs">Items will appear here</p>
                    </div>
                )}
            </div>

            <div className="flex-1"></div>

            {/* Totals Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                    <span>VAT (12%)</span>
                    <span className="font-mono">₱{vatAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-3 mt-1">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-900 font-bold">Total Amount</span>
                        <span className="text-3xl font-bold text-indigo-700 font-mono">₱{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Checkout Button */}
            <button 
                onClick={handlePreviewReceipt}
                disabled={cart.length === 0}
                className="w-full h-16 bg-gray-900 text-white rounded-2xl text-xl font-bold shadow-xl shadow-gray-400 hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Printer size={24} />
                <span>Print Receipt</span>
            </button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] scale-100">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText size={20} className="text-indigo-600"/>
                        Print Preview
                    </h3>
                    <button onClick={() => setShowReceiptPreview(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-300 flex justify-center">
                    <div className={`bg-white ${previewPaperWidthClass} shadow-2xl p-5 text-xs font-mono text-gray-900 transition-all duration-300 transform`}>
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-bold uppercase tracking-wider mb-1">{printerSettings.storeName}</h2>
                            <p className="text-gray-500">{printerSettings.address}</p>
                            <p className="text-gray-500">TIN: {printerSettings.tin}</p>
                        </div>

                        <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4 space-y-1">
                            <div className="flex justify-between"><span>Date:</span> <span>{new Date().toLocaleDateString()}</span></div>
                            <div className="flex justify-between"><span>Time:</span> <span>{new Date().toLocaleTimeString()}</span></div>
                            <div className="flex justify-between"><span>Cashier:</span> <span>{currentUser.name}</span></div>
                        </div>

                        <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                             {cart.map((item) => (
                                 <div key={item.id} className="mb-2 last:mb-0">
                                     <div className="font-bold">{item.name}</div>
                                     <div className="flex justify-between text-gray-600 mt-0.5">
                                         <span>{item.quantity} x {item.price.toFixed(2)}</span>
                                         <span>{(item.quantity * item.price).toFixed(2)}</span>
                                     </div>
                                 </div>
                             ))}
                        </div>

                        <div className="space-y-1 mb-6">
                            <div className="flex justify-between font-bold text-lg">
                                <span>TOTAL</span>
                                <span>PHP {total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                <span>VATable: {vatableSales.toFixed(2)}</span>
                                <span>VAT: {vatAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="italic">{printerSettings.footerMessage}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-200 bg-white flex gap-3">
                    <button 
                        onClick={() => setShowReceiptPreview(false)}
                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleConfirmPrint}
                        disabled={isProcessing}
                        className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                    >
                        {isProcessing ? <span className="animate-pulse">Printing...</span> : <>Confirm Print</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Manual Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Product Search</h3>
                        <p className="text-sm text-gray-500">Select items to add to cart</p>
                    </div>
                    <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg"
                            placeholder="Type name or barcode..."
                            value={manualSearchQuery}
                            onChange={(e) => setManualSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredSearchProducts.length === 0 ? (
                            <div className="text-center py-10">
                                <PackageX size={48} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-500">No products found matching "{manualSearchQuery}"</p>
                            </div>
                        ) : (
                            filteredSearchProducts.map(product => (
                                <button 
                                    key={product.id}
                                    onClick={() => {
                                        onAddToCart(product);
                                        setShowSearchModal(false);
                                        setManualSearchQuery('');
                                        setScannerInput('');
                                    }}
                                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-700">{product.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{product.barcode}</span>
                                            <span className="text-xs text-gray-400">{product.category}</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-lg text-indigo-600">₱{product.price.toFixed(2)}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CashierView;