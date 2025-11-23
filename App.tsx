import React, { useState } from 'react';
import { PRODUCTS, INITIAL_USERS } from './constants';
import { Product, CartItem, SaleRecord, User } from './types';
import AdminView from './components/AdminView';
import LoginView from './components/LoginView';
import CashierView from './components/CashierView';
import { LogOut } from 'lucide-react';
import { printReceipt } from './utils/receiptPrinter';

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  // Data State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCart([]);
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

    // Trigger Print
    printReceipt(newSale);

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
            onLogout={handleLogout}
            onAddToCart={addToCart}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onClearCart={clearCart}
            onCheckout={handleTransactionComplete}
          />
      );
  }

  // Route: Admin View (Dashboard & Management)
  // Admins see the management dashboard by default
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar Navigation for Admin */}
      <nav className="w-20 bg-indigo-900 flex flex-col items-center py-8 text-indigo-100 flex-shrink-0 z-20">
        <div className="mb-10 p-2 bg-indigo-800 rounded-xl shadow-lg shadow-indigo-900/50">
          <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">A</div>
        </div>
        
        <div className="flex-1 flex flex-col gap-8 w-full">
           {/* Admin is always in 'admin' view mode now, leveraging tabs inside AdminView */}
           {/* We can add a button to switch to Cashier Mode if the admin wants to sell */}
        </div>

        <button 
            onClick={handleLogout}
            className="mt-auto p-3 rounded-xl hover:bg-indigo-800 text-indigo-300 transition-colors"
            title="Logout"
        >
          <LogOut size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
          <div className="w-full h-full">
              <AdminView 
                  products={products}
                  salesHistory={salesHistory}
                  users={users}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
              />
          </div>
      </div>
    </div>
  );
};

export default App;