import React, { useState, useRef, useEffect } from 'react';
import { CartItem, Product, User, PrinterSettings } from '../types';
import { 
    ScanBarcode, Printer, Trash2, Plus, Minus, Search, LogOut, 
    PackageX, X, FileText, ShoppingCart, Calculator, CreditCard, 
    History, Keyboard, Sun, Moon, Hash, Banknote
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
  onCheckout: (items: CartItem[], total: number, amountTendered: number, change: number) => Promise<void>;
  isDarkMode: boolean;
  onToggleTheme: () => void;
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
  onCheckout,
  isDarkMode,
  onToggleTheme
}) => {
  const [scannerInput, setScannerInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  
  // Payment State
  const [amountTendered, setAmountTendered] = useState<string>('');
  
  // Quantity Edit State
  const [editingQuantityItem, setEditingQuantityItem] = useState<CartItem | null>(null);
  const [newQuantityVal, setNewQuantityVal] = useState('');
  
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');

  // Calculation Logic
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; 
  const vatableSales = total / 1.12; 
  const vatAmount = total - vatableSales;
  
  const tenderedNum = parseFloat(amountTendered) || 0;
  const change = tenderedNum >= total ? tenderedNum - total : 0;
  const isPaymentSufficient = tenderedNum >= total;

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
    setAmountTendered(''); // Reset payment
    setShowReceiptPreview(true);
    setTimeout(() => paymentInputRef.current?.focus(), 100);
  };

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
        if (e.key === 'F9') {
            e.preventDefault();
            if (cart.length > 0 && !showReceiptPreview && !showSearchModal && !editingQuantityItem) {
                handlePreviewReceipt();
            }
        }
        if (e.key === 'Escape') {
            if (showCalculator) setShowCalculator(false);
            if (showSearchModal) setShowSearchModal(false);
            if (showReceiptPreview) setShowReceiptPreview(false);
            if (editingQuantityItem) setEditingQuantityItem(null);
        }
        // Enter key for quantity modal
        if (e.key === 'Enter' && editingQuantityItem) {
            handleSaveQuantity();
        }
        // Enter key for Payment Modal to confirm
        if (e.key === 'Enter' && showReceiptPreview && isPaymentSufficient) {
             handleConfirmPrint();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Auto-focus logic
    if (!showSearchModal && !showReceiptPreview && !showCalculator && !editingQuantityItem) {
        // Debounce slightly to prevent stealing focus if user is clicking elsewhere
        const timeout = setTimeout(() => scannerInputRef.current?.focus(), 100);
        return () => clearTimeout(timeout);
    }
    
    // Focus quantity input when modal opens
    if (editingQuantityItem) {
        setTimeout(() => qtyInputRef.current?.focus(), 50);
    }

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchModal, showReceiptPreview, showCalculator, editingQuantityItem, cart.length, isPaymentSufficient]);

  const handleConfirmPrint = async () => {
    if (!isPaymentSufficient) return;
    setIsProcessing(true);
    await onCheckout(cart, total, tenderedNum, change);
    setIsProcessing(false);
    setShowReceiptPreview(false);
  };

  const handleExactAmount = () => {
      setAmountTendered(total.toString());
  };

  const handleAddAmount = (amount: number) => {
      setAmountTendered(prev => {
          const curr = parseFloat(prev) || 0;
          return (curr + amount).toString();
      });
  };

  // Quantity Edit Logic
  const handleQuantityClick = (item: CartItem) => {
      setEditingQuantityItem(item);
      setNewQuantityVal(item.quantity.toString());
  };

  const handleQuantityNumpad = (val: string) => {
      if (val === 'back') {
          setNewQuantityVal(prev => prev.slice(0, -1));
      } else if (val === 'clear') {
          setNewQuantityVal('');
      } else {
          setNewQuantityVal(prev => prev + val);
      }
  };

  const handleSaveQuantity = () => {
      if (!editingQuantityItem) return;
      const newQty = parseInt(newQuantityVal);
      
      if (isNaN(newQty) || newQty <= 0) {
          onRemoveFromCart(editingQuantityItem.id);
      } else {
          // Calculate delta
          const delta = newQty - editingQuantityItem.quantity;
          if (delta !== 0) {
              onUpdateQuantity(editingQuantityItem.id, delta);
          }
      }
      setEditingQuantityItem(null);
  };

  const handleCalcInput = (val: string) => {
    if (val === 'C') {
        setCalcDisplay('0');
        setCalcExpression('');
        return;
    }
    if (val === '=') {
        try {
            // Safe evaluation for simple math
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + calcExpression)();
            setCalcDisplay(String(result));
            setCalcExpression(String(result));
        } catch (e) {
            setCalcDisplay('Error');
            setCalcExpression('');
        }
        return;
    }
    if (['+', '-', '*', '/'].includes(val)) {
        setCalcExpression(prev => prev + val);
        setCalcDisplay(prev => prev + val);
    } else {
        // Numbers or decimal
        if (calcDisplay === '0' || calcDisplay === 'Error') {
            setCalcDisplay(val);
            setCalcExpression(val);
        } else {
            setCalcDisplay(prev => prev + val);
            setCalcExpression(prev => prev + val);
        }
    }
  };

  const filteredSearchProducts = products.filter(p => 
    p.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) || 
    p.barcode.includes(manualSearchQuery)
  );
  
  const previewPaperWidthClass = printerSettings.paperWidth === '58mm' ? 'w-[300px]' : 'w-[400px]';

  const clearScannerInput = () => setScannerInput('');
  
  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
          e.preventDefault();
          clearScannerInput();
      }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* --- MOBILE: Top Header User Info (Shown only on small screens, top of stack) --- */}
      <div className="md:hidden h-14 bg-gray-900 dark:bg-black text-white flex items-center justify-between px-4 shadow-lg shrink-0">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
                {currentUser.name.charAt(0)}
            </div>
            <span className="font-bold text-sm truncate max-w-[100px]">{currentUser.name}</span>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => setShowCalculator(true)} className="p-2 text-gray-400 hover:text-white"><Calculator size={18} /></button>
            <button onClick={onToggleTheme} className="p-2 text-gray-400 hover:text-white">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-white"><LogOut size={18} /></button>
         </div>
      </div>

      {/* --- LEFT SIDE (Top on Mobile): MAIN TRANSACTION AREA (65% Desktop, 100% Mobile) --- */}
      <div className="flex-1 flex flex-col h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative transition-colors order-2 md:order-1 overflow-hidden">
        
        {/* Desktop Header / Mobile Subheader */}
        <div className="h-14 md:h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-gray-800 transition-colors shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 dark:shadow-none shadow-lg">
                    <ShoppingCart size={20} />
                </div>
                <div>
                    <h1 className="font-bold text-gray-900 dark:text-white leading-tight text-sm md:text-base">Current Transaction</h1>
                    <p className="text-xs text-gray-400 font-medium hidden md:block">{new Date().toLocaleDateString()} • ID: #{Date.now().toString().slice(-6)}</p>
                </div>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={() => setShowSearchModal(true)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs md:text-sm font-medium transition-colors border border-gray-200 dark:border-gray-600"
                    title="Press F4"
                >
                    <Search size={16} />
                    <span className="hidden sm:inline">Search</span>
                </button>
                <button 
                    onClick={onClearCart}
                    disabled={cart.length === 0}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Void</span>
                </button>
            </div>
        </div>

        {/* Mobile Scanner Input (Visible directly below header on mobile) */}
        <div className="md:hidden p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
             <form onSubmit={handleBarcodeScan} className="relative">
                <input 
                    ref={scannerInputRef}
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onBlur={clearScannerInput}
                    onKeyDown={handleScannerKeyDown}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-base font-bold transition-all text-gray-900 dark:text-white"
                    placeholder="Scan Item..."
                />
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </form>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0"> 
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[50%] md:w-[45%]">Item</th>
                        <th className="py-3 px-2 md:px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-[20%]">Qty</th>
                        <th className="py-3 px-2 md:px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-[15%] hidden sm:table-cell">Price</th>
                        <th className="py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-[30%] md:w-[20%]">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {cart.length === 0 ? (
                        <tr>
                            <td colSpan={4}>
                                <div className="h-48 md:h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                                    <ShoppingCart size={48} strokeWidth={1} className="mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Cart is empty</p>
                                    <p className="text-sm">Scan a barcode</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        cart.map((item) => (
                            <tr key={item.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors">
                                <td className="py-3 px-4 md:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex-shrink-0 overflow-hidden hidden sm:block">
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono hidden sm:block">{item.barcode}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">@{item.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-2 md:px-4">
                                    <div className="flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg w-fit mx-auto shadow-sm scale-90 md:scale-100">
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, -1)}
                                            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-l-lg transition-colors"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleQuantityClick(item)}
                                            className="w-8 md:w-10 text-center font-bold text-gray-900 dark:text-white text-xs md:text-sm hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 h-full transition-colors"
                                            title="Click to edit quantity"
                                        >
                                            {item.quantity}
                                        </button>
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, 1)}
                                            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-r-lg transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </td>
                                <td className="py-3 px-2 md:px-4 text-right font-mono text-gray-600 dark:text-gray-300 text-sm hidden sm:table-cell">
                                    ₱{item.price.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 md:px-6 text-right">
                                    <div className="flex items-center justify-end gap-2 md:gap-4">
                                        <span className="font-bold text-gray-900 dark:text-white font-mono text-sm md:text-base">₱{(item.price * item.quantity).toFixed(2)}</span>
                                        <button 
                                            onClick={() => onRemoveFromCart(item.id)}
                                            className="text-gray-400 hover:text-red-500 p-1 md:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-100"
                                            title="Remove Item"
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

        {/* Quick Keys Section (Desktop Only - Bottom) */}
        <div className="hidden md:flex h-48 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex-col transition-colors shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Keyboard size={14} />
                Quick Access Keys
            </h3>
            <div className="flex-1 grid grid-cols-4 gap-3 overflow-y-auto no-scrollbar">
                {quickPicks.map(product => (
                    <button
                        key={product.id}
                        onClick={() => onAddToCart(product)}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 hover:border-indigo-500 hover:shadow-md hover:ring-2 hover:ring-indigo-500/20 dark:hover:ring-indigo-500/40 transition-all flex flex-col items-start justify-between group h-full"
                    >
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 line-clamp-2 text-left leading-tight">{product.name}</span>
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-300">₱{product.price.toFixed(2)}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* --- MOBILE STICKY FOOTER (Checkout) --- */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-top z-20">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">₱{total.toFixed(2)}</span>
            </div>
            <button 
                onClick={handlePreviewReceipt}
                disabled={cart.length === 0}
                className="w-full h-12 bg-gray-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                <Printer size={20} />
                Checkout (F9)
            </button>
        </div>
      </div>

      {/* --- RIGHT SIDE (Bottom on Mobile - Hidden/Repurposed): CONTROLS & TOTALS (35% Desktop) --- */}
      <div className="hidden md:flex w-[400px] flex-col bg-gray-50 dark:bg-gray-900 shadow-xl z-10 border-l border-gray-200 dark:border-gray-700 transition-colors order-1 md:order-2 shrink-0">
        
        {/* User Info (Desktop) */}
        <div className="h-16 bg-gray-900 dark:bg-black text-white flex items-center justify-between px-6 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {currentUser.name.charAt(0)}
                </div>
                <div className="leading-tight">
                    <p className="font-bold text-sm truncate max-w-[150px]">{currentUser.name}</p>
                    <p className="text-xs text-gray-400 uppercase">Cashier</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowCalculator(true)} className="text-gray-400 hover:text-white transition-colors" title="Calculator">
                   <Calculator size={18} />
                </button>
                <button onClick={onToggleTheme} className="text-gray-400 hover:text-white transition-colors" title="Toggle Theme">
                   {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors" title="Logout">
                    <LogOut size={18} />
                </button>
            </div>
        </div>

        <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
            
            {/* Scanner Section (Desktop) */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-gray-700 transition-colors">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex justify-between">
                    <span>Scan Barcode (F2)</span>
                    {isProcessing && <span className="text-indigo-600 dark:text-indigo-400 animate-pulse">Processing...</span>}
                </label>
                <form onSubmit={handleBarcodeScan} className="relative">
                    <input 
                        ref={scannerInputRef}
                        type="text"
                        value={scannerInput}
                        onChange={(e) => setScannerInput(e.target.value)}
                        onBlur={clearScannerInput}
                        onKeyDown={handleScannerKeyDown}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-mono text-lg font-bold transition-all text-gray-900 dark:text-white"
                        placeholder="Scan item..."
                        autoFocus
                        disabled={showReceiptPreview || showSearchModal || showCalculator || !!editingQuantityItem}
                    />
                    <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </form>
            </div>

            {/* Last Scanned Item Display */}
            <div className="bg-indigo-600 dark:bg-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden min-h-[140px] flex flex-col justify-center transition-colors">
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-3 transition-colors">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>VAT (12%)</span>
                    <span className="font-mono">₱{vatAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 dark:border-gray-600 pt-3 mt-1">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-900 dark:text-white font-bold">Total Amount</span>
                        <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 font-mono">₱{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Checkout Button */}
            <button 
                onClick={handlePreviewReceipt}
                disabled={cart.length === 0}
                className="w-full h-16 bg-gray-900 dark:bg-black text-white rounded-2xl text-xl font-bold shadow-xl shadow-gray-400 dark:shadow-none hover:bg-black dark:hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent dark:border-gray-700"
            >
                <Printer size={24} />
                <span>Print Receipt (F9)</span>
            </button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Quantity Edit Modal */}
      {editingQuantityItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-gray-800 w-[320px] rounded-3xl shadow-2xl p-6 transition-colors">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                         <Hash size={18} />
                         Edit Quantity
                     </h3>
                     <button onClick={() => setEditingQuantityItem(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                         <X size={18} />
                     </button>
                 </div>
                 
                 <div className="mb-4">
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">{editingQuantityItem.name}</p>
                     <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 flex items-center justify-between border-2 border-indigo-500">
                         <input 
                            ref={qtyInputRef}
                            type="text" 
                            value={newQuantityVal}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) setNewQuantityVal(val);
                            }}
                            className="bg-transparent border-none outline-none w-full text-3xl font-bold text-gray-900 dark:text-white text-center font-mono"
                            placeholder="0"
                         />
                     </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3 mb-6">
                     {[1,2,3,4,5,6,7,8,9].map(num => (
                         <button 
                            key={num} 
                            onClick={() => handleQuantityNumpad(num.toString())} 
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                         >
                            {num}
                         </button>
                     ))}
                     <button onClick={() => handleQuantityNumpad('clear')} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm uppercase hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center">CLR</button>
                     <button onClick={() => handleQuantityNumpad('0')} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">0</button>
                     <button onClick={() => handleQuantityNumpad('back')} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">⌫</button>
                 </div>

                 <button 
                    onClick={handleSaveQuantity}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                 >
                     Update Quantity
                 </button>
             </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-gray-800 w-[300px] rounded-3xl shadow-2xl p-6 transition-colors">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                         <Calculator size={18} />
                         Quick Math
                     </h3>
                     <button onClick={() => setShowCalculator(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                         <X size={18} />
                     </button>
                 </div>
                 
                 <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4 text-right">
                     <div className="text-xs text-gray-500 dark:text-gray-400 min-h-[1.2em]">{calcExpression || ''}</div>
                     <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono truncate">{calcDisplay}</div>
                 </div>

                 <div className="grid grid-cols-4 gap-2">
                     {['C', '(', ')', '/'].map(btn => (
                         <button key={btn} onClick={() => handleCalcInput(btn)} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {btn}
                         </button>
                     ))}
                     {['7', '8', '9', '*'].map(btn => (
                         <button key={btn} onClick={() => handleCalcInput(btn)} className={`p-3 rounded-lg font-bold transition-colors ${['*'].includes(btn) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm'}`}>
                            {btn}
                         </button>
                     ))}
                     {['4', '5', '6', '-'].map(btn => (
                         <button key={btn} onClick={() => handleCalcInput(btn)} className={`p-3 rounded-lg font-bold transition-colors ${['-'].includes(btn) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm'}`}>
                            {btn}
                         </button>
                     ))}
                     {['1', '2', '3', '+'].map(btn => (
                         <button key={btn} onClick={() => handleCalcInput(btn)} className={`p-3 rounded-lg font-bold transition-colors ${['+'].includes(btn) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm'}`}>
                            {btn}
                         </button>
                     ))}
                     <button onClick={() => handleCalcInput('0')} className="col-span-2 p-3 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm transition-colors">0</button>
                     <button onClick={() => handleCalcInput('.')} className="p-3 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm transition-colors">.</button>
                     <button onClick={() => handleCalcInput('=')} className="p-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">=</button>
                 </div>
             </div>
        </div>
      )}

      {/* Payment & Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] scale-100 transition-colors">
                
                {/* Left Side: Payment Input */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                     <div>
                         <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                             <Banknote size={24} className="text-indigo-600 dark:text-indigo-400" />
                             Payment Details
                         </h2>
                         
                         <div className="mb-8">
                             <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Amount</p>
                             <div className="text-5xl font-bold text-indigo-900 dark:text-white tracking-tight">₱{total.toFixed(2)}</div>
                         </div>

                         <div className="mb-8">
                             <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 block">Cash Tendered</label>
                             <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">₱</span>
                                 <input 
                                     ref={paymentInputRef}
                                     type="number" 
                                     value={amountTendered}
                                     onChange={(e) => setAmountTendered(e.target.value)}
                                     placeholder="0.00"
                                     className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-indigo-100 dark:border-gray-600 rounded-xl text-3xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                     autoFocus
                                 />
                             </div>
                             
                             {/* Quick Cash Buttons */}
                             <div className="grid grid-cols-3 gap-3 mt-4">
                                 {[20, 50, 100, 200, 500, 1000].map(amt => (
                                     <button 
                                        key={amt} 
                                        onClick={() => handleAddAmount(amt)}
                                        className="py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                                     >
                                         +₱{amt}
                                     </button>
                                 ))}
                                 <button onClick={handleExactAmount} className="col-span-3 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                                     Exact Amount
                                 </button>
                             </div>
                         </div>

                         <div className={`p-4 rounded-xl border-2 transition-colors ${isPaymentSufficient ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                             <div className="flex justify-between items-center">
                                 <span className={`text-sm font-bold uppercase tracking-wide ${isPaymentSufficient ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                     {isPaymentSufficient ? 'Change Due' : 'Insufficient Payment'}
                                 </span>
                                 <span className={`text-3xl font-bold ${isPaymentSufficient ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                     ₱{Math.abs(change).toFixed(2)}
                                 </span>
                             </div>
                         </div>
                     </div>

                     <div className="flex gap-4 mt-8">
                         <button 
                             onClick={() => setShowReceiptPreview(false)}
                             className="flex-1 py-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                         >
                             Cancel
                         </button>
                         <button 
                             onClick={handleConfirmPrint}
                             disabled={!isPaymentSufficient || isProcessing}
                             className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                         >
                             {isProcessing ? (
                                 <span className="animate-pulse">Processing...</span>
                             ) : (
                                 <>
                                     <Printer size={20} />
                                     Confirm & Print
                                 </>
                             )}
                         </button>
                     </div>
                </div>

                {/* Right Side: Receipt Preview */}
                <div className="hidden md:flex flex-col bg-gray-200 dark:bg-gray-900 w-[400px] border-l border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Thermal Preview</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
                        <div className={`bg-white ${previewPaperWidthClass} shadow-xl p-5 text-xs font-mono text-gray-900 transition-all duration-300`}>
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

                            <div className="space-y-1 mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>TOTAL</span>
                                    <span>PHP {total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold mt-2">
                                    <span>CASH</span>
                                    <span>{tenderedNum.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>CHANGE</span>
                                    <span>{Math.max(0, change).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-4 px-2">
                                    <span>VATable: {vatableSales.toFixed(2)}</span>
                                    <span>VAT: {vatAmount.toFixed(2)}</span>
                                </div>
                                <p className="italic">{printerSettings.footerMessage}</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* Manual Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Product Search</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Select items to add to cart</p>
                    </div>
                    <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors dark:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg text-gray-900 dark:text-white"
                            placeholder="Type name or barcode..."
                            value={manualSearchQuery}
                            onChange={(e) => setManualSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredSearchProducts.length === 0 ? (
                            <div className="text-center py-10">
                                <PackageX size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                <p className="text-gray-500 dark:text-gray-400">No products found matching "{manualSearchQuery}"</p>
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
                                    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{product.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 font-mono">{product.barcode}</span>
                                            <span className="text-xs text-gray-400">{product.category}</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">₱{product.price.toFixed(2)}</span>
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