import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  onSnapshot, getDocs, writeBatch
} from 'firebase/firestore';

// ─── Themes ─────────────────────────────────────────────────
const THEMES = {
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    cardHover: '#f1f5f9',
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#eef2ff',
    success: '#10b981',
    successLight: '#ecfdf5',
    danger: '#ef4444',
    dangerLight: '#fef2f2',
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    info: '#3b82f6',
    infoLight: '#eff6ff',
    shadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    shadowLg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    headerBg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
  },
  dark: {
    bg: '#0f172a',
    card: '#1e293b',
    cardHover: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#334155',
    primary: '#818cf8',
    primaryHover: '#6366f1',
    primaryLight: '#1e1b4b',
    success: '#34d399',
    successLight: '#064e3b',
    danger: '#f87171',
    dangerLight: '#7f1d1d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    infoLight: '#1e3a5f',
    shadow: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
    shadowLg: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2)',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)',
    headerBg: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #7c3aed 100%)',
  }
};

// ─── Format Money ───────────────────────────────────────────
const formatMoney = (amount) => {
  return `S/ ${Number(amount).toFixed(2)}`;
};

// ─── Soles Icon ─────────────────────────────────────────────
const SolesIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

// ─── Stat Card ──────────────────────────────────────────────
const StatCard = ({ icon, label, value, subtitle, color, theme }) => (
  <div className="animate-slide-up" style={{
    background: theme.card,
    borderRadius: '16px',
    padding: '20px',
    boxShadow: theme.shadow,
    border: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease',
    cursor: 'default',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: `${color}15`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px'
      }}>
        {icon}
      </div>
      <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}>{label}</span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: theme.text, letterSpacing: '-0.5px' }}>{value}</div>
    {subtitle && <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>{subtitle}</div>}
  </div>
);

// ─── Analysis Card ──────────────────────────────────────────
const AnalysisCard = ({ icon, title, children, theme, color }) => (
  <div className="animate-slide-up" style={{
    background: theme.card,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: theme.shadow,
    border: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '10px',
        background: `${color || theme.primary}15`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '16px'
      }}>
        {icon}
      </div>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: theme.text }}>{title}</h3>
    </div>
    {children}
  </div>
);

// ─── Payment Method Badge ───────────────────────────────────
const PaymentMethodBadge = ({ method, theme, onClick }) => {
  const config = {
    yape: { bg: '#7c3aed15', color: '#7c3aed', icon: '📱', label: 'Yape' },
    plin: { bg: '#0ea5e915', color: '#0ea5e9', icon: '💳', label: 'Plin' },
    efectivo: { bg: '#f59e0b15', color: '#f59e0b', icon: '💵', label: 'Efectivo' },
    transferencia: { bg: '#10b98115', color: '#10b981', icon: '🏦', label: 'Transfer.' },
  };
  const c = config[method] || config.efectivo;
  return (
    <button onClick={onClick} style={{
      background: c.bg, color: c.color, border: 'none', borderRadius: '8px',
      padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
    }} title="Click para cambiar método de pago">
      <span>{c.icon}</span>
      <span>{c.label}</span>
    </button>
  );
};

// ═════════════════════════════════════════════════════════════
// ─── MAIN APP ───────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════
export default function App() {
  // ── State ─────────────────────────────────────────────────
  const [services, setServices] = useState([]);
  const [members, setMembers] = useState([]);
  const [newService, setNewService] = useState({ name: '', cost: '', paymentDay: '1' });
  const [newMember, setNewMember] = useState({ serviceId: '', name: '', contribution: '', paymentDay: '', paymentMethod: 'yape' });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [toast, setToast] = useState(null);
  const [expandedService, setExpandedService] = useState(null);
  const [showAddService, setShowAddService] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const theme = darkMode ? THEMES.dark : THEMES.light;

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Load local backup ─────────────────────────────────────
  const loadLocalBackup = useCallback(() => {
    try {
      const backupServices = localStorage.getItem('backup_services');
      const backupMembers = localStorage.getItem('backup_members');
      if (backupServices) setServices(JSON.parse(backupServices));
      if (backupMembers) setMembers(JSON.parse(backupMembers));
    } catch (e) {
      console.error('Error loading local backup:', e);
    }
  }, []);

  // ── Dark mode persistence ─────────────────────────────────
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // ── Firestore real-time listeners ─────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsubServices = onSnapshot(
      collection(db, 'services'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setServices(data);
        localStorage.setItem('backup_services', JSON.stringify(data));
        setSyncStatus('connected');
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to services:', error);
        setSyncStatus('error');
        loadLocalBackup();
        setLoading(false);
      }
    );

    const unsubMembers = onSnapshot(
      collection(db, 'members'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(data);
        localStorage.setItem('backup_members', JSON.stringify(data));
      },
      (error) => {
        console.error('Error listening to members:', error);
        loadLocalBackup();
      }
    );

    return () => {
      unsubServices();
      unsubMembers();
    };
  }, [loadLocalBackup]);

  // ── CRUD: Add Service ─────────────────────────────────────
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.cost) return;

    const isDuplicate = services.some(s => s.name.toLowerCase() === newService.name.toLowerCase());
    if (isDuplicate) {
      showToast(`El servicio "${newService.name}" ya está registrado.`);
      return;
    }

    try {
      setSyncing(true);
      await addDoc(collection(db, 'services'), {
        name: newService.name,
        cost: Number(newService.cost),
        paymentDay: Number(newService.paymentDay)
      });
      setNewService({ name: '', cost: '', paymentDay: '1' });
      showToast('Servicio agregado correctamente.', 'success');
    } catch (error) {
      showToast('Error al agregar servicio: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── CRUD: Add Member ──────────────────────────────────────
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.serviceId || !newMember.name || !newMember.contribution) return;

    const service = services.find(s => s.id === newMember.serviceId);
    const isDuplicate = members.some(
      m => m.serviceId === newMember.serviceId && m.name.toLowerCase() === newMember.name.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`"${newMember.name}" ya está en ${service?.name || 'este servicio'}.`);
      return;
    }

    try {
      setSyncing(true);
      await addDoc(collection(db, 'members'), {
        serviceId: newMember.serviceId,
        name: newMember.name,
        contribution: Number(newMember.contribution),
        paymentDay: Number(newMember.paymentDay || service?.paymentDay || 1),
        paymentMethod: newMember.paymentMethod || 'yape'
      });
      setNewMember({ serviceId: '', name: '', contribution: '', paymentDay: '', paymentMethod: 'yape' });
      showToast('Miembro agregado correctamente.', 'success');
    } catch (error) {
      showToast('Error al agregar miembro: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── CRUD: Delete Service ──────────────────────────────────
  const deleteService = async (id) => {
    try {
      setSyncing(true);
      await deleteDoc(doc(db, 'services', id));
      const serviceMembers = members.filter(m => m.serviceId === id);
      if (serviceMembers.length > 0) {
        const batch = writeBatch(db);
        serviceMembers.forEach(m => batch.delete(doc(db, 'members', m.id)));
        await batch.commit();
      }
      showToast('Servicio eliminado.', 'success');
    } catch (error) {
      showToast('Error al eliminar: ' + error.message);
    } finally {
      setSyncing(false);
      setConfirmDelete(null);
    }
  };

  // ── CRUD: Delete Member ───────────────────────────────────
  const deleteMember = async (id) => {
    try {
      setSyncing(true);
      await deleteDoc(doc(db, 'members', id));
      showToast('Miembro eliminado.', 'success');
    } catch (error) {
      showToast('Error al eliminar miembro: ' + error.message);
    } finally {
      setSyncing(false);
      setConfirmDelete(null);
    }
  };

  // ── CRUD: Toggle Payment Method ───────────────────────────
  const togglePaymentMethod = async (memberId, currentMethod) => {
    const methods = ['yape', 'plin', 'efectivo', 'transferencia'];
    const nextIndex = (methods.indexOf(currentMethod) + 1) % methods.length;
    const nextMethod = methods[nextIndex];

    try {
      await updateDoc(doc(db, 'members', memberId), {
        paymentMethod: nextMethod
      });
    } catch (error) {
      showToast('Error al cambiar método: ' + error.message);
    }
  };

  // ── Confirm Delete Handler ────────────────────────────────
  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'service') {
      deleteService(confirmDelete.id);
    } else {
      deleteMember(confirmDelete.id);
    }
  };

  // ── Computed Data ─────────────────────────────────────────
  const totalMonthlyCost = useMemo(() => services.reduce((sum, s) => sum + Number(s.cost || 0), 0), [services]);

  const totalMonthlyIncome = useMemo(() => members.reduce((sum, m) => sum + Number(m.contribution || 0), 0), [members]);

  const monthlyBalance = useMemo(() => totalMonthlyIncome - totalMonthlyCost, [totalMonthlyIncome, totalMonthlyCost]);

  const serviceBreakdown = useMemo(() => {
    return services.map(service => {
      const serviceMembers = members.filter(m => m.serviceId === service.id);
      const totalContributions = serviceMembers.reduce((sum, m) => sum + Number(m.contribution || 0), 0);
      const balance = totalContributions - Number(service.cost || 0);
      return {
        ...service,
        members: serviceMembers,
        totalContributions,
        balance,
        memberCount: serviceMembers.length,
      };
    });
  }, [services, members]);

  const paymentMethodStats = useMemo(() => {
    const stats = { yape: 0, plin: 0, efectivo: 0, transferencia: 0 };
    members.forEach(m => {
      const method = m.paymentMethod || 'efectivo';
      stats[method] = (stats[method] || 0) + 1;
    });
    return stats;
  }, [members]);

  const upcomingPayments = useMemo(() => {
    const today = new Date().getDate();
    const allPayments = [];

    services.forEach(service => {
      const day = Number(service.paymentDay || 1);
      let daysUntil = day - today;
      if (daysUntil < 0) daysUntil += 30;
      allPayments.push({
        name: `Pago ${service.name}`,
        day,
        daysUntil,
        amount: service.cost,
        type: 'service'
      });
    });

    members.forEach(member => {
      const service = services.find(s => s.id === member.serviceId);
      const day = Number(member.paymentDay || service?.paymentDay || 1);
      let daysUntil = day - today;
      if (daysUntil < 0) daysUntil += 30;
      allPayments.push({
        name: `Cobro a ${member.name}`,
        day,
        daysUntil,
        amount: member.contribution,
        type: 'member',
        serviceName: service?.name
      });
    });

    return allPayments.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 8);
  }, [services, members]);

  const smartAnalysis = useMemo(() => {
    const insights = [];

    serviceBreakdown.forEach(s => {
      if (s.balance < 0) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          text: `${s.name} tiene un déficit de ${formatMoney(Math.abs(s.balance))}`,
          detail: `Costo: ${formatMoney(s.cost)} | Recaudado: ${formatMoney(s.totalContributions)}`
        });
      }
      if (s.memberCount === 0) {
        insights.push({
          type: 'danger',
          icon: '🚨',
          text: `${s.name} no tiene miembros asignados`,
          detail: `Costo mensual sin cubrir: ${formatMoney(s.cost)}`
        });
      }
      if (s.balance > 0) {
        insights.push({
          type: 'success',
          icon: '✅',
          text: `${s.name} tiene superávit de ${formatMoney(s.balance)}`,
          detail: `${s.memberCount} miembros contribuyendo`
        });
      }
    });

    if (monthlyBalance < 0) {
      insights.unshift({
        type: 'danger',
        icon: '💸',
        text: `Balance general negativo: ${formatMoney(monthlyBalance)}`,
        detail: 'Necesitas más contribuciones o reducir servicios'
      });
    } else if (monthlyBalance > 0) {
      insights.unshift({
        type: 'success',
        icon: '💰',
        text: `Balance general positivo: +${formatMoney(monthlyBalance)}`,
        detail: 'Todos los costos están cubiertos'
      });
    }

    return insights;
  }, [serviceBreakdown, monthlyBalance]);

  // ── Calendar Data ─────────────────────────────────────────
  const calendarData = useMemo(() => {
    const days = {};
    services.forEach(s => {
      const day = Number(s.paymentDay || 1);
      if (!days[day]) days[day] = { payments: [], collections: [] };
      days[day].payments.push({ name: s.name, amount: s.cost });
    });
    members.forEach(m => {
      const service = services.find(s => s.id === m.serviceId);
      const day = Number(m.paymentDay || service?.paymentDay || 1);
      if (!days[day]) days[day] = { payments: [], collections: [] };
      days[day].collections.push({ name: m.name, amount: m.contribution, service: service?.name });
    });
    return days;
  }, [services, members]);

  // ── PD (Por Distribuir) Panel Data ────────────────────────
  const pdData = useMemo(() => {
    return serviceBreakdown.map(s => {
      const costPerMember = s.memberCount > 0 ? s.cost / s.memberCount : s.cost;
      const suggestedContribution = Math.ceil(costPerMember * 100) / 100;
      return {
        ...s,
        costPerMember,
        suggestedContribution,
        isEven: s.memberCount > 0 && s.members.every(m => Number(m.contribution) === suggestedContribution),
      };
    });
  }, [serviceBreakdown]);

  // ═════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      {/* ── Global Styles ─────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInFromBottom { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-down { animation: slideInFromTop 0.3s ease-out; }
        .animate-slide-up { animation: slideInFromBottom 0.3s ease-out; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes toastIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme.textMuted}; }

        input, select, textarea {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        input:focus, select:focus {
          outline: none;
          border-color: ${theme.primary} !important;
          box-shadow: 0 0 0 3px ${theme.primary}25 !important;
        }

        button { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      {/* ── Toast Notification ────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
          background: toast.type === 'success' ? theme.success : theme.danger,
          color: '#fff', padding: '14px 20px', borderRadius: '12px',
          boxShadow: theme.shadowLg, maxWidth: '380px',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'toastIn 0.3s ease-out',
          fontSize: '14px', fontWeight: '500',
        }}>
          <span style={{ fontSize: '18px' }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}

      {/* ── Confirm Delete Modal ─────────────────────────── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setConfirmDelete(null)}>
          <div className="animate-slide-down" style={{
            background: theme.card, borderRadius: '20px', padding: '32px',
            maxWidth: '400px', width: '90%', boxShadow: theme.shadowLg,
            border: `1px solid ${theme.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: theme.text, marginBottom: '8px' }}>
                ¿Eliminar {confirmDelete.type === 'service' ? 'servicio' : 'miembro'}?
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: theme.textSecondary }}>
                ¿Seguro que quieres eliminar <strong>{confirmDelete.name}</strong>?
                {confirmDelete.type === 'service' && ' Se eliminarán también todos los miembros asociados.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`,
                background: theme.card, color: theme.text, fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}>
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} disabled={syncing} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                background: theme.danger, color: '#fff', fontSize: '14px', fontWeight: '600',
                cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}>
                {syncing ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────── */}
      <header style={{
        background: theme.headerBg,
        padding: '20px 24px',
        color: '#fff',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📺</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                Gestor de Streaming
              </h1>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Control de suscripciones y pagos</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Sync Status Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.15)', borderRadius: '20px',
              padding: '6px 14px', fontSize: '12px', fontWeight: '500',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: syncStatus === 'connected' ? '#34d399' : syncStatus === 'error' ? '#f87171' : '#fbbf24',
                animation: syncStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
              }} />
              {syncStatus === 'connected' ? 'Conectado en Tiempo Real' :
               syncStatus === 'error' ? 'Sin Conexión' : 'Conectando...'}
            </div>

            {/* Dark Mode Toggle */}
            <button onClick={() => setDarkMode(!darkMode)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '12px', padding: '8px 12px', cursor: 'pointer',
              color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center',
              transition: 'all 0.2s ease', backdropFilter: 'blur(10px)',
            }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', gap: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px', border: `4px solid ${theme.border}`,
              borderTopColor: theme.primary, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: theme.textSecondary, fontSize: '14px' }}>Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* ── Stat Cards ─────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px', marginBottom: '24px',
            }}>
              <StatCard
                icon="📺" label="Servicios" value={services.length}
                subtitle={`${formatMoney(totalMonthlyCost)}/mes`}
                color={theme.primary} theme={theme}
              />
              <StatCard
                icon="👥" label="Miembros" value={members.length}
                subtitle={`En ${services.length} servicios`}
                color={theme.info} theme={theme}
              />
              <StatCard
                icon={<SolesIcon size={20} color={theme.success} />}
                label="Ingresos" value={formatMoney(totalMonthlyIncome)}
                subtitle="Contribuciones mensuales"
                color={theme.success} theme={theme}
              />
              <StatCard
                icon={monthlyBalance >= 0 ? '📈' : '📉'}
                label="Balance" value={formatMoney(monthlyBalance)}
                subtitle={monthlyBalance >= 0 ? 'Superávit mensual' : 'Déficit mensual'}
                color={monthlyBalance >= 0 ? theme.success : theme.danger} theme={theme}
              />
            </div>

            {/* ── Two Column Layout ──────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px', marginBottom: '24px',
            }}>
              {/* ── LEFT: Services & Members ─────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* ── Add Service Toggle ─────────────────── */}
                <button onClick={() => setShowAddService(!showAddService)} style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  border: `2px dashed ${theme.border}`, background: 'transparent',
                  color: theme.primary, fontSize: '14px', fontWeight: '600',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease',
                }}>
                  <span style={{ fontSize: '20px' }}>{showAddService ? '✕' : '+'}</span>
                  {showAddService ? 'Cerrar formulario' : 'Agregar nuevo servicio'}
                </button>

                {/* ── Add Service Form ────────────────────── */}
                {showAddService && (
                  <div className="animate-slide-down" style={{
                    background: theme.card, borderRadius: '16px', padding: '24px',
                    boxShadow: theme.shadow, border: `1px solid ${theme.border}`,
                  }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: theme.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📺</span> Nuevo Servicio
                    </h3>
                    <form onSubmit={handleAddService} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input
                        type="text" placeholder="Nombre del servicio (ej: Netflix)"
                        value={newService.name}
                        onChange={e => setNewService({ ...newService, name: e.target.value })}
                        style={{
                          padding: '12px 16px', borderRadius: '12px',
                          border: `1px solid ${theme.border}`, background: theme.bg,
                          color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="number" placeholder="Costo mensual (S/)"
                          value={newService.cost} min="0" step="0.01"
                          onChange={e => setNewService({ ...newService, cost: e.target.value })}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: '12px',
                            border: `1px solid ${theme.border}`, background: theme.bg,
                            color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                          }}
                        />
                        <input
                          type="number" placeholder="Día pago" min="1" max="31"
                          value={newService.paymentDay}
                          onChange={e => setNewService({ ...newService, paymentDay: e.target.value })}
                          style={{
                            width: '100px', padding: '12px 16px', borderRadius: '12px',
                            border: `1px solid ${theme.border}`, background: theme.bg,
                            color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                          }}
                        />
                      </div>
                      <button type="submit" disabled={syncing || !newService.name || !newService.cost} style={{
                        padding: '12px', borderRadius: '12px', border: 'none',
                        background: theme.primary, color: '#fff', fontSize: '14px',
                        fontWeight: '600', cursor: syncing ? 'not-allowed' : 'pointer',
                        opacity: syncing || !newService.name || !newService.cost ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                      }}>
                        {syncing ? '⏳ Guardando...' : '✓ Agregar Servicio'}
                      </button>
                    </form>
                  </div>
                )}

                {/* ── Service List ────────────────────────── */}
                {serviceBreakdown.length === 0 ? (
                  <div style={{
                    background: theme.card, borderRadius: '16px', padding: '48px 24px',
                    textAlign: 'center', boxShadow: theme.shadow,
                    border: `1px solid ${theme.border}`,
                  }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📺</span>
                    <p style={{ color: theme.textSecondary, fontSize: '15px', fontWeight: '500' }}>No hay servicios registrados</p>
                    <p style={{ color: theme.textMuted, fontSize: '13px', marginTop: '4px' }}>Agrega tu primer servicio de streaming</p>
                  </div>
                ) : (
                  serviceBreakdown.map(service => (
                    <div key={service.id} className="animate-fade-in" style={{
                      background: theme.card, borderRadius: '16px',
                      boxShadow: theme.shadow, border: `1px solid ${theme.border}`,
                      overflow: 'hidden', transition: 'all 0.3s ease',
                    }}>
                      {/* Service Header */}
                      <div
                        onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                        style={{
                          padding: '20px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '14px',
                            background: `${service.balance >= 0 ? theme.success : theme.danger}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px',
                          }}>
                            📺
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: theme.text }}>{service.name}</div>
                            <div style={{ fontSize: '12px', color: theme.textSecondary, display: 'flex', gap: '12px', marginTop: '2px' }}>
                              <span>💰 {formatMoney(service.cost)}/mes</span>
                              <span>👥 {service.memberCount} miembros</span>
                              <span>📅 Día {service.paymentDay || 1}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                            background: service.balance >= 0 ? theme.successLight : theme.dangerLight,
                            color: service.balance >= 0 ? theme.success : theme.danger,
                          }}>
                            {service.balance >= 0 ? '+' : ''}{formatMoney(service.balance)}
                          </div>
                          <span style={{
                            transition: 'transform 0.3s ease',
                            transform: expandedService === service.id ? 'rotate(180deg)' : 'rotate(0deg)',
                            fontSize: '14px', color: theme.textMuted,
                          }}>▼</span>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedService === service.id && (
                        <div className="animate-slide-down" style={{ borderTop: `1px solid ${theme.border}` }}>
                          {/* Members List */}
                          {service.members.length > 0 ? (
                            <div style={{ padding: '0' }}>
                              {service.members.map((member, idx) => (
                                <div key={member.id} style={{
                                  padding: '14px 20px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  borderBottom: idx < service.members.length - 1 ? `1px solid ${theme.border}` : 'none',
                                  transition: 'background 0.2s ease',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                      width: '34px', height: '34px', borderRadius: '50%',
                                      background: `${theme.primary}15`, display: 'flex',
                                      alignItems: 'center', justifyContent: 'center',
                                      fontSize: '14px', fontWeight: '700', color: theme.primary,
                                    }}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>{member.name}</div>
                                      <div style={{ fontSize: '11px', color: theme.textMuted }}>
                                        📅 Día {member.paymentDay || service.paymentDay || 1}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <PaymentMethodBadge
                                      method={member.paymentMethod || 'efectivo'}
                                      theme={theme}
                                      onClick={() => togglePaymentMethod(member.id, member.paymentMethod || 'efectivo')}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: theme.success }}>
                                      {formatMoney(member.contribution)}
                                    </span>
                                    <button
                                      onClick={() => setConfirmDelete({ type: 'member', id: member.id, name: member.name })}
                                      style={{
                                        background: `${theme.danger}15`, border: 'none',
                                        borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
                                        color: theme.danger, fontSize: '12px', transition: 'all 0.2s ease',
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                              <p style={{ color: theme.textMuted, fontSize: '13px' }}>Sin miembros asignados</p>
                            </div>
                          )}

                          {/* Add Member Form */}
                          <div style={{
                            padding: '16px 20px', borderTop: `1px solid ${theme.border}`,
                            background: `${theme.bg}80`,
                          }}>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              setNewMember(prev => ({ ...prev, serviceId: service.id }));
                              setTimeout(() => {
                                const form = e.target;
                                const nameInput = form.querySelector('input[placeholder="Nombre"]');
                                const contribInput = form.querySelector('input[placeholder="Aporte (S/)"]');
                                if (nameInput.value && contribInput.value) {
                                  const memberData = {
                                    serviceId: service.id,
                                    name: nameInput.value,
                                    contribution: contribInput.value,
                                    paymentDay: form.querySelector('input[placeholder="Día"]')?.value || String(service.paymentDay || 1),
                                    paymentMethod: 'yape',
                                  };
                                  const isDup = members.some(
                                    m => m.serviceId === service.id && m.name.toLowerCase() === memberData.name.toLowerCase()
                                  );
                                  if (isDup) {
                                    showToast(`"${memberData.name}" ya está en ${service.name}.`);
                                    return;
                                  }
                                  setSyncing(true);
                                  addDoc(collection(db, 'members'), {
                                    serviceId: memberData.serviceId,
                                    name: memberData.name,
                                    contribution: Number(memberData.contribution),
                                    paymentDay: Number(memberData.paymentDay),
                                    paymentMethod: memberData.paymentMethod,
                                  }).then(() => {
                                    nameInput.value = '';
                                    contribInput.value = '';
                                    showToast('Miembro agregado correctamente.', 'success');
                                  }).catch(err => {
                                    showToast('Error al agregar miembro: ' + err.message);
                                  }).finally(() => setSyncing(false));
                                }
                              }, 0);
                            }} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                type="text" placeholder="Nombre"
                                style={{
                                  flex: '1 1 100px', padding: '10px 12px', borderRadius: '10px',
                                  border: `1px solid ${theme.border}`, background: theme.card,
                                  color: theme.text, fontSize: '13px', minWidth: '80px',
                                  transition: 'all 0.2s ease',
                                }}
                              />
                              <input
                                type="number" placeholder="Aporte (S/)" min="0" step="0.01"
                                style={{
                                  flex: '0 1 100px', padding: '10px 12px', borderRadius: '10px',
                                  border: `1px solid ${theme.border}`, background: theme.card,
                                  color: theme.text, fontSize: '13px', minWidth: '80px',
                                  transition: 'all 0.2s ease',
                                }}
                              />
                              <input
                                type="number" placeholder="Día" min="1" max="31"
                                defaultValue={service.paymentDay || 1}
                                style={{
                                  flex: '0 1 60px', padding: '10px 12px', borderRadius: '10px',
                                  border: `1px solid ${theme.border}`, background: theme.card,
                                  color: theme.text, fontSize: '13px', minWidth: '50px',
                                  transition: 'all 0.2s ease',
                                }}
                              />
                              <button type="submit" disabled={syncing} style={{
                                padding: '10px 16px', borderRadius: '10px', border: 'none',
                                background: theme.primary, color: '#fff', fontSize: '13px',
                                fontWeight: '600', cursor: syncing ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                                opacity: syncing ? 0.6 : 1,
                              }}>
                                {syncing ? '⏳' : '+ Agregar'}
                              </button>
                            </form>
                          </div>

                          {/* Delete Service Button */}
                          <div style={{
                            padding: '12px 20px', borderTop: `1px solid ${theme.border}`,
                            display: 'flex', justifyContent: 'flex-end',
                          }}>
                            <button
                              onClick={() => setConfirmDelete({ type: 'service', id: service.id, name: service.name })}
                              disabled={syncing}
                              style={{
                                padding: '8px 16px', borderRadius: '10px', border: 'none',
                                background: `${theme.danger}15`, color: theme.danger,
                                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s ease', opacity: syncing ? 0.6 : 1,
                              }}
                            >
                              🗑️ Eliminar servicio
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* ── RIGHT: Analysis Panels ───────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* ── Smart Analysis ─────────────────────── */}
                <AnalysisCard icon="🧠" title="Análisis Inteligente" theme={theme} color={theme.primary}>
                  {smartAnalysis.length === 0 ? (
                    <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                      Agrega servicios y miembros para ver análisis
                    </p>
                  ) : (
                    <div className="custom-scrollbar" style={{
                      display: 'flex', flexDirection: 'column', gap: '10px',
                      maxHeight: '300px', overflowY: 'auto', paddingRight: '4px',
                    }}>
                      {smartAnalysis.map((insight, i) => (
                        <div key={i} style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: insight.type === 'success' ? theme.successLight :
                                     insight.type === 'warning' ? theme.warningLight :
                                     insight.type === 'danger' ? theme.dangerLight : theme.infoLight,
                          border: `1px solid ${
                            insight.type === 'success' ? theme.success :
                            insight.type === 'warning' ? theme.warning :
                            insight.type === 'danger' ? theme.danger : theme.info
                          }25`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '16px', flexShrink: 0 }}>{insight.icon}</span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text }}>
                                {insight.text}
                              </div>
                              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>
                                {insight.detail}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AnalysisCard>

                {/* ── Service Breakdown ───────────────────── */}
                <AnalysisCard icon="📊" title="Desglose por Servicio" theme={theme} color={theme.info}>
                  {serviceBreakdown.length === 0 ? (
                    <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                      Sin datos disponibles
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {serviceBreakdown.map(s => {
                        const percentage = s.cost > 0 ? Math.min((s.totalContributions / s.cost) * 100, 100) : 0;
                        return (
                          <div key={s.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: theme.text }}>{s.name}</span>
                              <span style={{
                                fontSize: '12px', fontWeight: '700',
                                color: s.balance >= 0 ? theme.success : theme.danger,
                              }}>
                                {formatMoney(s.totalContributions)} / {formatMoney(s.cost)}
                              </span>
                            </div>
                            <div style={{
                              height: '8px', borderRadius: '4px',
                              background: `${theme.border}80`, overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%', borderRadius: '4px',
                                width: `${percentage}%`,
                                background: percentage >= 100
                                  ? `linear-gradient(90deg, ${theme.success}, #34d399)`
                                  : percentage >= 50
                                  ? `linear-gradient(90deg, ${theme.warning}, #fbbf24)`
                                  : `linear-gradient(90deg, ${theme.danger}, #f87171)`,
                                transition: 'width 0.5s ease',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AnalysisCard>

                {/* ── Payment Methods ────────────────────── */}
                <AnalysisCard icon="💳" title="Métodos de Pago" theme={theme} color="#7c3aed">
                  {members.length === 0 ? (
                    <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                      Sin miembros registrados
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {Object.entries(paymentMethodStats).map(([method, count]) => {
                        const config = {
                          yape: { icon: '📱', label: 'Yape', color: '#7c3aed' },
                          plin: { icon: '💳', label: 'Plin', color: '#0ea5e9' },
                          efectivo: { icon: '💵', label: 'Efectivo', color: '#f59e0b' },
                          transferencia: { icon: '🏦', label: 'Transfer.', color: '#10b981' },
                        };
                        const c = config[method] || config.efectivo;
                        return (
                          <div key={method} style={{
                            padding: '12px', borderRadius: '12px',
                            background: `${c.color}10`, border: `1px solid ${c.color}25`,
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{c.icon}</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: c.color }}>{count}</div>
                            <div style={{ fontSize: '11px', color: theme.textSecondary }}>{c.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AnalysisCard>

                {/* ── Upcoming Payments ───────────────────── */}
                <AnalysisCard icon="📅" title="Próximos Eventos" theme={theme} color={theme.warning}>
                  {upcomingPayments.length === 0 ? (
                    <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                      Sin eventos próximos
                    </p>
                  ) : (
                    <div className="custom-scrollbar" style={{
                      display: 'flex', flexDirection: 'column', gap: '8px',
                      maxHeight: '250px', overflowY: 'auto', paddingRight: '4px',
                    }}>
                      {upcomingPayments.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: '10px',
                          background: p.daysUntil <= 3 ? `${theme.danger}10` : `${theme.bg}80`,
                          border: `1px solid ${p.daysUntil <= 3 ? theme.danger : theme.border}25`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '16px' }}>
                              {p.type === 'service' ? '📺' : '👤'}
                            </span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: theme.textMuted }}>
                                Día {p.day} {p.serviceName ? `(${p.serviceName})` : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: p.type === 'service' ? theme.danger : theme.success }}>
                              {formatMoney(p.amount)}
                            </div>
                            <div style={{
                              fontSize: '10px', fontWeight: '600',
                              color: p.daysUntil <= 3 ? theme.danger : theme.textMuted,
                            }}>
                              {p.daysUntil === 0 ? '¡Hoy!' : `En ${p.daysUntil} días`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AnalysisCard>
              </div>
            </div>

            {/* ── Calendar Section ────────────────────────── */}
            <AnalysisCard icon="🗓️" title="Calendario de Pagos del Mes" theme={theme} color={theme.primary}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '8px',
              }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const data = calendarData[day];
                  const today = new Date().getDate();
                  const isToday = day === today;
                  const hasEvents = data && (data.payments.length > 0 || data.collections.length > 0);

                  return (
                    <div key={day} style={{
                      padding: '8px', borderRadius: '10px', textAlign: 'center',
                      background: isToday ? `${theme.primary}20` : hasEvents ? `${theme.warning}10` : `${theme.bg}50`,
                      border: `1px solid ${isToday ? theme.primary : hasEvents ? `${theme.warning}30` : theme.border}`,
                      position: 'relative', minHeight: '60px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }} title={
                      data
                        ? `Pagos: ${data.payments.map(p => p.name).join(', ')}\nCobros: ${data.collections.map(c => c.name).join(', ')}`
                        : `Día ${day}`
                    }>
                      <div style={{
                        fontSize: '16px', fontWeight: isToday ? '800' : '600',
                        color: isToday ? theme.primary : theme.text,
                      }}>
                        {day}
                      </div>
                      {data && (
                        <div style={{ display: 'flex', gap: '3px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {data.payments.map((_, idx) => (
                            <div key={`p-${idx}`} style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: theme.danger,
                            }} />
                          ))}
                          {data.collections.map((_, idx) => (
                            <div key={`c-${idx}`} style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: theme.success,
                            }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{
                display: 'flex', gap: '16px', marginTop: '16px',
                justifyContent: 'center', fontSize: '12px', color: theme.textSecondary,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.danger }} />
                  Pagos (gastos)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.success }} />
                  Cobros (ingresos)
                </div>
              </div>
            </AnalysisCard>

            {/* ── PD (Por Distribuir) Panel ───────────────── */}
            <div style={{ marginTop: '24px' }}>
              <AnalysisCard icon="📐" title="Distribución Sugerida (PD)" theme={theme} color="#8b5cf6">
                {pdData.length === 0 ? (
                  <p style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                    Agrega servicios para ver la distribución sugerida
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {pdData.map(s => (
                      <div key={s.id} style={{
                        padding: '16px', borderRadius: '14px',
                        background: `${theme.bg}80`, border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: theme.text }}>
                            📺 {s.name}
                          </div>
                          <div style={{
                            fontSize: '12px', fontWeight: '600',
                            padding: '3px 10px', borderRadius: '8px',
                            background: s.isEven ? theme.successLight : theme.warningLight,
                            color: s.isEven ? theme.success : theme.warning,
                          }}>
                            {s.isEven ? '✅ Equitativo' : '⚠️ Desigual'}
                          </div>
                        </div>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px', fontSize: '12px',
                        }}>
                          <div style={{ textAlign: 'center', padding: '8px', borderRadius: '10px', background: `${theme.info}10` }}>
                            <div style={{ color: theme.textMuted, marginBottom: '2px' }}>Costo total</div>
                            <div style={{ fontWeight: '700', color: theme.text }}>{formatMoney(s.cost)}</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '8px', borderRadius: '10px', background: `${theme.success}10` }}>
                            <div style={{ color: theme.textMuted, marginBottom: '2px' }}>Por persona</div>
                            <div style={{ fontWeight: '700', color: theme.success }}>
                              {s.memberCount > 0 ? formatMoney(s.suggestedContribution) : 'N/A'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '8px', borderRadius: '10px', background: `${theme.primary}10` }}>
                            <div style={{ color: theme.textMuted, marginBottom: '2px' }}>Miembros</div>
                            <div style={{ fontWeight: '700', color: theme.primary }}>{s.memberCount}</div>
                          </div>
                        </div>

                        {/* Member contributions vs suggested */}
                        {s.members.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {s.members.map(m => {
                              const diff = Number(m.contribution) - s.suggestedContribution;
                              return (
                                <div key={m.id} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '6px 10px', borderRadius: '8px',
                                  background: diff === 0 ? `${theme.success}08` : diff > 0 ? `${theme.info}08` : `${theme.warning}08`,
                                  fontSize: '12px',
                                }}>
                                  <span style={{ color: theme.text, fontWeight: '500' }}>{m.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: theme.textSecondary }}>{formatMoney(m.contribution)}</span>
                                    {diff !== 0 && (
                                      <span style={{
                                        fontSize: '10px', fontWeight: '700',
                                        color: diff > 0 ? theme.info : theme.warning,
                                        padding: '1px 6px', borderRadius: '4px',
                                        background: diff > 0 ? `${theme.info}15` : `${theme.warning}15`,
                                      }}>
                                        {diff > 0 ? '+' : ''}{formatMoney(diff)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </AnalysisCard>
            </div>

            {/* ── Add Member Form (Global) ───────────────── */}
            {services.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div className="animate-slide-up" style={{
                  background: theme.card, borderRadius: '16px', padding: '24px',
                  boxShadow: theme.shadow, border: `1px solid ${theme.border}`,
                }}>
                  <h3 style={{
                    margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: theme.text,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span>👤</span> Agregar Miembro
                  </h3>
                  <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                      value={newMember.serviceId}
                      onChange={e => {
                        const svc = services.find(s => s.id === e.target.value);
                        setNewMember({
                          ...newMember,
                          serviceId: e.target.value,
                          paymentDay: svc ? String(svc.paymentDay || 1) : '',
                        });
                      }}
                      style={{
                        padding: '12px 16px', borderRadius: '12px',
                        border: `1px solid ${theme.border}`, background: theme.bg,
                        color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                      }}
                    >
                      <option value="">Seleccionar servicio...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} - {formatMoney(s.cost)}/mes</option>
                      ))}
                    </select>
                    <input
                      type="text" placeholder="Nombre del miembro"
                      value={newMember.name}
                      onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                      style={{
                        padding: '12px 16px', borderRadius: '12px',
                        border: `1px solid ${theme.border}`, background: theme.bg,
                        color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="number" placeholder="Aporte mensual (S/)" min="0" step="0.01"
                        value={newMember.contribution}
                        onChange={e => setNewMember({ ...newMember, contribution: e.target.value })}
                        style={{
                          flex: 1, padding: '12px 16px', borderRadius: '12px',
                          border: `1px solid ${theme.border}`, background: theme.bg,
                          color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                        }}
                      />
                      <input
                        type="number" placeholder="Día de pago" min="1" max="31"
                        value={newMember.paymentDay}
                        onChange={e => setNewMember({ ...newMember, paymentDay: e.target.value })}
                        style={{
                          width: '120px', padding: '12px 16px', borderRadius: '12px',
                          border: `1px solid ${theme.border}`, background: theme.bg,
                          color: theme.text, fontSize: '14px', transition: 'all 0.2s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['yape', 'plin', 'efectivo', 'transferencia'].map(method => {
                        const config = {
                          yape: { icon: '📱', label: 'Yape', color: '#7c3aed' },
                          plin: { icon: '💳', label: 'Plin', color: '#0ea5e9' },
                          efectivo: { icon: '💵', label: 'Efectivo', color: '#f59e0b' },
                          transferencia: { icon: '🏦', label: 'Transfer.', color: '#10b981' },
                        };
                        const c = config[method];
                        const isActive = newMember.paymentMethod === method;
                        return (
                          <button
                            key={method} type="button"
                            onClick={() => setNewMember({ ...newMember, paymentMethod: method })}
                            style={{
                              padding: '8px 14px', borderRadius: '10px',
                              border: `2px solid ${isActive ? c.color : theme.border}`,
                              background: isActive ? `${c.color}15` : 'transparent',
                              color: isActive ? c.color : theme.textSecondary,
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '6px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span>{c.icon}</span> {c.label}
                          </button>
                        );
                      })}
                    </div>
                    <button type="submit" disabled={syncing || !newMember.serviceId || !newMember.name || !newMember.contribution} style={{
                      padding: '12px', borderRadius: '12px', border: 'none',
                      background: theme.primary, color: '#fff', fontSize: '14px',
                      fontWeight: '600', cursor: syncing ? 'not-allowed' : 'pointer',
                      opacity: syncing || !newMember.serviceId || !newMember.name || !newMember.contribution ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}>
                      {syncing ? '⏳ Guardando...' : '✓ Agregar Miembro'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Footer ─────────────────────────────────── */}
            <footer style={{
              textAlign: 'center', padding: '32px 0 16px',
              color: theme.textMuted, fontSize: '12px',
            }}>
              <p>Gestor de Streaming © {new Date().getFullYear()} — Datos en tiempo real con Firebase</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
