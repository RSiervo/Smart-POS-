import { Product, User } from './types';

export const CATEGORIES = ['All', 'Canned Goods', 'Rice & Noodles', 'Snacks', 'Beverages', 'Condiments', 'Household'];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    password: '123',
    name: 'Main Admin',
    role: 'admin'
  },
  {
    id: 'u2',
    username: 'cashier1',
    password: '123',
    name: 'Juan Dela Cruz',
    role: 'cashier'
  },
  {
    id: 'u3',
    username: 'stockman',
    password: '123',
    name: 'Pedro Stockman',
    role: 'inventory'
  }
];

// Philippine Grocery Context
export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Premium Sinandomeng Rice (5kg)', price: 285.00, category: 'Rice & Noodles', image: 'https://picsum.photos/id/1084/200/200', color: 'stone', barcode: '480001', stock: 45 },
  { id: 'p2', name: 'Lucky Me! Pancit Canton', price: 15.00, category: 'Rice & Noodles', image: 'https://picsum.photos/id/1080/200/200', color: 'yellow', barcode: '480002', stock: 120 },
  { id: 'p3', name: 'Corned Beef 150g', price: 42.50, category: 'Canned Goods', image: 'https://picsum.photos/id/1062/200/200', color: 'red', barcode: '480003', stock: 15 },
  { id: 'p4', name: 'Meat Loaf 150g', price: 38.00, category: 'Canned Goods', image: 'https://picsum.photos/id/1069/200/200', color: 'orange', barcode: '480004', stock: 24 },
  { id: 'p5', name: 'Sardines in Tomato Sauce', price: 22.00, category: 'Canned Goods', image: 'https://picsum.photos/id/1060/200/200', color: 'red', barcode: '480005', stock: 8 },
  { id: 'p6', name: 'Chips Party Pack', price: 65.00, category: 'Snacks', image: 'https://picsum.photos/id/1081/200/200', color: 'blue', barcode: '480006', stock: 30 },
  { id: 'p7', name: 'Chocolate Bar', price: 45.00, category: 'Snacks', image: 'https://picsum.photos/id/1082/200/200', color: 'purple', barcode: '480007', stock: 5 },
  { id: 'p8', name: 'Cola 1.5L', price: 75.00, category: 'Beverages', image: 'https://picsum.photos/id/1085/200/200', color: 'stone', barcode: '480008', stock: 60 },
  { id: 'p9', name: 'Soy Sauce 350ml', price: 25.00, category: 'Condiments', image: 'https://picsum.photos/id/1086/200/200', color: 'stone', barcode: '480009', stock: 18 },
  { id: 'p10', name: 'Vinegar 350ml', price: 18.00, category: 'Condiments', image: 'https://picsum.photos/id/1087/200/200', color: 'stone', barcode: '480010', stock: 22 },
  { id: 'p11', name: 'Laundry Soap Bar', price: 28.00, category: 'Household', image: 'https://picsum.photos/id/1088/200/200', color: 'blue', barcode: '480011', stock: 100 },
  { id: 'p12', name: 'Dishwashing Liquid', price: 55.00, category: 'Household', image: 'https://picsum.photos/id/1089/200/200', color: 'green', barcode: '480012', stock: 12 },
];

export const MOCK_SALES_DATA = [
  { name: 'Mon', sales: 15400 },
  { name: 'Tue', sales: 12300 },
  { name: 'Wed', sales: 11000 },
  { name: 'Thu', sales: 16780 },
  { name: 'Fri', sales: 24890 },
  { name: 'Sat', sales: 32390 },
  { name: 'Sun', sales: 28490 },
];

export const MOCK_CATEGORY_DATA = [
  { name: 'Canned Goods', value: 8500 },
  { name: 'Rice/Noodles', value: 12300 },
  { name: 'Beverages', value: 5300 },
  { name: 'Household', value: 3200 },
];