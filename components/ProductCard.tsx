import React from 'react';
import { Product } from '../types';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  return (
    <div 
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col h-full"
      onClick={() => onAdd(product)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
        <button 
          className="absolute bottom-3 right-3 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
          aria-label="Add to cart"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-gray-900 line-clamp-1" title={product.name}>{product.name}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-2 font-medium tracking-wide uppercase">{product.category}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-bold text-indigo-900">₱{product.price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;