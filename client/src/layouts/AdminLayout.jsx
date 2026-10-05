import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, FileText, BarChart3,
  LogOut, ClipboardList, Menu, X, Inbox, CheckSquare, Smartphone, KeyRound
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminAuthAPI } from '../api';
import Modal from '../components/common/Modal';
import { isCenterAdmin, getAdminRoleLabel } from '../utils/roles';

const hqNavItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/onay-bekleyenler', icon: CheckSquare, label: 'Onay Bekleyenler' },
  { to: '/admin/rezervasyonlar', icon: ClipboardList, label: 'Rezervasyonlar' },
  { to: '/admin/takvim', icon: CalendarDays, label: 'Takvim' },
  { to: '/admin/belgeler', icon: FileText, label: 'Belgeler' },
  { to: '/admin/analiz', icon: BarChart3, label: 'Analiz' },
];

const centerNavItems = [
  { to: '/admin/gelen-talepler', icon: Inbox, label: 'Gelen Talepler' },
  { to: '/admin/rezervasyonlar', icon: ClipboardList, label: 'Rezervasyonlar' },
  { to: '/admin/belgeler', icon: FileText, label: 'Belgeler' },
];

function PhoneModal({ isOpen, onClose }) {
  const { admin, saveAdmin } = useAuth();
  const [phone, setPhone] = useState(admin?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await adminAuthAPI.updateMe({ phone });
      saveAdmin(r.data.data);
      toast.success('Telefon numarası kaydedildi.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SMS Bildirim Numarası" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Rezervasyon onay sürecindeki SMS bildirimleri bu numaraya gönderilir.
        </p>
        <input
          type="tel"
          className="input-field"
          placeholder="05XX XXX XX XX"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">Kaydet</button>
        </div>
      </div>
    </Modal>
  );
}

function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', repeat: '' });
  const [saving, setSaving] = useState(false);
  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (form.next.length < 8) return toast.error('Yeni parola en az 8 karakter olmalıdır.');
    if (form.next !== form.repeat) return toast.error('Yeni parolalar birbiriyle aynı değil.');
    setSaving(true);
    try {
      const r = await adminAuthAPI.changePassword({ current_password: form.current, new_password: form.next });
      toast.success(r.data.message);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Parola değiştirilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Şifremi Değiştir" size="sm">
      <div className="space-y-3">
        <input type="password" className="input-field" placeholder="Mevcut parola" autoComplete="current-password" value={form.current} onChange={setField('current')} />
        <input type="password" className="input-field" placeholder="Yeni parola (en az 8 karakter)" autoComplete="new-password" value={form.next} onChange={setField('next')} />
        <input type="password" className="input-field" placeholder="Yeni parola (tekrar)" autoComplete="new-password" value={form.repeat} onChange={setField('repeat')} />
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button onClick={handleSave} disabled={saving || !form.current || !form.next} className="btn-primary">Kaydet</button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [phoneModal, setPhoneModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const navItems = isCenterAdmin(admin) ? centerNavItems : hqNavItems;

  const handleLogout = async () => {
    await logout();
    toast.success('Çıkış yapıldı.');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-navy-800 text-white flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div>
            <img src="/logo.png" alt="ÖnderKamp" className="h-16 w-auto" />
            <p className="text-xs text-white/50 mt-1">{getAdminRoleLabel(admin)} Paneli</p>
          </div>
          <button className="ml-auto lg:hidden text-white/70" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="px-4 py-3 rounded-lg bg-white/5">
            <p className="text-sm font-medium text-white">{admin?.first_name} {admin?.last_name}</p>
            <p className="text-xs text-white/50 truncate">{getAdminRoleLabel(admin)} · {admin?.username || admin?.email}</p>
          </div>
          <button
            onClick={() => setPhoneModal(true)}
            className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Smartphone size={18} />
            <span className="truncate">{admin?.phone || 'SMS numarası ekle'}</span>
          </button>
          <button
            onClick={() => setPasswordModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <KeyRound size={18} />
            Şifremi Değiştir
          </button>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            className="lg:hidden text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {phoneModal && <PhoneModal isOpen onClose={() => setPhoneModal(false)} />}
      {passwordModal && <PasswordModal onClose={() => setPasswordModal(false)} />}
    </div>
  );
}
