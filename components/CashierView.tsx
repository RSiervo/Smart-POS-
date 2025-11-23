import React, { useState, useRef, useEffect } from 'react';
import { CartItem, Product, User } from '../types';
import { ScanBarcode, Printer, Trash2, Plus, Minus, Search, LogOut, PackageX } from 'lucide-react';

interface CashierViewProps {
  currentUser: User;
  cart: CartItem[];
  products: Product[];
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
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus scanner on mount and after actions
  useEffect(() => {
    scannerInputRef.current?.focus();
    const interval = setInterval(() => {
        if (!showSearchModal) {
            scannerInputRef.current?.focus();
        }
    }, 2000); // Periodically ensure focus is on scanner if not searching
    return () => clearInterval(interval);
  }, [showSearchModal]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; // Simplified for now

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    // Strict exact match for barcode
    const product = products.find(p => p.barcode === scannerInput.trim());
    
    if (product) {
      onAddToCart(product);
      setScannerInput('');
    } else {
      // Play error sound or visual feedback
      alert(`Barcode "${scannerInput}" not found.`);
      setScannerInput('');
    }
  };

  const handleCheckoutProcess = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    await onCheckout(cart, total);
    setIsProcessing(false);
  };

  const filteredSearchProducts = products.filter(p => 
    p.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) || 
    p.barcode.includes(manualSearchQuery)
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-mono">
      {/* Left Side: Scanner & Info */}
      <div className="flex-1 flex flex-col p-6 gap-6">
        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SmartSale POS</h1>
                <p className="text-gray-500">Terminal: #01 • Cashier: <span className="font-semibold text-indigo-700">{currentUser.name}</span></p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                <LogOut size={18} />
                <span className="font-sans font-medium">Logout</span>
            </button>
        </div>

        {/* Big Scanner Input */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-100 flex flex-col gap-4">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Scan Product Barcode</label>
            <form onSubmit={handleBarcodeScan} className="relative">
                <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 w-8 h-8" />
                <input 
                    ref={scannerInputRef}
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    className="w-full pl-16 pr-4 py-4 text-3xl font-bold text-gray-900 placeholder-gray-300 border-2 border-indigo-100 rounded-xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    placeholder="Ready to Scan..."
                    autoFocus
                />
            </form>
            <div className="flex justify-between items-center text-sm">
                <p className="text-gray-400 italic">Scanner is active. Point reader at barcode.</p>
                <button 
                    onClick={() => setShowSearchModal(true)}
                    className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                >
                    <Search size={14} />
                    Manual Product Search
                </button>
            </div>
        </div>

        {/* Recent/Last Scanned Info (Visual Feedback) */}
        <div className="flex-1 bg-indigo-900 rounded-2xl p-8 text-white flex flex-col justify-center items-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
             {cart.length > 0 ? (
                 <>
                    <h3 className="text-indigo-200 uppercase tracking-widest text-sm mb-2">Last Item Scanned</h3>
                    <p className="text-4xl md:text-5xl font-bold text-center mb-4 leading-tight">{cart[cart.length - 1].name}</p>
                    <p className="text-3xl font-mono text-green-400">₱{cart[cart.length - 1].price.toFixed(2)}</p>
                 </>
             ) : (
                 <div className="text-center opacity-50">
                     <PackageX size={64} className="mx-auto mb-4" />
                     <p className="text-xl">No items scanned yet</p>
                 </div>
             )}
        </div>
      </div>

      {/* Right Side: The "Receipt" List */}
      <div className="w-[450px] bg-white shadow-2xl flex flex-col border-l border-gray-200">
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
            <button 
                onClick={onClearCart}
                disabled={cart.length === 0}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                title="Void Transaction"
            >
                <Trash2 size={20} />
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
            {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <Printer size={48} strokeWidth={1} className="mb-2"/>
                    <p>Transaction Empty</p>
                </div>
            )}
            {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono">@{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="flex items-center bg-gray-100 rounded">
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200"><Minus size={12}/></button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200"><Plus size={12}/></button>
                         </div>
                         <p className="font-bold text-gray-900 w-16 text-right font-mono">{(item.price * item.quantity).toFixed(2)}</p>
                         <button onClick={() => onRemoveFromCart(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 size={14} />
                         </button>
                    </div>
                </div>
            ))}
        </div>

        {/* Totals & Checkout */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
             <div className="flex justify-between items-center mb-2 text-gray-500">
                 <span>Items Count</span>
                 <span className="font-mono font-bold">{cart.reduce((a,c) => a + c.quantity, 0)}</span>
             </div>
             <div className="flex justify-between items-end mb-6">
                 <span className="text-xl font-bold text-gray-800">TOTAL</span>
                 <span className="text-4xl font-bold text-indigo-700 font-mono">₱{total.toFixed(2)}</span>
             </div>
             
             <button 
                onClick={handleCheckoutProcess}
                disabled={cart.length === 0 || isProcessing}
                className="w-full h-16 bg-indigo-700 text-white rounded-xl text-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-800 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isProcessing ? (
                    <span className="animate-pulse">Printing...</span>
                ) : (
                    <>
                        <Printer size={24} />
                        <span>PRINT RECEIPT</span>
                    </>
                )}
             </button>
        </div>
      </div>

      {/* Manual Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Manual Product Search</h3>
                    <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                        <PackageX size={24} />
                    </button>
                </div>
                <div className="p-4 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Type product name or code..."
                            value={manualSearchQuery}
                            onChange={(e) => setManualSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-2">
                    {filteredSearchProducts.length === 0 ? (
                        <p className="text-center text-gray-400 mt-10">No products found.</p>
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
                                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                            >
                                <img src={product.image} className="w-12 h-12 rounded object-cover bg-gray-200" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{product.name}</h4>
                                    <p className="text-sm text-gray-500">Code: {product.barcode}</p>
                                </div>
                                <span className="font-bold text-indigo-700">₱{product.price.toFixed(2)}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CashierView;