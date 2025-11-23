export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  color?: string;
  barcode: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SaleRecord {
  id: string;
  customerName: string; // e.g., "Customer 1"
  timestamp: number;
  items: CartItem[];
  total: number;
  cashierId: string;
  cashierName: string;
}

export type ViewMode = 'pos' | 'dashboard' | 'settings' | 'admin';

export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this should be hashed
  name: string;
  role: UserRole;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface PrinterSettings {
  paperWidth: '58mm' | '80mm';
  fontSize: 'small' | 'medium' | 'large';
  storeName: string;
  address: string;
  tin: string;
  footerMessage: string;
}