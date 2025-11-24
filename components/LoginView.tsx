import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Store, User as UserIcon, Lock, ArrowRight, Eye, EyeOff, Loader2, Moon, Sun, BarChart3, ShieldCheck, Zap } from 'lucide-react';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const TEXT_SLIDES = [
  {
    title: "Smart Inventory Management",
    desc: "Empower your grocery business with AI-driven insights, real-time stock tracking, and seamless automated restocking.",
    icon: Store
  },
  {
    title: "Real-time Analytics",
    desc: "Track sales trends, monitor cashier performance, and get strategic business advice instantly via our Gemini AI assistant.",
    icon: BarChart3
  },
  {
    title: "Secure & Reliable POS",
    desc: "Fast checkout processing, integrated thermal printing, and strict role-based access control for your peace of mind.",
    icon: ShieldCheck
  }
];

const LoginView: React.FC<LoginViewProps> = ({ users, onLogin, isDarkMode, onToggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Slideshow Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % TEXT_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password. Please try again.');
      setIsLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
      setUsername(u);
      setPassword(p);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors relative overflow-hidden">
      {/* Theme Toggle Overlay */}
      <div className="absolute top-4 right-4 z-50 animate-fade-in">
        <button 
          onClick={onToggleTheme}
          className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition-all"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-6 lg:px-20 xl:px-24 bg-white dark:bg-gray-900 transition-colors z-10 relative">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-[0.02]" 
             style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
             }} 
        />

        <div className="mx-auto w-full max-w-sm lg:w-96 relative z-10">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
             <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                <Store size={32} className="text-white" />
             </div>
             <div>
                <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white block leading-none">SmartSale</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">Intelligent POS</span>
             </div>
          </div>

          <div className="animate-slide-up" style={{animationDelay: '0.2s'}}>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your dashboard.
            </p>
          </div>

          <div className="mt-8 animate-slide-up" style={{animationDelay: '0.3s'}}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="group">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 ml-1">Username</label>
                <div className="relative rounded-xl shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 py-3.5 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 ml-1">Password</label>
                <div className="relative rounded-xl shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline">
                    Forgot password?
                  </a>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-100 dark:border-red-800/50 animate-fade-in flex items-start gap-3">
                   <div className="bg-red-100 dark:bg-red-900/50 p-1 rounded-full text-red-600 dark:text-red-400 shrink-0">
                       <Zap size={14} />
                   </div>
                   <p className="text-sm font-medium text-red-800 dark:text-red-300 mt-0.5">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-wait transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                   <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                   <>
                     Sign In
                     <ArrowRight className="h-5 w-5" />
                   </>
                )}
              </button>
            </form>
            
            <div className="mt-10 animate-fade-in" style={{animationDelay: '0.5s'}}>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">Quick Login (Demo)</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => fillCredentials('admin', '123')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={16} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">Admin</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Full Access</span>
                    </button>

                    <button 
                        onClick={() => fillCredentials('cashier1', '123')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                         <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Store size={16} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">Cashier</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">POS Only</span>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image with Slideshow */}
      <div className="hidden lg:block relative w-0 flex-1 overflow-hidden bg-gray-900 animate-fade-in">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-[20s] hover:scale-110"
          src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1974&auto=format&fit=crop"
          alt="Supermarket aisle"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-90" />
        
        {/* Slideshow Content */}
        <div className="absolute bottom-0 left-0 right-0 p-16 z-20">
            <div className="max-w-xl mx-auto backdrop-blur-md bg-black/30 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                
                {/* Text Slides */}
                <div className="min-h-[160px]">
                    {TEXT_SLIDES.map((slide, idx) => (
                        idx === activeSlide && (
                            <div key={idx} className="animate-slide-up">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 backdrop-blur-sm border border-white/20">
                                    <slide.icon size={24} />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{slide.title}</h2>
                                <p className="text-lg text-gray-200 leading-relaxed font-light">
                                    {slide.desc}
                                </p>
                            </div>
                        )
                    ))}
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-2 mt-8">
                    {TEXT_SLIDES.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setActiveSlide(idx)}
                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;