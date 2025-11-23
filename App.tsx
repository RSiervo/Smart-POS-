import React, { useState } from 'react';
import { PRODUCTS, INITIAL_USERS } from './constants';
import { Product, CartItem, SaleRecord, User, PrinterSettings } from './types';
import AdminView from './components/AdminView';
import LoginView from './components/LoginView';
import CashierView from './components/CashierView';
import { LogOut, LayoutDashboard, Package, FileText, Users, Settings, Store } from 'lucide-react';
import { printReceipt } from './utils/receiptPrinter';

const DEFAULT_SETTINGS: PrinterSettings = {
  paperWidth: '58mm',
  fontSize: 'medium',
  storeName: 'SmartSale Grocery',
  address: 'Manila, Philippines',
  tin: '000-000-000-000',
  footerMessage: 'Thank you for shopping! Salamat po!'
};

type AdminTab = 'dashboard' | 'inventory' | 'add' | 'reports' | 'staff' | 'settings';

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  // Admin Navigation State
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Data State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  
  // Config State
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCart([]);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCart([]);
  };

  // --- Cart & Transaction Logic ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleTransactionComplete = async (items: CartItem[], total: number) => {
    if (!currentUser) return;

    const newSale: SaleRecord = {
      id: `TR-${Date.now()}`,
      customerName: `Cust-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      items: [...items],
      total: total,
      cashierId: currentUser.id,
      cashierName: currentUser.name
    };

    setSalesHistory(prev => [newSale, ...prev]);

    // Update Stock
    setProducts(prevProducts => prevProducts.map(prod => {
      const soldItem = items.find(item => item.id === prod.id);
      if (soldItem) {
        return { ...prod, stock: Math.max(0, prod.stock - soldItem.quantity) };
      }
      return prod;
    }));

    // Trigger Print with current settings
    printReceipt(newSale, printerSettings);

    clearCart();
  };

  // --- Admin Logic ---
  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // --- Rendering ---

  if (!currentUser) {
    return <LoginView users={users} onLogin={handleLogin} />;
  }

  // Route: Cashier View (Strictly POS Mode)
  if (currentUser.role === 'cashier') {
      return (
          <CashierView 
            currentUser={currentUser}
            cart={cart}
            products={products}
            printerSettings={printerSettings}
            onLogout={handleLogout}
            onAddToCart={addToCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onClearCart={clearCart}
            onCheckout={handleTransactionComplete}
          />
      );
  }

  // Sidebar Item Component
  const NavItem = ({ tab, icon: Icon, label }: { tab: AdminTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-r-xl border-l-4 ${
        activeTab === tab
          ? 'bg-indigo-800 text-white border-indigo-400 shadow-md'
          : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white border-transparent'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  // Route: Admin View (Dashboard & Management)
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Navigation for Admin */}
      <nav className="w-64 bg-indigo-900 flex flex-col py-6 text-indigo-100 flex-shrink-0 shadow-xl z-20">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-lg shadow-indigo-900/50">
             <Store className="text-indigo-900" size={24} />
          </div>
          <div>
             <h1 className="font-bold text-xl tracking-tight text-white">SmartSale</h1>
             <p className="text-xs text-indigo-300">Admin Console</p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-2 pr-4">
           <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
           <NavItem tab="inventory" icon={Package} label="Inventory" />
           <NavItem tab="reports" icon={FileText} label="Sales & Reports" />
           <NavItem tab="staff" icon={Users} label="Staff Management" />
           <NavItem tab="settings" icon={Settings} label="Configuration" />
        </div>

        <div className="px-6 mt-auto">
             <div className="bg-indigo-800/50 rounded-xl p-4 mb-4">
                 <p className="text-xs text-indigo-300 mb-1">Logged in as</p>
                 <p className="font-bold text-white">{currentUser.name}</p>
             </div>
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-indigo-300 hover:text-white hover:bg-indigo-800/50 px-4 py-2 rounded-lg w-full transition-colors"
             >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
          <div className="w-full h-full">
              <AdminView 
                  currentView={activeTab}
                  products={products}
                  salesHistory={salesHistory}
                  users={users}
                  printerSettings={printerSettings}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
                  onUpdateSettings={setPrinterSettings}
                  onChangeView={setActiveTab}
              />
          </div>
      </div>
    </div>
  );
};

export default App;
