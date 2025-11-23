import React, { useState } from 'react';
import { CartItem, Product } from '../types';
import { Plus, Minus, Sparkles, CreditCard, ShoppingBag, Trash2 } from 'lucide-react';
import { getSmartRecommendations, generateReceiptMessage } from '../services/geminiService';

interface CartSidebarProps {
  cart: CartItem[];
  allProducts: Product[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onAdd: (product: Product) => void;
  onCheckout: (items: CartItem[], total: number) => void;
  onClear: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ cart, allProducts, onUpdateQuantity, onAdd, onCheckout, onClear }) => {
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Simple VAT calculation for PH
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatableSales = subtotal / 1.12; 
  const vat = subtotal - vatableSales; 
  const total = subtotal;

  const handleGetRecommendations = async () => {
    if (cart.length === 0) return;
    setIsLoadingRecs(true);
    const recs = await getSmartRecommendations(cart, allProducts);
    setRecommendations(recs);
    setIsLoadingRecs(false);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    const msg = await generateReceiptMessage(cart);
    setReceiptMessage(msg);
    
    // Simulate processing delay
    setTimeout(() => {
      setReceiptMessage(null);
      setIsCheckingOut(false);
      setRecommendations([]);
      
      // Complete the transaction in the parent App
      onCheckout(cart, total);
      
      alert(`Transaction Complete!\nTotal: ₱${total.toFixed(2)}\n\nMessage: "${msg}"`);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full max-w-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white z-10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-900">Current Transaction</h2>
          {cart.length > 0 ? (
             <button 
               onClick={onClear}
               className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded"
               title="Clear Cart"
             >
               <Trash2 size={20} />
             </button>
          ) : (
             <span className="text-sm text-gray-500 font-medium">No active cart</span>
          )}
        </div>
        <p className="text-xs text-gray-400">{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-60">
            <ShoppingBag size={48} strokeWidth={1.5} />
            <p className="text-center">Scan item barcode or<br/>select from product grid</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center gap-4 group">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                <p className="text-indigo-600 font-semibold">₱{item.price.toFixed(2)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Smart Recommendations Section */}
        {cart.length > 0 && (
          <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles size={18} />
                <span className="font-semibold text-sm uppercase tracking-wide">Suggested Add-ons</span>
              </div>
              {!isLoadingRecs && recommendations.length === 0 && (
                 <button 
                   onClick={handleGetRecommendations}
                   className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors font-medium"
                 >
                   Generate
                 </button>
              )}
            </div>

            {isLoadingRecs && (
              <div className="space-y-3">
                 <div className="h-14 w-full bg-gray-100 rounded-lg animate-pulse"></div>
                 <div className="h-14 w-full bg-gray-100 rounded-lg animate-pulse"></div>
              </div>
            )}

            <div className="space-y-3">
              {recommendations.map(rec => (
                <div key={rec.id} className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer" onClick={() => onAdd(rec)}>
                  <img src={rec.image} alt={rec.name} className="w-10 h-10 rounded-md object-cover bg-gray-200" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{rec.name}</p>
                    <p className="text-xs text-gray-500">+₱{rec.price.toFixed(2)}</p>
                  </div>
                  <button className="w-7 h-7 bg-white border border-indigo-200 text-indigo-600 rounded-full flex items-center justify-center hover:shadow-sm">
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Checkout */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal (VAT Inc.)</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>VAT (12%)</span>
            <span>₱{vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total Amount</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          className="w-full bg-indigo-600 text-white h-14 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={cart.length === 0 || isCheckingOut}
          onClick={handleCheckout}
        >
            {isCheckingOut ? (
                <span className="animate-pulse">{receiptMessage ? "Printing..." : "Processing..."}</span>
            ) : (
                <>
                <CreditCard size={20} />
                Confirm Payment
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default CartSidebar;