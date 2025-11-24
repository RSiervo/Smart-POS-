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
  amountTendered: number;
  change: number;
  cashierId: string;
  cashierName: string;
}

export interface RestockRecord {
  id: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  stockBefore: number;
  stockAfter: number;
  timestamp: number;
  performedBy: string;
}

export interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface DeliveryRequest {
  id: string;
  items: DeliveryItem[];
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string; // User ID
  submittedByName: string;
  timestamp: number;
  reviewedBy?: string;
  reviewedAt?: number;
  notes?: string;
}

export type ViewMode = 'pos' | 'dashboard' | 'settings' | 'admin';

export type UserRole = 'admin' | 'cashier' | 'inventory';

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

export interface Notification {
  id: string;
  type: 'sale' | 'alert' | 'system' | 'delivery';
  message: string;
  timestamp: number;
  read: boolean;
}