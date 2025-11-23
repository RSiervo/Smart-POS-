import React, { useState, useMemo } from 'react';
import { Product, SaleRecord, User, PrinterSettings } from '../types';
import { 
    Plus, Search, Edit2, Save, X, Tag, AlertTriangle, 
    FileText, Sparkles, Receipt, ChevronDown, ChevronUp, Users, 
    Trash2, Filter, TrendingUp, ShoppingBag, 
    CreditCard, Calendar, Settings, Printer, BrainCircuit, Lightbulb
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
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdateSettings: (settings: PrinterSettings) => void;
  onChangeView: (view: AdminTab) => void;
}

const LOW_STOCK_THRESHOLD = 20;
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

const AdminView: React.FC<AdminViewProps> = ({ 
    currentView, products, salesHistory = [], users, printerSettings,
    onAddProduct, onUpdateProduct, onAddUser, onDeleteUser, onUpdateSettings, onChangeView 
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

  // Add Product Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: CATEGORIES[0],
    barcode: '',
    stock: 0,
    image: 'https://picsum.photos/200/200'
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
      const lowStockCount = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length;

      return { totalSales, totalOrders, averageOrder, lowStockCount };
  }, [filteredStatsSales, products]);

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
      image: 'https://picsum.photos/200/200'
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
      const lowStockItems = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
      if (lowStockItems.length === 0) {
          alert("No low stock items to analyze!");
          return;
      }
      setIsLoadingAdvice(true);
      const advice = await getRestockAdvice(lowStockItems);
      setRestockAdvice(advice);
      setIsLoadingAdvice(false);
  };

  const handleGenerateStrategy = async () => {
      setShowStrategyModal(true);
      if (!strategyContent) {
          setIsGeneratingStrategy(true);
          const topProducts = categoryData.sort((a,b) => b.value - a.value).slice(0, 3);
          const strategy = await generateBusinessStrategy(stats, topProducts);
          setStrategyContent(strategy);
          setIsGeneratingStrategy(false);
      }
  };
  
  const handleTestPrint = () => {
      const mockSale: SaleRecord = {
          id: 'TEST-001',
          customerName: 'Test Customer',
          timestamp: Date.now(),
          items: products.slice(0, 2).map(p => ({...p, quantity: 1})),
          total: products.slice(0, 2).reduce((s, p) => s + p.price, 0),
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
        result = result.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
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
  }, [products, searchTerm, showLowStockOnly]);

  // Filtered Sales History Logic (For the List view, distinct from dashboard filters)
  const filteredSalesHistory = useMemo(() => {
    if (selectedCashierFilter === 'all') return salesHistory;
    return salesHistory.filter(sale => sale.cashierId === selectedCashierFilter);
  }, [salesHistory, selectedCashierFilter]);

  const totalHistorySales = filteredSalesHistory.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 relative">
      
      {/* --- DASHBOARD TAB --- */}
      {currentView === 'dashboard' && (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Welcome & Controls Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
                    <p className="text-gray-500 mt-1 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                     <div className="flex items-center bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                        {(['today', 'week', 'month', 'year'] as TimeFilter[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setTimeFilter(f)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    timeFilter === f 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                     </div>

                     <button 
                        onClick={handleGenerateStrategy}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 transition-all"
                     >
                        <Sparkles size={18} />
                        AI Sales Strategy
                     </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <CreditCard size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Revenue</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900">₱{stats.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                        <p className="text-xs text-green-500 font-medium mt-1 flex items-center gap-1">
                            <TrendingUp size={12} />
                            +12% vs last period
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShoppingBag size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                            <ShoppingBag size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Transactions</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900">{stats.totalOrders}</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Total orders processed</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Tag size={80} />
                    </div>
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                            <Tag size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Avg. Order</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900">₱{stats.averageOrder.toFixed(0)}</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Per customer spend</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500 border-y border-r border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-md transition-shadow">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle size={80} />
                    </div>
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Needs Attention</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900">{stats.lowStockCount}</h3>
                        <p className="text-xs text-amber-600 font-bold mt-1">Low Stock Items</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[450px]">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-gray-900">Sales Trend Analysis</h3>
                         <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-500 uppercase">{timeFilter}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={timelineData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: '#f3f4f6'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[450px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Categories</h3>
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
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 mt-4">
                        {categoryData.slice(0, 3).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></span>
                                    <span className="text-gray-600">{entry.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">₱{entry.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- INVENTORY TAB --- */}
      {currentView === 'inventory' && (
        <div className="p-8 space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
                <button 
                    onClick={() => onChangeView('add')}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    Add Product
                </button>
             </div>

             {/* AI Restock Advice Block (Visible when populated) */}
             {restockAdvice && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 relative animate-in slide-in-from-top-2">
                    <button onClick={() => setRestockAdvice(null)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-700">
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg mt-1 shadow-lg shadow-indigo-200">
                            <BrainCircuit size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-indigo-900 mb-2 text-lg">AI Restock Plan</h4>
                            <div className="prose prose-sm text-indigo-800 whitespace-pre-wrap bg-white/50 p-4 rounded-lg border border-indigo-100">
                                {restockAdvice}
                            </div>
                        </div>
                    </div>
                </div>
             )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative flex-1 w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name or barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                showLowStockOnly 
                                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Barcode</th>
                                <th className="px-6 py-4">Price (PHP)</th>
                                <th className="px-6 py-4">Stock Level</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => {
                                    const isLowStock = product.stock <= LOW_STOCK_THRESHOLD;
                                    return (
                                        <tr 
                                            key={product.id} 
                                            className={`transition-colors ${isLowStock ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {product.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                <span className="px-2 py-1 rounded-full bg-white border border-gray-200 text-xs shadow-sm">{product.category}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-500">{product.barcode}</td>
                                            <td className="px-6 py-4">
                                                {editingId === product.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400">₱</span>
                                                        <input 
                                                            type="number" 
                                                            value={editValues.price}
                                                            onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                                                            className="w-20 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-indigo-900 font-bold">₱{product.price.toFixed(2)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === product.id ? (
                                                    <input 
                                                        type="number" 
                                                        value={editValues.stock}
                                                        onChange={(e) => setEditValues({...editValues, stock: e.target.value})}
                                                        className="w-20 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={isLowStock ? "text-red-700 font-bold" : "text-gray-700"}>
                                                            {product.stock}
                                                        </span>
                                                        {isLowStock && (
                                                            <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-white px-2 py-0.5 rounded-full border border-red-200 shadow-sm">
                                                                <AlertTriangle size={10} />
                                                                <span>Low</span>
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
                                                    <button onClick={() => startEditing(product)} className="flex items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors">
                                                        <Edit2 size={16} />
                                                        <span className="text-xs">Edit</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
        <div className="p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                 <button onClick={() => onChangeView('inventory')} className="text-gray-400 hover:text-gray-600">
                     <X size={24} />
                 </button>
                 <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <form onSubmit={handleAddSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Product Name</label>
                            <input 
                                required
                                type="text" 
                                value={newProduct.name}
                                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Corned Beef"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Barcode</label>
                            <div className="relative">
                                <input 
                                    required
                                    type="text" 
                                    value={newProduct.barcode}
                                    onChange={e => setNewProduct({...newProduct, barcode: e.target.value})}
                                    className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    placeholder="Scan or type..."
                                />
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <select 
                                value={newProduct.category}
                                onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                {CATEGORIES.filter(c => c !== 'All').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Price (PHP)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                    <input 
                                        required
                                        type="number" 
                                        step="0.01"
                                        value={newProduct.price || ''}
                                        onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                                        className="w-full px-4 py-2 pl-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Initial Stock</label>
                                <input 
                                    required
                                    type="number" 
                                    step="1"
                                    value={newProduct.stock || ''}
                                    onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                         <button 
                            type="button"
                            onClick={() => onChangeView('inventory')}
                            className="px-6 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-100"
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
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff List */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-indigo-600" />
                        Staff Accounts
                    </h3>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Username</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 font-medium">{user.name}</td>
                                <td className="px-6 py-4 text-gray-500">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.username !== 'admin' && (
                                        <button 
                                            onClick={() => onDeleteUser(user.id)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
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

            {/* Add Staff Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Create Account</h3>
                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            value={newUser.name}
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input 
                            required
                            type="password" 
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select 
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
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
        <div className="p-8 max-w-3xl mx-auto">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="text-indigo-600" />
                        System Configuration
                    </h3>
                 </div>
                 
                 <div className="p-6 space-y-8">
                     {/* Store Details Section */}
                     <div className="space-y-4">
                         <h4 className="text-sm uppercase tracking-wider font-semibold text-gray-500 border-b border-gray-100 pb-2">Store Information (Receipt Header)</h4>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                     value={printerSettings.storeName}
                                     onChange={e => onUpdateSettings({...printerSettings, storeName: e.target.value})}
                                 />
                             </div>
                             <div className="col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                     value={printerSettings.address}
                                     onChange={e => onUpdateSettings({...printerSettings, address: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">TIN / Tax ID</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                     value={printerSettings.tin}
                                     onChange={e => onUpdateSettings({...printerSettings, tin: e.target.value})}
                                 />
                             </div>
                              <div className="col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Footer Message</label>
                                 <input 
                                     type="text" 
                                     className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                     value={printerSettings.footerMessage}
                                     onChange={e => onUpdateSettings({...printerSettings, footerMessage: e.target.value})}
                                 />
                             </div>
                         </div>
                     </div>

                     {/* Printer Config Section */}
                     <div className="space-y-4">
                         <h4 className="text-sm uppercase tracking-wider font-semibold text-gray-500 border-b border-gray-100 pb-2">Printer Hardware</h4>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Paper Width</label>
                                 <div className="flex gap-2">
                                     <button 
                                        onClick={() => onUpdateSettings({...printerSettings, paperWidth: '58mm'})}
                                        className={`flex-1 py-2 border rounded-lg text-sm font-medium ${printerSettings.paperWidth === '58mm' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                     >
                                         58mm (Standard)
                                     </button>
                                     <button 
                                        onClick={() => onUpdateSettings({...printerSettings, paperWidth: '80mm'})}
                                        className={`flex-1 py-2 border rounded-lg text-sm font-medium ${printerSettings.paperWidth === '80mm' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                     >
                                         80mm (Wide)
                                     </button>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                                 <select 
                                     value={printerSettings.fontSize}
                                     onChange={e => onUpdateSettings({...printerSettings, fontSize: e.target.value as any})}
                                     className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white"
                                 >
                                     <option value="small">Small (Compact)</option>
                                     <option value="medium">Medium (Standard)</option>
                                     <option value="large">Large (Readable)</option>
                                 </select>
                             </div>
                         </div>
                     </div>

                     <div className="pt-4 border-t border-gray-100 flex justify-end">
                         <button 
                            onClick={handleTestPrint}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
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
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales History Column */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Receipt className="text-indigo-600" />
                            Sales History
                        </h3>
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                value={selectedCashierFilter}
                                onChange={(e) => setSelectedCashierFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 text-gray-700 cursor-pointer hover:bg-white transition-colors"
                            >
                                <option value="all">All Cashiers</option>
                                {users.filter(u => u.role === 'cashier' || u.role === 'admin').map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-between items-end">
                        <p className="text-sm text-gray-500">Transaction records</p>
                        <div className="text-right">
                             <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sales</p>
                             <p className="text-lg font-bold text-indigo-900">₱{totalHistorySales.toFixed(2)}</p>
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
                            <div key={sale.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                <div 
                                    className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900">{sale.customerName}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <span>{new Date(sale.timestamp).toLocaleString()}</span>
                                            <span>•</span>
                                            <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">By: {sale.cashierName || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-indigo-900">₱{sale.total.toFixed(2)}</span>
                                        {expandedSaleId === sale.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                    </div>
                                </div>
                                {expandedSaleId === sale.id && (
                                    <div className="p-4 bg-white border-t border-gray-100">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-xs text-gray-400 uppercase">
                                                    <th className="pb-2">Item</th>
                                                    <th className="pb-2 text-right">Qty</th>
                                                    <th className="pb-2 text-right">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sale.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                                                        <td className="py-2 text-gray-700">{item.name}</td>
                                                        <td className="py-2 text-right font-medium">{item.quantity}</td>
                                                        <td className="py-2 text-right text-gray-500">₱{item.price.toFixed(2)}</td>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles className="text-indigo-600" />
                            Smart Inventory AI
                        </h3>
                        <p className="text-sm text-gray-500">Automated analysis & reports</p>
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
                                Generate Report
                            </>
                        )}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {aiReport ? (
                        <div className="prose prose-sm max-w-none text-gray-700">
                            <div className="whitespace-pre-wrap">{aiReport}</div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <Sparkles size={24} className="text-gray-300" />
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
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
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
                                 <h4 className="font-bold text-gray-900 text-lg">Analyzing Sales Data...</h4>
                                 <p className="text-gray-500 text-sm">Formulating growth strategies for your store.</p>
                             </div>
                         </div>
                     ) : (
                         <div className="prose prose-indigo max-w-none">
                             {strategyContent ? (
                                 <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                                     {strategyContent}
                                 </div>
                             ) : (
                                 <p className="text-center text-red-500">Failed to load strategy.</p>
                             )}
                         </div>
                     )}
                 </div>
                 
                 <div className="p-4 border-t border-gray-100 flex justify-end">
                     <button 
                        onClick={() => setShowStrategyModal(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
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
