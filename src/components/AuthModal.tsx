import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, Store, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { login, register, quickDemoLogin } = useAuth();
  const { success, error } = useToast();

  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [role, setRole] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        success('Signed in successfully!');
        onClose();
      } else {
        await register({
          email,
          password,
          name,
          phone,
          role,
          storeName: role === 'SELLER' ? storeName : undefined,
          storeDescription: role === 'SELLER' ? storeDescription : undefined,
        });
        success(role === 'SELLER' ? 'Seller application submitted!' : 'Account registered successfully!');
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (demoEmail: string) => {
    setLoading(true);
    try {
      await quickDemoLogin(demoEmail);
      success('Logged in with Demo Account!');
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed demo login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 bg-gradient-to-b from-indigo-50/50 to-transparent">
          <div className="inline-flex p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {tab === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {tab === 'login'
              ? 'Access your orders, wishlist, or vendor dashboard.'
              : 'Join Commerce Engine as a customer or seller.'}
          </p>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl mt-4 text-xs font-semibold">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Demo Accounts Quick-Select (As required by brief) */}
        <div className="px-6 py-3 bg-amber-50/70 border-y border-amber-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Demo Accounts (Password: <span className="font-mono text-indigo-700">demo123</span>)
            </span>
            <span className="text-[10px] text-amber-700 font-medium">1-Click Login</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoClick('customer@commerceengine.local')}
              className="p-2 bg-white rounded-lg border border-amber-200 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
            >
              <div className="font-bold text-slate-800">Customer</div>
              <div className="text-[10px] text-slate-500 truncate">customer@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('seller1@commerceengine.local')}
              className="p-2 bg-white rounded-lg border border-amber-200 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
            >
              <div className="font-bold text-slate-800">Seller (Apex)</div>
              <div className="text-[10px] text-slate-500 truncate">seller1@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('seller2@commerceengine.local')}
              className="p-2 bg-white rounded-lg border border-amber-200 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
            >
              <div className="font-bold text-slate-800">Seller (Apparel)</div>
              <div className="text-[10px] text-slate-500 truncate">seller2@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('admin@commerceengine.local')}
              className="p-2 bg-white rounded-lg border border-amber-200 text-left hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
            >
              <div className="font-bold text-slate-800">Market Admin</div>
              <div className="text-[10px] text-slate-500 truncate">admin@...</div>
            </button>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {tab === 'register' && (
            <>
              {/* Role Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      role === 'CUSTOMER'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('SELLER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      role === 'SELLER'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    Seller Account
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {role === 'SELLER' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Store / Business Name</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Tech Essentials"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Store Description</label>
                    <textarea
                      rows={2}
                      placeholder="Brief overview of what you will sell..."
                      value={storeDescription}
                      onChange={(e) => setStoreDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⏳</span>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In to Account' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
