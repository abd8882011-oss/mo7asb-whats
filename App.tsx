
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { parseFinancialText } from './geminiService';
import { cloudService } from './dbService';
import { Transaction, TransactionType, ExchangeRates, CurrencySummary } from './types';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Settings, 
  Plus, 
  Trash2, 
  Calculator, 
  MessageSquare, 
  RefreshCcw,
  DollarSign,
  Edit2,
  Check,
  X,
  FileDown,
  Table,
  Lock,
  User,
  LogOut,
  AlertTriangle,
  Download,
  Upload,
  Database,
  FileText,
  Clock,
  History,
  ShieldCheck,
  UserPlus,
  Users,
  UserCog,
  MessageCircle,
  ExternalLink,
  Crown,
  Cloud,
  CloudOff,
  CloudSync,
  Save,
  ChevronRight,
  TrendingUp,
  PieChart
} from 'lucide-react';

interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  activeSessionId?: string;
}

const App: React.FC = () => {
  // الحساب الافتراضي للمسؤول (الأستاذ عبد الرزاق الموسى)
  const DEFAULT_ADMIN = { id: 'admin-0', username: 'abd999', password: '732234', role: 'admin' as const };

  // حالات المستخدمين والمصادقة
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('user_accounts_v3');
    if (saved) return JSON.parse(saved);
    return [DEFAULT_ADMIN];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('currentUserId') || '';
  });
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // حالات لوحة التحكم والتطبيق
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newAccount, setNewAccount] = useState<Omit<UserAccount, 'id' | 'activeSessionId'>>({ username: '', password: '', role: 'user' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEditValues, setUserEditValues] = useState<UserAccount | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    'USD': 1,
    'TRY': 34.50, 
    'SYP': 14500,
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'synced' | 'error' | 'connected'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Transaction | null>(null);

  // معرف الجلسة الفريد لهذه النافذة لمنع الدخول المتعدد
  const [mySessionId] = useState<string>(() => {
    const existing = sessionStorage.getItem('mySessionId');
    if (existing) return existing;
    const newId = Math.random().toString(36).substring(7);
    sessionStorage.setItem('mySessionId', newId);
    return newId;
  });

  // --- نظام أمان الجلسات ومنع الدخول المزدوج ---
  useEffect(() => {
    if (!isLoggedIn || !currentUserId) return;

    const checkSecurity = () => {
      const latestUsersRaw = localStorage.getItem('user_accounts_v3');
      if (latestUsersRaw) {
        const latestUsers: UserAccount[] = JSON.parse(latestUsersRaw);
        const me = latestUsers.find(u => u.id === currentUserId);
        
        if (me && me.activeSessionId && me.activeSessionId !== mySessionId) {
          handleLogout();
          alert('تنبيه أمني: تم اكتشاف دخول لهذا الحساب من جهاز أو نافذة أخرى. تم تسجيل الخروج تلقائياً.');
        }
      }
    };

    const interval = setInterval(checkSecurity, 4000);
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUserId, mySessionId]);

  // --- مزامنة البيانات السحابية مع Neon PostgreSQL عبر Vercel API ---
  const handleCloudSync = async () => {
    if (!currentUserId) return;
    setSyncing(true);
    try {
      const success = await cloudService.syncTransactions(currentUserId, transactions);
      if (success) {
        setCloudStatus('synced');
        setTimeout(() => setCloudStatus('connected'), 3000);
      } else {
        setCloudStatus('error');
      }
    } catch (e) {
      setCloudStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  // جلب البيانات الأولية
  useEffect(() => {
    if (isLoggedIn && currentUserId) {
      const savedTransactions = localStorage.getItem(`transactions_${currentUserId}`);
      const savedRates = localStorage.getItem(`exchangeRates_${currentUserId}`);
      
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      if (savedRates) setExchangeRates(JSON.parse(savedRates));

      // محاولة الجلب من السحاب (Neon) لتحديث البيانات المحلية
      setCloudStatus('idle');
      cloudService.fetchUserData(currentUserId).then(cloudData => {
        if (cloudData) {
          setTransactions(cloudData.transactions);
          setExchangeRates(cloudData.rates);
          setCloudStatus('connected');
        }
      }).catch(() => setCloudStatus('error'));
    }
  }, [currentUserId, isLoggedIn]);

  // حفظ البيانات محلياً عند التغيير
  useEffect(() => {
    if (isLoggedIn && currentUserId) {
      localStorage.setItem(`transactions_${currentUserId}`, JSON.stringify(transactions));
      localStorage.setItem(`exchangeRates_${currentUserId}`, JSON.stringify(exchangeRates));
      localStorage.setItem('user_accounts_v3', JSON.stringify(users));
    }
  }, [transactions, exchangeRates, users, currentUserId, isLoggedIn]);

  const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);
  const isAdmin = currentUser?.role === 'admin';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const foundIndex = users.findIndex(u => u.username === loginUsername && u.password === loginPassword);
    
    if (foundIndex !== -1) {
      const updatedUsers = [...users];
      updatedUsers[foundIndex] = { ...updatedUsers[foundIndex], activeSessionId: mySessionId };
      setUsers(updatedUsers);
      setIsLoggedIn(true);
      setCurrentUserId(updatedUsers[foundIndex].id);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUserId', updatedUsers[foundIndex].id);
      localStorage.setItem('user_accounts_v3', JSON.stringify(updatedUsers));
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  const handleLogout = () => {
    if (currentUserId) {
      const updatedUsers = users.map(u => u.id === currentUserId ? { ...u, activeSessionId: undefined } : u);
      setUsers(updatedUsers);
      localStorage.setItem('user_accounts_v3', JSON.stringify(updatedUsers));
    }
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUserId');
    setCurrentUserId('');
    setLoginUsername('');
    setLoginPassword('');
    setShowAdminPanel(false);
  };

  const summaries = useMemo(() => {
    const map = new Map<string, CurrencySummary>();
    transactions.forEach(t => {
      const current = map.get(t.currency) || { currency: t.currency, totalIncoming: 0, totalOutgoing: 0, balance: 0, usdValue: 0 };
      if (t.type === TransactionType.INCOMING) current.totalIncoming += t.amount;
      else current.totalOutgoing += t.amount;
      current.balance = current.totalIncoming - current.totalOutgoing;
      const rate = exchangeRates[t.currency] || 0;
      current.usdValue = rate > 0 ? current.balance / rate : 0;
      map.set(t.currency, current);
    });
    return Array.from(map.values());
  }, [transactions, exchangeRates]);

  const totalUsdBalance = useMemo(() => summaries.reduce((acc, curr) => acc + curr.usdValue, 0), [summaries]);

  const handleProcessText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newTransactions = await parseFinancialText(inputText);
      setTransactions(prev => [...prev, ...newTransactions]);
      setInputText('');
      // المزامنة التلقائية مع السحاب بعد الإضافة بنجاح
      handleCloudSync();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحليل النص المالي.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: `تقرير_مالي_${currentUser?.username}_${new Date().toLocaleDateString('ar-EG')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    html2pdf().set(opt).from(reportRef.current).save();
  };

  const handleDownloadExcel = () => {
    const data = transactions.map(t => ({
      'الحالة': t.type === TransactionType.INCOMING ? 'له (وارد)' : 'عليه (صادر)',
      'المبلغ': t.amount,
      'العملة': t.currency,
      'البيان': t.description,
      'التاريخ': new Date().toLocaleDateString('ar-EG')
    }));
    // @ts-ignore
    const ws = XLSX.utils.json_to_sheet(data);
    // @ts-ignore
    const wb = XLSX.utils.book_new();
    // @ts-ignore
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    // @ts-ignore
    XLSX.writeFile(wb, `كشف_حساب_${currentUser?.username}.xlsx`);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-emerald-600 p-10 text-center text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Database className="w-20 h-20" />
            </div>
            <div className="bg-white/20 w-20 h-20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
              <Calculator className="w-10 h-10 -rotate-12" />
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">المحاسب الذكي</h1>
            <p className="text-emerald-100 font-medium">بوابة الأستاذ عبد الرزاق الموسى</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-600" /> اسم المستخدم
              </label>
              <input 
                type="text" 
                required 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-lg font-bold" 
                placeholder="أدخل اسمك" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> كلمة المرور
              </label>
              <input 
                type="password" 
                required 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-lg font-bold" 
                placeholder="••••••••" 
              />
            </div>
            {loginError && (
              <div className="p-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-2xl border border-rose-100 flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-5 h-5" /> {loginError}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] text-lg"
            >
              تسجيل دخول آمن
            </button>
          </form>
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Copyright © 2024 - Abdul Razzaq Al-Mousa
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-12 font-['Tajawal']">
      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex justify-between items-center relative">
               <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               </div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                  <UserCog className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">إدارة النظام</h2>
                  <p className="text-emerald-100/80 font-medium">التحكم بالمستخدمين وقواعد بيانات Neon</p>
                </div>
              </div>
              <button onClick={() => setShowAdminPanel(false)} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-all relative z-10"><X className="w-7 h-7" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem]">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-xl"><UserPlus className="w-6 h-6 text-emerald-600" /> إضافة مستخدم جديد</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAccount.username || !newAccount.password) return;
                  const newUser: UserAccount = { ...newAccount, id: `user-${Date.now()}` };
                  setUsers(prev => [...prev, newUser]);
                  setNewAccount({ username: '', password: '', role: 'user' });
                }} className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <input type="text" placeholder="اسم المستخدم" className="bg-white border border-slate-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold" value={newAccount.username} onChange={(e) => setNewAccount({...newAccount, username: e.target.value})} />
                  <input type="text" placeholder="كلمة المرور" className="bg-white border border-slate-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold" value={newAccount.password} onChange={(e) => setNewAccount({...newAccount, password: e.target.value})} />
                  <select className="bg-white border border-slate-200 rounded-2xl px-5 py-3 font-bold" value={newAccount.role} onChange={(e) => setNewAccount({...newAccount, role: e.target.value as 'admin' | 'user'})}>
                    <option value="user">مستخدم عادي</option>
                    <option value="admin">مسؤول نظام</option>
                  </select>
                  <button type="submit" className="bg-emerald-600 text-white font-black rounded-2xl py-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10">إضافة فورية</button>
                </form>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 flex items-center gap-3 text-xl"><Users className="w-6 h-6 text-emerald-600" /> المستخدمين الحاليين ({users.length})</h3>
                  <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">مربوط بـ Neon DB</div>
                </div>
                <div className="border border-slate-100 rounded-3xl overflow-hidden overflow-x-auto shadow-sm">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <tr><th className="px-8 py-5">المستخدم</th><th className="px-8 py-5">كلمة المرور</th><th className="px-8 py-5 text-center">حالة الجلسة</th><th className="px-8 py-5 text-center">إجراء</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {u.username[0].toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-700">{u.username}</span>
                              {u.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                          </td>
                          <td className="px-8 py-5 font-mono text-sm text-slate-400">{u.password}</td>
                          <td className="px-8 py-5 text-center">
                            {u.activeSessionId ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black border border-emerald-200">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span> متصل الآن
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-3 py-1.5 rounded-full uppercase">غير متصل</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <button 
                              onClick={() => {
                                if(u.id === currentUserId) return alert("خطأ: لا يمكنك حذف حسابك الخاص أثناء تسجيل الدخول.");
                                if(confirm(`هل أنت متأكد من حذف حساب ${u.username}؟ سيتم حذف كافة بياناته المالية أيضاً.`)) {
                                  setUsers(prev => prev.filter(item => item.id !== u.id));
                                }
                              }} 
                              className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 no-print shadow-sm backdrop-blur-md bg-white/90">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-600/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">محاسب الواتساب</h1>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mt-1">Neon Cloud Integrated</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
              <div className={`w-2 h-2 rounded-full ${cloudStatus === 'connected' || cloudStatus === 'synced' ? 'bg-emerald-500' : 'bg-slate-300'} ${syncing ? 'animate-pulse' : ''}`}></div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {syncing ? 'مزامنة...' : cloudStatus === 'synced' ? 'تم الحفظ' : cloudStatus === 'connected' ? 'Neon متصل' : 'سحابي'}
              </span>
            </div>
            <button 
              onClick={handleCloudSync} 
              disabled={syncing}
              className={`p-2.5 rounded-2xl transition-all border ${syncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-600/10'}`}
              title="مزامنة مع Neon DB"
            >
              <CloudSync className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-px h-8 bg-slate-100 mx-1"></div>
            {isAdmin && (
              <button 
                onClick={() => setShowAdminPanel(true)} 
                className="bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all border border-amber-100 active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" /> <span className="hidden lg:inline">لوحة التحكم</span>
              </button>
            )}
            <button 
              onClick={handleLogout} 
              className="bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all border border-slate-100 active:scale-95"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden lg:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sidebar */}
        <aside className="lg:col-span-4 space-y-8 no-print">
          {/* Main Balance Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[3rem] shadow-2xl shadow-emerald-600/20 p-10 text-white relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <TrendingUp className="w-64 h-64" />
            </div>
            <p className="text-emerald-100 text-sm font-bold flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4" /> صافي الرصيد التقديري
            </p>
            <div className="text-5xl font-black flex items-center gap-3 tracking-tighter">
              <DollarSign className="w-10 h-10 text-emerald-200" />
              {totalUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <User className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-200 uppercase font-black tracking-widest leading-none mb-1">المستخدم النشط</p>
                  <p className="font-black text-white">{currentUser?.username}</p>
                </div>
              </div>
              {cloudStatus === 'connected' && <div className="text-[8px] font-black bg-white/10 px-2 py-1 rounded-full uppercase tracking-widest text-emerald-200">Sync Active</div>}
            </div>
          </div>

          {/* Designer Branding Card */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className="bg-slate-50 p-6 border-b border-slate-50 flex items-center gap-4">
               <div className="bg-amber-100 p-3 rounded-2xl group-hover:rotate-12 transition-transform duration-500"><Crown className="w-6 h-6 text-amber-600" /></div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تطوير وتصميم</p>
                 <h3 className="text-lg font-black text-slate-700">الأستاذ عبد الرزاق الموسى</h3>
               </div>
            </div>
            <div className="p-6">
               <a 
                href="https://wa.me/963992262993" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100 group/btn hover:bg-emerald-600 transition-all duration-500"
               >
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl group-hover/btn:bg-emerald-500 transition-colors">
                      <MessageCircle className="w-6 h-6 text-emerald-600 group-hover/btn:text-white" />
                    </div>
                    <span className="text-sm font-black text-emerald-700 group-hover/btn:text-white">تواصل مباشر واتساب</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-300 group-hover/btn:text-white" />
               </a>
            </div>
          </div>

          {/* Exchange Rates Card */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-black text-xl text-slate-700 flex items-center gap-3">
                <Settings className="w-6 h-6 text-emerald-600" /> أسعار الصرف
              </h2>
              <button 
                onClick={() => { const c = prompt('أدخل رمز العملة الجديدة (مثال: EUR):'); if(c) setExchangeRates(prev => ({...prev, [c.toUpperCase()]: 1})); }} 
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-emerald-600 border border-emerald-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5">
              {Object.entries(exchangeRates).map(([currency, rate]) => (
                <div key={currency} className="flex items-center gap-4 group">
                  <div className="w-16 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-xs font-black text-slate-400 uppercase tracking-widest group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all">
                    {currency}
                  </div>
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      value={rate} 
                      onChange={(e) => { 
                        const r = parseFloat(e.target.value); 
                        if(!isNaN(r)) setExchangeRates(prev => ({...prev, [currency]: r})); 
                      }} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all group-hover:bg-white" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">/ USD</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Cleanup (Small) */}
          <div className="px-4">
             <button 
              onClick={() => { if(confirm("هل أنت متأكد من مسح كافة بيانات السجل؟ لا يمكن التراجع.")) { setTransactions([]); handleCloudSync(); }}} 
              className="w-full py-4 text-slate-300 hover:text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all border-2 border-dashed border-slate-100 rounded-[2rem] hover:border-rose-100 hover:bg-rose-50/30"
             >
               <RefreshCcw className="w-3.5 h-3.5" /> تصفير قاعدة البيانات المحلية
             </button>
          </div>
        </aside>

        {/* Right Main Content */}
        <section className="lg:col-span-8 space-y-10" ref={reportRef}>
          {/* Text Input Section */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 no-print relative group">
            <div className="absolute top-8 left-8">
               <MessageSquare className="w-12 h-12 text-slate-50 group-hover:text-emerald-50 transition-colors" />
            </div>
            <label className="block mb-6 font-black text-slate-700 flex items-center gap-3 text-2xl relative z-10">
              <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center"><Plus className="w-6 h-6 text-emerald-600" /></div> 
              إضافة حسابات الواتساب
            </label>
            <textarea 
              className="w-full h-44 bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-slate-800 focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500/30 outline-none transition-all resize-none text-xl leading-relaxed shadow-inner placeholder:text-slate-300 relative z-10" 
              placeholder="مثال: أرسل لي أحمد 500 ليرة تركي حق غدا..." 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
            />
            {error && <div className="mt-4 p-4 bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100 rounded-2xl animate-bounce">⚠️ {error}</div>}
            <button 
              onClick={handleProcessText} 
              disabled={loading || !inputText.trim()} 
              className={`mt-6 w-full py-5 rounded-[2rem] font-black text-white transition-all flex items-center justify-center gap-4 text-xl shadow-xl ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري التحليل الذكي...
                </>
              ) : (
                <>
                  تحليل وإضافة للدفتر
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summaries.map((summary) => (
              <div key={summary.currency} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 hover:shadow-lg transition-all duration-500 group">
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-xl font-black text-sm uppercase tracking-widest border border-slate-200/50">{summary.currency}</span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">≈ {summary.usdValue.toFixed(2)} $</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">له (وارد)</span>
                    <span className="text-emerald-600 font-black tracking-tight text-lg">+{summary.totalIncoming.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">عليه (صادر)</span>
                    <span className="text-rose-600 font-black tracking-tight text-lg">-{summary.totalOutgoing.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-50 flex justify-between items-end">
                    <span className="font-black text-slate-400 text-[10px] uppercase tracking-widest pb-1">الصافي</span>
                    <span className={`text-3xl font-black tracking-tighter ${summary.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {summary.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions List */}
          {transactions.length > 0 ? (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden break-before-page shadow-inner-white">
              <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                <div>
                  <h2 className="font-black text-slate-800 text-2xl flex items-center gap-4">
                    <FileText className="w-8 h-8 text-emerald-600" /> كشف الحساب المفصل
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Neon Cloud Ledger: {currentUser?.username}</p>
                </div>
                <div className="flex gap-4 no-print">
                  <button onClick={handleDownloadExcel} title="تحميل إكسل" className="bg-white p-4 rounded-2xl text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"><Table className="w-6 h-6" /></button>
                  <button onClick={handleDownloadPDF} title="تحميل PDF" className="bg-white p-4 rounded-2xl text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"><FileDown className="w-6 h-6" /></button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black border-b border-slate-100 bg-slate-50/20 uppercase tracking-[0.2em]">
                      <th className="px-10 py-6">نوع العملية</th>
                      <th className="px-10 py-6">المبلغ</th>
                      <th className="px-10 py-6">العملة</th>
                      <th className="px-10 py-6">البيان والتفاصيل</th>
                      <th className="px-10 py-6 text-center no-print">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-7">
                          <div className={`flex items-center gap-3 font-black text-sm ${t.type === TransactionType.INCOMING ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === TransactionType.INCOMING ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                            {t.type === TransactionType.INCOMING ? 'له (وارد)' : 'عليه (صادر)'}
                          </div>
                        </td>
                        <td className="px-10 py-7 font-black text-slate-800 text-xl tracking-tighter">{t.amount.toLocaleString()}</td>
                        <td className="px-10 py-7">
                          <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50 tracking-widest">
                            {t.currency}
                          </span>
                        </td>
                        <td className="px-10 py-7 text-slate-600 font-bold text-sm leading-relaxed max-w-xs">{t.description}</td>
                        <td className="px-10 py-7 text-center no-print">
                          <button 
                            onClick={() => { setTransactions(prev => prev.filter(item => item.id !== t.id)); handleCloudSync(); }} 
                            className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !loading && (
            <div className="text-center py-28 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 no-print">
               <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                 <Calculator className="w-10 h-10 text-slate-200" />
               </div>
               <h3 className="text-slate-800 font-black text-3xl mb-3">السجل فارغ تماماً</h3>
               <p className="text-slate-400 font-medium max-w-sm mx-auto">أهلاً بك يا {currentUser?.username}. ابدأ بنسخ الحسابات من واتساب ولصقها في الحقل أعلاه وسأقوم بترتيبها لك فوراً.</p>
               <div className="mt-8 flex justify-center gap-4">
                 <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest">Smart AI Analytics</div>
                 <div className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">Neon Cloud Sync</div>
               </div>
            </div>
          )}
        </section>
      </main>
      
      {/* Footer Branding */}
      <footer className="container mx-auto px-6 mt-20 text-center border-t border-slate-100 pt-12 pb-8 no-print">
        <div className="flex flex-col items-center gap-6">
           <div className="flex items-center gap-4 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">
              <span className="hover:text-slate-600 transition-colors">الأستاذ: عبد الرزاق الموسى</span>
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
              <a href="https://wa.me/963992262993" className="text-emerald-600 hover:text-emerald-700 transition-colors">تواصل واتساب: +963992262993</a>
           </div>
           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 grayscale hover:grayscale-0 transition-all duration-700">
             <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">نظام المحاسب الذكي - متكامل مع Neon DB & Vercel Services - إصدار 2024.1</p>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
