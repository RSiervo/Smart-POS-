import React, { useState } from 'react';
import { User } from '../types';
import { Store, User as UserIcon, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-900">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-3 text-indigo-600 mb-10">
             <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                <Store size={28} className="text-white" />
             </div>
             <span className="text-2xl font-bold tracking-tight text-gray-900">SmartSale POS</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">
              Please sign in to your account to access the terminal.
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Username</label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 py-3 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border outline-none transition-all shadow-sm"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border outline-none transition-all shadow-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
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
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </a>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-100">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-wait transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                   <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                   <>
                     Sign In
                     <ArrowRight className="h-4 w-4" />
                   </>
                )}
              </button>
            </form>
            
            <div className="mt-10 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Demo Accounts</p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="font-semibold text-xs text-gray-900">Admin</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            User: admin<br/>
                            Pass: 123
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="font-semibold text-xs text-gray-900">Cashier</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            User: cashier1<br/>
                            Pass: 123
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block relative w-0 flex-1 overflow-hidden bg-gray-900">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1974&auto=format&fit=crop"
          alt="Supermarket aisle"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/60" />
        <div className="absolute bottom-0 left-0 right-0 p-16 text-white z-10">
            <div className="max-w-lg">
                <div className="h-1 w-20 bg-indigo-500 mb-6 rounded-full"></div>
                <h2 className="text-5xl font-bold mb-6 leading-tight">Smart Inventory Management</h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                    Empower your grocery business with AI-driven insights, real-time stock tracking, and seamless point-of-sale operations designed for the Philippines.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;