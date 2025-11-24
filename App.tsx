import React, { useState, useEffect } from 'react';
import { PRODUCTS, INITIAL_USERS } from './constants';
import { Product, CartItem, SaleRecord, User, PrinterSettings, Notification } from './types';
import AdminView from './components/AdminView';
import LoginView from './components/LoginView';
import CashierView from './components/CashierView';
import { LogOut, LayoutDashboard, Package, FileText, Users, Settings, Store, Moon, Sun, Menu, X } from 'lucide-react';
import { printReceipt } from './utils/receiptPrinter';
import { playNotificationSound } from './utils/sound';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Config State
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(20);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

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

  const handleTransactionComplete = async (items: CartItem[], total: number, amountTendered: number, change: number) => {
    if (!currentUser) return;

    // Play Success Sound
    playNotificationSound();

    const newSale: SaleRecord = {
      id: `TR-${Date.now()}`,
      customerName: `Cust-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      items: [...items],
      total: total,
      amountTendered: amountTendered,
      change: change,
      cashierId: currentUser.id,
      cashierName: currentUser.name
    };

    setSalesHistory(prev => [newSale, ...prev]);

    // Add Sale Notification
    const saleNotif: Notification = {
      id: `notif-sale-${Date.now()}`,
      type: 'sale',
      message: `New Sale: ₱${total.toFixed(2)} by ${currentUser.name}`,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [saleNotif, ...prev]);

    // Update Stock & Check for Low Stock Alerts
    setProducts(prevProducts => prevProducts.map(prod => {
      const soldItem = items.find(item => item.id === prod.id);
      if (soldItem) {
        const oldStock = prod.stock;
        const newStock = Math.max(0, prod.stock - soldItem.quantity);

        // Trigger alert if stock drops below threshold
        if (oldStock > lowStockThreshold && newStock <= lowStockThreshold) {
            const alertNotif: Notification = {
                id: `notif-alert-${prod.id}-${Date.now()}`,
                type: 'alert',
                message: `Low Stock Alert: ${prod.name} is down to ${newStock} units.`,
                timestamp: Date.now(),
                read: false
            };
            setNotifications(prev => [alertNotif, ...prev]);
        }

        return { ...prod, stock: newStock };
      }
      return prod;
    }));

    // Trigger Print with current settings
    printReceipt(newSale, printerSettings);

    clearCart();
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({...n, read: true})));
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
    return <LoginView users={users} onLogin={handleLogin} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />;
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
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors">
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation for Admin */}
      <nav className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-indigo-900 dark:bg-gray-800 flex flex-col py-6 text-indigo-100 shadow-xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-lg shadow-indigo-900/50">
               <Store className="text-indigo-900" size={24} />
            </div>
            <div>
               <h1 className="font-bold text-xl tracking-tight text-white">SmartSale</h1>
               <p className="text-xs text-indigo-300">Admin Console</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-indigo-300 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col gap-2 pr-4">
           <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
           <NavItem tab="inventory" icon={Package} label="Inventory" />
           <NavItem tab="reports" icon={FileText} label="Sales & Reports" />
           <NavItem tab="staff" icon={Users} label="Staff Management" />
           <NavItem tab="settings" icon={Settings} label="Configuration" />
        </div>

        <div className="px-6 mt-auto space-y-4">
             {/* Theme Toggle in Sidebar */}
             <button 
               onClick={toggleTheme}
               className="flex items-center gap-2 text-indigo-300 hover:text-white hover:bg-indigo-800/50 dark:hover:bg-gray-700/50 px-4 py-2 rounded-lg w-full transition-colors text-sm"
             >
               {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
               <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
             </button>

             <div className="bg-indigo-800/50 dark:bg-gray-700/50 rounded-xl p-4">
                 <p className="text-xs text-indigo-300 mb-1">Logged in as</p>
                 <p className="font-bold text-white truncate">{currentUser.name}</p>
             </div>
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-indigo-300 hover:text-white hover:bg-indigo-800/50 dark:hover:bg-gray-700/50 px-4 py-2 rounded-lg w-full transition-colors"
             >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
          {/* Mobile Header for Admin */}
          <div className="md:hidden h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 flex-shrink-0 justify-between">
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 dark:text-gray-300">
                <Menu size={24} />
              </button>
              <span className="font-bold text-gray-900 dark:text-white capitalize">{activeTab}</span>
              <div className="w-6"></div> {/* Spacer for balance */}
          </div>

          <div className="w-full h-full overflow-hidden">
              <AdminView 
                  currentView={activeTab}
                  products={products}
                  salesHistory={salesHistory}
                  users={users}
                  printerSettings={printerSettings}
                  lowStockThreshold={lowStockThreshold}
                  notifications={notifications}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
                  onUpdateSettings={setPrinterSettings}
                  onUpdateLowStockThreshold={setLowStockThreshold}
                  onMarkAllNotificationsRead={markAllNotificationsRead}
                  onChangeView={setActiveTab}
                  isDarkMode={isDarkMode}
                  onToggleTheme={toggleTheme}
              />
          </div>
      </div>
    </div>
  );
};

export default App;