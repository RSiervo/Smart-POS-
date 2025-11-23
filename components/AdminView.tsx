import React, { useState, useMemo } from 'react';
import { Product, SaleRecord, User } from '../types';
import { 
    Plus, Search, Edit2, Save, X, Package, Tag, AlertTriangle, 
    FileText, Sparkles, Receipt, ChevronDown, ChevronUp, Users, 
    Trash2, Filter, LayoutDashboard, TrendingUp, ShoppingBag, 
    CreditCard, Calendar, RefreshCw
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { CATEGORIES } from '../constants';
import { generateInventoryReport, getRestockAdvice } from '../services/geminiService';

interface AdminViewProps {
  products: Product[];
  salesHistory: SaleRecord[];
  users: User[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const LOW_STOCK_THRESHOLD = 20;
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

const AdminView: React.FC<AdminViewProps> = ({ products, salesHistory = [], users, onAddProduct, onUpdateProduct, onAddUser, onDeleteUser }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'add' | 'reports' | 'staff'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inventory Filter State
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [restockAdvice, setRestockAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  
  // Dashboard Date Filter
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  // AI Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

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
      // Group by day or hour depending on filter? simplified to just sales sequence for now or day buckets
      // If today, show by Hour. If Month, show by Day.
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
    setActiveTab('inventory');
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
    <div className="h-full overflow-y-auto p-8 bg-gray-50/50">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-500 mt-1">Manage business overview, inventory and staff.</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex-wrap">
            <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <LayoutDashboard size={16}/> Overview
            </button>
            <button 
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'inventory' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Package size={16}/> Inventory
            </button>
            <button 
                onClick={() => setActiveTab('add')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'add' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Plus size={16}/> Add Product
            </button>
            <button 
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <FileText size={16}/> Reports
            </button>
            <button 
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'staff' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Users size={16}/> Staff
            </button>
        </div>
      </header>

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
            {/* Filters */}
            <div className="flex justify-end items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 w-fit ml-auto shadow-sm">
                 <Calendar size={16} className="text-gray-400 ml-2" />
                 {(['today', 'week', 'month', 'year', 'all'] as TimeFilter[]).map((f) => (
                     <button
                        key={f}
                        onClick={() => setTimeFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${timeFilter === f ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                     >
                         {f}
                     </button>
                 ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900">₱{stats.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Transactions</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Order Value</p>
                        <h3 className="text-2xl font-bold text-gray-900">₱{stats.averageOrder.toFixed(0)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Low Stock Items</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Sales Trend ({timeFilter})</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timelineData} margin={{top: 0, right: 0, left: -20, bottom: 40}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: '#f3f4f6'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Sales by Category</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
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
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {categoryData.slice(0, 4).map((entry, index) => (
                            <div key={entry.name} className="flex items-center text-xs text-gray-600">
                                <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></span>
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- INVENTORY TAB --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
             {/* AI Restock Advice Block (Visible when populated) */}
             {restockAdvice && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 relative">
                    <button onClick={() => setRestockAdvice(null)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-700">
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg mt-1">
                            <Sparkles size={18} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-indigo-900 mb-2">AI Restock Plan</h4>
                            <div className="prose prose-sm text-indigo-800 whitespace-pre-wrap">
                                {restockAdvice}
                            </div>
                        </div>
                    </div>
                </div>
             )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name or barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoadingAdvice ? (
                                    <span className="animate-pulse">Thinking...</span>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Ask AI
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
                                            className={`transition-colors ${isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
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
      {activeTab === 'add' && (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Package className="text-indigo-600" />
                    New Product Details
                </h3>
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
                            onClick={() => setActiveTab('inventory')}
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
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

      {/* --- REPORTS TAB --- */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    </div>
  );
};

export default AdminView;