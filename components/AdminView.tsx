import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, SaleRecord, User, PrinterSettings, Notification } from '../types';
import { 
    Plus, Search, Edit2, Save, X, Tag, AlertTriangle, 
    FileText, Sparkles, Receipt, ChevronDown, ChevronUp, Users, 
    Trash2, Filter, TrendingUp, ShoppingBag, 
    CreditCard, Settings, Printer, BrainCircuit, Lightbulb, Upload, Image as ImageIcon,
    Bell, CheckCircle, Download, FileSpreadsheet
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { CATEGORIES } from '../constants';
import { generateInventoryReport, getRestockAdvice, generateBusinessStrategy } from '../services/geminiService';
import { printReceipt } from '../utils/receiptPrinter';

type AdminTab = 'dashboard' | 'inventory' | 'add' | 'reports' | 'staff' | 'settings';

interface AdminViewProps {
  currentView: AdminTab;
  products: Product[];
  salesHistory: SaleRecord[];
  users: User[];
  printerSettings: PrinterSettings;
  lowStockThreshold: number;
  notifications: Notification[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdateSettings: (settings: PrinterSettings) => void;
  onUpdateLowStockThreshold: (val: number) => void;
  onMarkAllNotificationsRead: () => void;
  onChangeView: (view: AdminTab) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

const AdminView: React.FC<AdminViewProps> = ({ 
    currentView, products, salesHistory = [], users, printerSettings, 
    lowStockThreshold, notifications,
    onAddProduct, onUpdateProduct, onAddUser, onDeleteUser, onUpdateSettings, 
    onUpdateLowStockThreshold, onMarkAllNotificationsRead, onChangeView, isDarkMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inventory Filter State
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [restockAdvice, setRestockAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  
  // Dashboard Date Filter
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  // AI Report State (Dashboard & Reports)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [strategyContent, setStrategyContent] = useState<string | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  // Notifications Popover State
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Add Product Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: CATEGORIES[0],
    barcode: '',
    stock: 0,
    image: '' // Initialize empty to trigger placeholder in UI
  });

  // Add User Form State
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    role: 'cashier'
  });

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{price: string, stock: string}>({price: '', stock: ''});

  // Accordion state for sales history
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  
  // Sales History Filter State
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('all');

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

  // --- Calculations for Dashboard ---

  const filteredStatsSales = useMemo(() => {
    const now = new Date();
    return salesHistory.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        if (timeFilter === 'all') return true;
        if (timeFilter === 'today') {
            return saleDate.getDate() === now.getDate() && 
                   saleDate.getMonth() === now.getMonth() && 
                   saleDate.getFullYear() === now.getFullYear();
        }
        if (timeFilter === 'week') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return saleDate >= oneWeekAgo;
        }
        if (timeFilter === 'month') {
            return saleDate.getMonth() === now.getMonth() && 
                   saleDate.getFullYear() === now.getFullYear();
        }
        if (timeFilter === 'year') {
            return saleDate.getFullYear() === now.getFullYear();
        }
        return true;
    });
  }, [salesHistory, timeFilter]);

  const stats = useMemo(() => {
      const totalSales = filteredStatsSales.reduce((acc, curr) => acc + curr.total, 0);
      const totalOrders = filteredStatsSales.length;
      const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
      const lowStockCount = products.filter(p => p.stock <= lowStockThreshold).length;

      return { totalSales, totalOrders, averageOrder, lowStockCount };
  }, [filteredStatsSales, products, lowStockThreshold]);

  // Chart Data Preparation
  const categoryData = useMemo(() => {
    const data: {[key: string]: number} = {};
    filteredStatsSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!data[item.category]) data[item.category] = 0;
            data[item.category] += (item.price * item.quantity);
        });
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredStatsSales]);

  const timelineData = useMemo(() => {
      const data: {[key: string]: number} = {};
      
      filteredStatsSales.forEach(sale => {
          const date = new Date(sale.timestamp);
          let key = '';
          if (timeFilter === 'today') key = `${date.getHours()}:00`;
          else if (timeFilter === 'month') key = `${date.getDate()}`;
          else if (timeFilter === 'year') key = `${date.getMonth() + 1}`;
          else key = new Date(sale.timestamp).toLocaleDateString();

          if (!data[key]) data[key] = 0;
          data[key] += sale.total;
      });

      return Object.keys(data).map(k => ({ name: k, sales: data[k] }));
  }, [filteredStatsSales, timeFilter]);


  // --- Actions ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewProduct(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const product: Product = {
      id: `p${Date.now()}`,
      name: newProduct.name!,
      price: Number(newProduct.price),
      category: newProduct.category || 'General',
      barcode: newProduct.barcode || String(Math.floor(Math.random() * 1000000)),
      stock: Number(newProduct.stock) || 0,
      // Use uploaded image or fallback to a placeholder if none selected
      image: newProduct.image || 'https://picsum.photos/200/200',
      color: 'blue'
    };

    onAddProduct(product);
    setNewProduct({
      name: '',
      price: 0,
      category: CATEGORIES[0],
      barcode: '',
      stock: 0,
      image: ''
    });
    alert("Product added successfully!");
    onChangeView('inventory');
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) return;

    const user: User = {
        id: `u-${Date.now()}`,
        username: newUser.username!,
        password: newUser.password!,
        name: newUser.name!,
        role: newUser.role || 'cashier'
    };
    onAddUser(user);
    setNewUser({ name: '', username: '', password: '', role: 'cashier' });
    alert("User account created successfully.");
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditValues({
      price: product.price.toString(),
      stock: product.stock.toString()
    });
  };

  const saveEdit = (id: string) => {
    onUpdateProduct(id, { 
      price: parseFloat(editValues.price),
      stock: parseInt(editValues.stock)
    });
    setEditingId(null);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const report = await generateInventoryReport(products, salesHistory);
    setAiReport(report);
    setIsGeneratingReport(false);
  };
  
  const handleGetRestockAdvice = async () => {
      const lowStockItems = products.filter(p => p.stock <= lowStockThreshold);
      if (lowStockItems.length === 0) {
          alert("No low stock items to analyze!");
          return;
      }
      setIsLoadingAdvice(true);
      // Pass sales history to get smarter advice based on velocity
      const advice = await getRestockAdvice(lowStockItems, salesHistory);
      setRestockAdvice(advice);
      setIsLoadingAdvice(false);
  };

  const handleGenerateStrategy = async () => {
      setShowStrategyModal(true);
      if (!strategyContent) {
          setIsGeneratingStrategy(true);
          try {
              const topProducts = categoryData.sort((a,b) => b.value - a.value).slice(0, 3);
              
              // Create a timeout promise to reject after 8 seconds if API hangs
              const timeoutPromise = new Promise<string>((resolve) => 
                  setTimeout(() => resolve("Strategy generation timed out. Please try again or check your connection."), 8000)
              );
              
              const strategyPromise = generateBusinessStrategy(stats, topProducts);
              
              // Race the API call against the timeout
              const strategy = await Promise.race([strategyPromise, timeoutPromise]);
              setStrategyContent(strategy);
          } catch (error) {
              setStrategyContent("Error: Unable to generate strategy at this time.");
          } finally {
              setIsGeneratingStrategy(false);
          }
      }
  };
  
  const handleTestPrint = () => {
      const testItems = products.slice(0, 2).map(p => ({...p, quantity: 1}));
      const testTotal = testItems.reduce((s, p) => s + p.price, 0);

      const mockSale: SaleRecord = {
          id: 'TEST-001',
          customerName: 'Test Customer',
          timestamp: Date.now(),
          items: testItems,
          total: testTotal,
          // Added amountTendered and change to match SaleRecord interface
          amountTendered: testTotal,
          change: 0,
          cashierId: 'admin',
          cashierName: 'Admin'
      };
      printReceipt(mockSale, printerSettings);
  };

  // Enhanced Search Logic for Inventory
  const filteredProducts = useMemo(() => {
    let result = products;
    
    // 1. Filter by Low Stock if enabled
    if (showLowStockOnly) {
        result = result.filter(p => p.stock <= lowStockThreshold);
    }

    // 2. Filter by Search Term
    const term = searchTerm.trim().toLowerCase();
    if (!term) return result;

    return result
      .map(product => {
        let score = 0;
        if (product.barcode === term) score = 1000;
        else if (product.barcode.toLowerCase().startsWith(term)) score = 500;
        else if (product.name.toLowerCase() === term) score = 200;
        else if (product.name.toLowerCase().includes(term)) score = 100;
        else {
           let searchIdx = 0;
           const name = product.name.toLowerCase();
           for(let i=0; i<name.length && searchIdx < term.length; i++) {
               if(name[i] === term[searchIdx]) searchIdx++;
           }
           if(searchIdx === term.length) score = 50;
        }
        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);
  }, [products, searchTerm, showLowStockOnly, lowStockThreshold]);

  // Filtered Sales History Logic (For the List view, distinct from dashboard filters)
  const filteredSalesHistory = useMemo(() => {
    if (selectedCashierFilter === 'all') return salesHistory;
    return salesHistory.filter(sale => sale.cashierId === selectedCashierFilter);
  }, [salesHistory, selectedCashierFilter]);

  const totalHistorySales = filteredSalesHistory.reduce((sum, sale) => sum + sale.total, 0);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // --- Export Functions ---

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Time', 'Cashier', 'Customer', 'Items Summary', 'Total Amount'];
    const rows = filteredSalesHistory.map(sale => {
        const date = new Date(sale.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        const itemSummary = sale.items.map(i => `${i.name} (${i.quantity})`).join('; ');
        
        // Escape commas for CSV
        return [
            sale.id,
            dateStr,
            timeStr,
            sale.cashierName,
            sale.customerName,
            `"${itemSummary}"`, // Quote items to handle commas
            sale.total.toFixed(2)
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(',') + "\n" 
        + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `sales_report_${selectedCashierFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const tableRows = filteredSalesHistory.map(sale => `
        <tr>
            <td>${new Date(sale.timestamp).toLocaleString()}</td>
            <td>${sale.id}</td>
            <td>${sale.cashierName}</td>
            <td>${sale.items.length}</td>
            <td style="text-align:right">₱${sale.total.toFixed(2)}</td>
        </tr>
    `).join('');

    const html = `
        <html>
            <head>
                <title>Sales Report</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { margin-bottom: 20px; font-weight: bold; }
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${printerSettings.storeName} - Sales Report</h2>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                    <p>Filter: ${selectedCashierFilter === 'all' ? 'All Cashiers' : 'Cashier ID: ' + selectedCashierFilter}</p>
                </div>
                <div class="summary">
                    Total Transactions: ${filteredSalesHistory.length} <br/>
                    Total Revenue: ₱${totalHistorySales.toFixed(2)}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Transaction ID</th>
                            <th>Cashier</th>
                            <th>Items</th>
                            <th style="text-align:right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Helper component to render report with separated header
  const ReportDisplay = ({ text }: { text: string }) => {
      const lines = text.split('\n');
      // If first line is all caps or looks like a title, separate it
      const hasHeader = lines.length > 0 && lines[0].toUpperCase() === lines[0] && lines[0].length > 5;
      const header = hasHeader ? lines[0] : null;
      const body = hasHeader ? lines.slice(1).join('\n') : text;

      return (
          <div className="flex flex-col gap-2">
              {header && (
                  <h4 className="font-bold text-lg text-indigo-900 dark:text-indigo-200 border-b border-indigo-200 dark:border-indigo-700 pb-2">
                      {header}
                  </h4>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                  {body.trim()}
              </div>
          </div>
      )
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 transition-colors relative">
      
      {/* --- DASHBOARD TAB --- */}
      {currentView === 'dashboard' && (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Welcome & Controls Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm md:text-base">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto relative">
                     {/* Notification Bell */}
                     <div className="relative" ref={notificationRef}>
                         <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                         >
                             <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                             {unreadNotifications > 0 && (
                                 <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                             )}
                         </button>
                         {showNotifications && (
                             <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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
                                                     <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'alert' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
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

                     <div className="flex items-center bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                        {(['today', 'week', 'month', 'year'] as TimeFilter[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setTimeFilter(f)}
                                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                    timeFilter === f 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                     </div>

                     <button 
                        onClick={handleGenerateStrategy}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 dark:shadow-none hover:shadow-xl hover:scale-105 transition-all text-sm whitespace-nowrap"
                     >
                        <Sparkles size={18} />
                        AI Sales Strategy
                     </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-gray-900 dark:text-white">
                        <CreditCard size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                            <CreditCard size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Revenue</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">₱{stats.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                        <p className="text-xs text-green-500 font-medium mt-1 flex items-center gap-1">
                            <TrendingUp size={12} />
                            +12% vs last period
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-gray-900 dark:text-white">
                        <ShoppingBag size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
                            <ShoppingBag size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Transactions</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Total orders processed</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-gray-900 dark:text-white">
                        <Tag size={80} />
                    </div>
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center">
                            <Tag size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Avg. Order</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">₱{stats.averageOrder.toFixed(0)}</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Per customer spend</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-l-4 border-amber-500 border-y border-r border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-gray-900 dark:text-white">
                        <AlertTriangle size={80} />
                    </div>
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Needs Attention</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.lowStockCount}</h3>
                        <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-1">Low Stock Items (&lt;{lowStockThreshold})</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] md:h-[450px]">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sales Trend Analysis</h3>
                         <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-300 uppercase">{timeFilter}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={timelineData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#f3f4f6"} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#9ca3af' : '#9ca3af', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#9ca3af' : '#9ca3af', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}}
                                contentStyle={{ 
                                    backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    color: isDarkMode ? '#fff' : '#000'
                                }}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] md:h-[450px]">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Categories</h3>
                    <ResponsiveContainer width="100%" height="75%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px', color: isDarkMode ? '#fff' : '#000' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 mt-4">
                        {categoryData.slice(0, 3).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></span>
                                    <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">₱{entry.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- INVENTORY TAB --- */}
      {currentView === 'inventory' && (
        <div className="p-4 md:p-8 space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
                <button 
                    onClick={() => onChangeView('add')}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Add Product</span>
                </button>
             </div>

             {/* AI Restock Advice Block */}
             {restockAdvice && (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 md:p-6 relative animate-in slide-in-from-top-2">
                    <button onClick={() => setRestockAdvice(null)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-100">
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg mt-1 shadow-lg shadow-indigo-200 dark:shadow-none">
                            <BrainCircuit size={20} />
                        </div>
                        <div className="flex-1">
                            <ReportDisplay text={restockAdvice} />
                        </div>
                    </div>
                </div>
             )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="relative flex-1 w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name or barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto justify-end">
                        <button
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                showLowStockOnly 
                                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400' 
                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <AlertTriangle size={16} />
                            {showLowStockOnly ? 'Show All' : 'Low Stock Only'}
                        </button>
                        
                        {/* AI Action for Restock */}
                        {showLowStockOnly && (
                            <button
                                onClick={handleGetRestockAdvice}
                                disabled={isLoadingAdvice || filteredProducts.length === 0}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoadingAdvice ? (
                                    <span className="animate-pulse">Thinking...</span>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Analyze Stock
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Category</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Barcode</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => {
                                    const isLowStock = product.stock <= lowStockThreshold;
                                    return (
                                        <tr 
                                            key={product.id} 
                                            className={`transition-colors ${isLowStock ? 'bg-red-50/50 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {product.name}
                                                <div className="sm:hidden text-xs text-gray-400 mt-1">{product.category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                                                <span className="px-2 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs shadow-sm">{product.category}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400 hidden sm:table-cell">{product.barcode}</td>
                                            <td className="px-6 py-4">
                                                {editingId === product.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400">₱</span>
                                                        <input 
                                                            type="number" 
                                                            value={editValues.price}
                                                            onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                                                            className="w-16 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-indigo-900 dark:text-indigo-300 font-bold">₱{product.price.toFixed(2)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === product.id ? (
                                                    <input 
                                                        type="number" 
                                                        value={editValues.stock}
                                                        onChange={(e) => setEditValues({...editValues, stock: e.target.value})}
                                                        className="w-16 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={isLowStock ? "text-red-700 dark:text-red-400 font-bold" : "text-gray-700 dark:text-gray-300"}>
                                                            {product.stock}
                                                        </span>
                                                        {isLowStock && (
                                                            <div className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-300 bg-white dark:bg-red-900/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 shadow-sm">
                                                                <AlertTriangle size={10} />
                                                                <span className="hidden lg:inline">Low</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === product.id ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveEdit(product.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={16} /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEditing(product)} className="flex items-center gap-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                        <Edit2 size={16} />
                                                        <span className="text-xs hidden lg:inline">Edit</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {showLowStockOnly 
                                            ? "Great job! No low stock items found." 
                                            : `No products found matching "${searchTerm}"`
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- ADD PRODUCT TAB --- */}
      {currentView === 'add' && (
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                 <button onClick={() => onChangeView('inventory')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                     <X size={24} />
                 </button>
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Product</h2>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
                <form onSubmit={handleAddSubmit} className="space-y-6">
                    {/* Image Upload Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Image</label>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden relative group">
                                {newProduct.image ? (
                                    <>
                                        <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                                            <button 
                                                type="button"
                                                onClick={() => setNewProduct({...newProduct, image: ''})} 
                                                className="text-white hover:text-red-400"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <ImageIcon className="text-gray-400" size={32} />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="flex flex-col items-start gap-1 cursor-pointer">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                        <Upload size={16} />
                                        Upload Image
                                    </span>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden" 
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 5MB. 1:1 Aspect ratio recommended.</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                            <input 
                                required
                                type="text" 
                                value={newProduct.name}
                                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="e.g. Corned Beef"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Barcode</label>
                            <div className="relative">
                                <input 
                                    required
                                    type="text" 
                                    value={newProduct.barcode}
                                    onChange={e => setNewProduct({...newProduct, barcode: e.target.value})}
                                    className="w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Scan or type..."
                                />
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            <select 
                                value={newProduct.category}
                                onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {CATEGORIES.filter(c => c !== 'All').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price (PHP)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                    <input 
                                        required
                                        type="number" 
                                        step="0.01"
                                        value={newProduct.price || ''}
                                        onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                                        className="w-full px-4 py-2 pl-8 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Stock</label>
                                <input 
                                    required
                                    type="number" 
                                    step="1"
                                    value={newProduct.stock || ''}
                                    onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                         <button 
                            type="button"
                            onClick={() => onChangeView('inventory')}
                            className="px-6 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-100 dark:shadow-none"
                        >
                            Add Product
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- STAFF TAB --- */}
      {currentView === 'staff' && (
        <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff List */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="text-indigo-600 dark:text-indigo-400" />
                        Staff Accounts
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-900 dark:text-gray-300">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 font-medium">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.username !== 'admin' && (
                                            <button 
                                                onClick={() => onDeleteUser(user.id)}
                                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Staff Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-fit transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Account</h3>
                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newUser.name}
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input 
                            required
                            type="password" 
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select 
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                        >
                            <option value="cashier">Cashier</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                        Create Account
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {currentView === 'settings' && (
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                 <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="text-indigo-600 dark:text-indigo-400" />
                        System Configuration
                    </h3>
                 </div>
                 
                 <div className="p-6 space-y-8">
                     
                     {/* Inventory Settings */}
                     <div className="space-y-4">
                         <h4 className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">Inventory Settings</h4>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low Stock Threshold</label>
                             <div className="flex gap-2 items-center">
                                 <input 
                                     type="number"
                                     min="1"
                                     className="w-32 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                     value={lowStockThreshold}
                                     onChange={(e) => onUpdateLowStockThreshold(parseInt(e.target.value) || 0)}
                                 />
                                 <span className="text-sm text-gray-500 dark:text-gray-400">units</span>
                             </div>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Items below this quantity will be flagged in reports and dashboard.</p>
                         </div>
                     </div>

                     {/* Store Details Section */}
                     <div className="space-y-4">
                         <h4 className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">Store Information (Receipt Header)</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Name</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                     value={printerSettings.storeName}
                                     onChange={e => onUpdateSettings({...printerSettings, storeName: e.target.value})}
                                 />
                             </div>
                             <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                     value={printerSettings.address}
                                     onChange={e => onUpdateSettings({...printerSettings, address: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TIN / Tax ID</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                     value={printerSettings.tin}
                                     onChange={e => onUpdateSettings({...printerSettings, tin: e.target.value})}
                                 />
                             </div>
                              <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Footer Message</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                     value={printerSettings.footerMessage}
                                     onChange={e => onUpdateSettings({...printerSettings, footerMessage: e.target.value})}
                                 />
                             </div>
                         </div>
                     </div>

                     {/* Printer Config Section */}
                     <div className="space-y-4">
                         <h4 className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">Printer Hardware</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paper Width</label>
                                 <div className="flex gap-2">
                                     <button 
                                        onClick={() => onUpdateSettings({...printerSettings, paperWidth: '58mm'})}
                                        className={`flex-1 py-2 border rounded-lg text-sm font-medium ${printerSettings.paperWidth === '58mm' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                     >
                                         58mm (Standard)
                                     </button>
                                     <button 
                                        onClick={() => onUpdateSettings({...printerSettings, paperWidth: '80mm'})}
                                        className={`flex-1 py-2 border rounded-lg text-sm font-medium ${printerSettings.paperWidth === '80mm' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                     >
                                         80mm (Wide)
                                     </button>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Font Size</label>
                                 <select 
                                     value={printerSettings.fontSize}
                                     onChange={e => onUpdateSettings({...printerSettings, fontSize: e.target.value as any})}
                                     className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                 >
                                     <option value="small">Small (Compact)</option>
                                     <option value="medium">Medium (Standard)</option>
                                     <option value="large">Large (Readable)</option>
                                 </select>
                             </div>
                         </div>
                     </div>

                     <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                         <button 
                            onClick={handleTestPrint}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors w-full md:w-auto justify-center"
                         >
                             <Printer size={18} />
                             Test Print Receipt
                         </button>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {/* --- REPORTS TAB --- */}
      {currentView === 'reports' && (
        <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales History Column */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[500px] md:h-[600px] transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Receipt className="text-indigo-600 dark:text-indigo-400" />
                            Sales History
                        </h3>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                value={selectedCashierFilter}
                                onChange={(e) => setSelectedCashierFilter(e.target.value)}
                                className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-white dark:hover:bg-gray-600 transition-colors"
                            >
                                <option value="all">All Cashiers</option>
                                {users.filter(u => u.role === 'cashier' || u.role === 'admin').map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-2">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-lg text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-200 dark:border-green-800"
                                title="Download as Excel/CSV"
                            >
                                <FileSpreadsheet size={14} />
                                Export CSV
                            </button>
                            <button 
                                onClick={handlePrintReport}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                                title="Print or Save as PDF"
                            >
                                <Printer size={14} />
                                Print Report (PDF)
                            </button>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sales</p>
                             <p className="text-lg font-bold text-indigo-900 dark:text-indigo-300">₱{totalHistorySales.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredSalesHistory.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                             <Receipt size={32} strokeWidth={1.5} className="mb-2 opacity-50"/>
                             <p>No transactions found.</p>
                        </div>
                    ) : (
                        filteredSalesHistory.map((sale) => (
                            <div key={sale.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                <div 
                                    className="bg-gray-50 dark:bg-gray-700/50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{sale.customerName}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>{new Date(sale.timestamp).toLocaleString()}</span>
                                            <span>•</span>
                                            <span className="text-indigo-600 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">By: {sale.cashierName || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-indigo-900 dark:text-indigo-300">₱{sale.total.toFixed(2)}</span>
                                        {expandedSaleId === sale.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                    </div>
                                </div>
                                {expandedSaleId === sale.id && (
                                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-xs text-gray-400 uppercase">
                                                    <th className="pb-2">Item</th>
                                                    <th className="pb-2 text-right">Qty</th>
                                                    <th className="pb-2 text-right">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-700 dark:text-gray-300">
                                                {sale.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                        <td className="py-2">{item.name}</td>
                                                        <td className="py-2 text-right font-medium">{item.quantity}</td>
                                                        <td className="py-2 text-right text-gray-500 dark:text-gray-400">₱{item.price.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* AI Smart Inventory Column */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[500px] md:h-[600px] transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="text-indigo-600 dark:text-indigo-400" />
                            Smart Inventory AI
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Automated analysis & reports</p>
                    </div>
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingReport ? (
                            <span className="animate-pulse">Analyzing...</span>
                        ) : (
                            <>
                                <FileText size={16} />
                                <span className="hidden sm:inline">Generate Report</span>
                                <span className="sm:hidden">Report</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-900/30">
                    {aiReport ? (
                        <div className="prose prose-sm max-w-none">
                            <ReportDisplay text={aiReport} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <Sparkles size={24} className="text-gray-300 dark:text-gray-500" />
                            </div>
                            <p className="max-w-xs text-center text-sm">
                                Click "Generate Report" to let AI analyze your stock levels and sales history to provide actionable insights.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- AI STRATEGY MODAL --- */}
      {showStrategyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                 <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 flex justify-between items-center text-white rounded-t-2xl">
                     <div className="flex items-center gap-3">
                         <div className="bg-white/20 p-2 rounded-lg">
                             <Lightbulb size={24} />
                         </div>
                         <div>
                             <h3 className="text-xl font-bold">AI Business Advisor</h3>
                             <p className="text-xs text-indigo-100 opacity-90">Strategic Growth Insights</p>
                         </div>
                     </div>
                     <button onClick={() => setShowStrategyModal(false)} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
                         <X size={24} />
                     </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-8">
                     {isGeneratingStrategy ? (
                         <div className="flex flex-col items-center justify-center h-64 space-y-4">
                             <div className="relative">
                                 <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                 <div className="absolute inset-0 flex items-center justify-center">
                                     <Sparkles size={20} className="text-indigo-600" />
                                 </div>
                             </div>
                             <div className="text-center">
                                 <h4 className="font-bold text-gray-900 dark:text-white text-lg">Analyzing Sales Data...</h4>
                                 <p className="text-gray-500 dark:text-gray-400 text-sm">Formulating growth strategies for your store.</p>
                             </div>
                         </div>
                     ) : (
                         <div className="prose prose-indigo dark:prose-invert max-w-none">
                             {strategyContent ? (
                                 <ReportDisplay text={strategyContent} />
                             ) : (
                                 <p className="text-center text-red-500">Failed to load strategy.</p>
                             )}
                         </div>
                     )}
                 </div>
                 
                 <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                     <button 
                        onClick={() => setShowStrategyModal(false)}
                        className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                     >
                         Close
                     </button>
                 </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminView;