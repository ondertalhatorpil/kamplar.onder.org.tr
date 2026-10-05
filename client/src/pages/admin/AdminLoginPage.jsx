import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, User, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { getAdminHome } from '../../utils/roles';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Kullanıcı adı gereklidir.';
    if (!form.password) errs.password = 'Parola gereklidir.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const adminData = await login(form.username.trim(), form.password);
      toast.success('Giriş başarılı!');
      const from = location.state?.from;
      navigate(from ? `${from.pathname}${from.search || ''}` : getAdminHome(adminData), { replace: true });
    } catch (error) {
      const msg = error.response?.data?.message || 'Giriş başarısız. Kullanıcı adı veya parola hatalı.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-primary-900 to-primary-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-white rounded-2xl px-8 py-4 mx-auto mb-4 shadow-lg shadow-primary-900/50">
            <img src="/logo.png" alt="ÖnderKamp" className="h-14 w-auto" />
          </div>
          <p className="text-primary-200 mt-1">Admin Paneli</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 bg-[#1a0808] rounded-[25px] px-8 pt-2 pb-8 border border-primary-900/50 shadow-2xl shadow-black/60 transition-transform duration-300 hover:scale-[1.02]"
        >
          <p className="text-center text-white text-lg font-semibold my-8">Yönetici Girişi</p>

          <div>
            <div className="flex items-center gap-2 rounded-full px-4 py-3 bg-primary-900 shadow-[inset_2px_5px_10px_rgba(0,0,0,0.7)]">
              <User size={16} className="text-primary-400 shrink-0" />
              <input
                autoComplete="username"
                autoCapitalize="none"
                type="text"
                placeholder="Kullanıcı adı"
                className="bg-transparent border-none outline-none w-full text-sm text-gray-200 placeholder-gray-500"
                value={form.username}
                onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setErrors(er => ({ ...er, username: '' })); }}
              />
            </div>
            {errors.username && <p className="text-red-400 text-xs mt-1 ml-2">{errors.username}</p>}
          </div>

          <div>
            <div className="flex items-center gap-2 rounded-full px-4 py-3 bg-primary-900 shadow-[inset_2px_5px_10px_rgba(0,0,0,0.7)]">
              <Lock size={16} className="text-primary-400 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="bg-transparent border-none outline-none w-full text-sm text-gray-200 placeholder-gray-500"
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
              />
              <button
                type="button"
                className="shrink-0 text-gray-500 hover:text-primary-300 transition-colors duration-200"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1 ml-2">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-primary-700 hover:bg-primary-800 hover:shadow-[0_0_15px_rgba(208,42,43,0.5)] disabled:opacity-60 disabled:hover:shadow-none text-white font-medium py-2.5 transition-all duration-300"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Giriş yapılıyor...</>
            ) : (
              <><LogIn size={16} /> Giriş Yap</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
