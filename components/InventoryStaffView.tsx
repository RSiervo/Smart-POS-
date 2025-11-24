import React, { useState, useRef, useEffect } from 'react';
import { Product, User, DeliveryItem, Notification } from '../types';
import { 
    Search, LogOut, PackagePlus, ScanBarcode, Trash2, 
    Plus, Minus, CheckCircle, Truck, Sun, Moon, PenLine, X, Hash,
    Bell, Store, ArrowRight
} from 'lucide-react';

interface InventoryStaffViewProps {
  currentUser: User;
  products: Product[];
  notifications: Notification[];
  onMarkAllNotificationsRead: () => void;
  onSubmitDelivery: (items: DeliveryItem[], notes: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const InventoryStaffView: React.FC<InventoryStaffViewProps> = ({
  currentUser,
  products,
  notifications,
  onMarkAllNotificationsRead,
  onSubmitDelivery,
  onLogout,
  isDarkMode,
  onToggleTheme
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [draftItems, setDraftItems] = useState<DeliveryItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Manual Entry State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSelectedId, setManualSelectedId] = useState('');
  const [manualQty, setManualQty] = useState('');

  // Auto focus search
  useEffect(() => {
    if (!showManualModal) {
        const timeout = setTimeout(() => searchInputRef.current?.focus(), 100);
        return () => clearTimeout(timeout);
    }
  }, [showManualModal]);

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Auto-add if exact barcode match
    const exactMatch = products.find(p => p.barcode === term);
    if (exactMatch) {
      handleAddItem(exactMatch);
      setSearchTerm('');
    }
  };

  const handleAddItem = (product: Product, quantity: number = 1) => {
    setDraftItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: quantity }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setDraftItems(prev => prev.map(item => {
      if (item.productId === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setDraftItems(prev => prev.filter(i => i.productId !== id));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const product = products.find(p => p.id === manualSelectedId);
      const qty = parseInt(manualQty);

      if (product && qty > 0) {
          handleAddItem(product, qty);
          setShowManualModal(false);
          setManualSelectedId('');
          setManualQty('');
      }
  };

  const handleSubmit = () => {
      if (draftItems.length === 0) return;
      setIsSubmitting(true);
      // Simulate delay
      setTimeout(() => {
          onSubmitDelivery(draftItems, notes);
          setDraftItems([]);
          setNotes('');
          setIsSubmitting(false);
          alert("Delivery Report Submitted! Admin will review and confirm stock.");
      }, 1000);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors font-sans text-gray-900 dark:text-gray-100">
      
      {/* Header - Unified Look with Admin */}
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <Truck size={20} />
            </div>
            <div>
                <h1 className="font-bold text-gray-900 dark:text-white leading-tight">Delivery Hub</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">SmartSale Logistics</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors relative"
                >
                    <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                    {unreadNotifications > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
                    )}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-scale-in origin-top-right">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">Notifications</span>
                            <button onClick={onMarkAllNotificationsRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Mark all read</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm">No new notifications</div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className={`p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'alert' ? 'bg-red-500' : (n.type === 'delivery' ? 'bg-emerald-500' : 'bg-indigo-500')}`}></div>
                                            <div>
                                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                                                <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>

            <button onClick={onToggleTheme} className="p-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Staff</p>
                </div>
                <button onClick={onLogout} className="p-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors" title="Logout">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Left: Product Selection */}
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex gap-3 bg-white dark:bg-gray-800">
                  <div className="relative flex-1">
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Scan barcode or search product..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg font-medium transition-all"
                      />
                      <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                  </div>
                  <button 
                    onClick={() => setShowManualModal(true)}
                    className="flex flex-col items-center justify-center px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm"
                  >
                      <PenLine size={20} />
                      <span className="text-[10px] font-bold uppercase mt-1">Manual</span>
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                  {searchTerm && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredProducts.map(product => (
                              <button 
                                key={product.id}
                                onClick={() => handleAddItem(product)}
                                className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:shadow-md transition-all text-left group animate-scale-in"
                              >
                                  <img src={product.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-700" />
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{product.name}</h4>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">{product.category}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 font-mono">{product.barcode}</span>
                                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">Stock: {product.stock}</span>
                                      </div>
                                  </div>
                              </button>
                          ))}
                          {filteredProducts.length === 0 && (
                              <div className="col-span-full text-center py-10 text-gray-400">
                                  No products found.
                              </div>
                          )}
                      </div>
                  )}
                  {!searchTerm && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 animate-fade-in">
                          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <Search size={40} className="text-gray-400 dark:text-gray-600 opacity-50" />
                          </div>
                          <p className="font-medium">Scan an item to start adding to delivery.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Right: Draft Delivery Note */}
          <div className="w-full md:w-[420px] bg-white dark:bg-gray-800 flex flex-col shadow-xl z-10 border-l border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          Draft Receipt
                      </h2>
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg">{draftItems.length} Items</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Review items before submission</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                  {draftItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl m-4 bg-gray-50/50 dark:bg-gray-800/50">
                          <PackagePlus size={32} className="mb-2 opacity-50" />
                          <p className="text-sm">List is empty.</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {draftItems.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-700/30 shadow-sm hover:shadow-md transition-shadow animate-slide-in-right">
                                   <div className="flex-1 min-w-0">
                                       <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">{item.productName}</h4>
                                       <p className="text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 w-fit px-1.5 py-0.5 rounded mt-1">In: +{item.quantity}</p>
                                   </div>
                                   <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600 rounded-lg p-1">
                                       <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-500 rounded text-gray-500 dark:text-gray-300 transition-colors"><Minus size={14}/></button>
                                       <span className="w-8 text-center font-bold text-gray-900 dark:text-white text-sm">{item.quantity}</span>
                                       <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-500 rounded text-gray-500 dark:text-gray-300 transition-colors"><Plus size={14}/></button>
                                   </div>
                                   <button onClick={() => removeItem(item.productId)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                       <Trash2 size={16} />
                                   </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notes</label>
                      <div className="relative">
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-3 pl-10 rounded-xl border border-gray-200 dark:border-gray-600 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            rows={2}
                            placeholder="e.g. Receipt #1234..."
                        />
                        <PenLine size={14} className="absolute left-3 top-3 text-gray-400" />
                      </div>
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={draftItems.length === 0 || isSubmitting}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isSubmitting ? (
                          <span className="animate-pulse">Submitting...</span>
                      ) : (
                          <>
                              <span>Submit Delivery</span>
                              <ArrowRight size={20} />
                          </>
                      )}
                  </button>
              </div>
          </div>
      </div>

      {/* Manual Add Modal */}
      {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <PenLine size={20} className="text-indigo-600 dark:text-indigo-400" />
                          Manual Entry
                      </h3>
                      <button 
                          onClick={() => setShowManualModal(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <form onSubmit={handleManualSubmit}>
                      <div className="space-y-4 mb-6">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Product</label>
                              <select 
                                  value={manualSelectedId}
                                  onChange={(e) => setManualSelectedId(e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                  required
                              >
                                  <option value="" disabled>-- Choose a product --</option>
                                  {products.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                              <div className="relative">
                                  <input 
                                      type="number" 
                                      min="1"
                                      value={manualQty}
                                      onChange={(e) => setManualQty(e.target.value)}
                                      className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                      placeholder="0"
                                      required
                                  />
                                  <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-3">
                          <button 
                              type="button"
                              onClick={() => setShowManualModal(false)}
                              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              disabled={!manualSelectedId || !manualQty}
                              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                              Add to List
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default InventoryStaffView;