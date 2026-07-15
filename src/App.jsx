import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  onSnapshot
} from 'firebase/firestore';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Tv,
  Users,
  Mail,
  Plus,
  Trash2,
  Check,
  X,
  Filter,
  Calendar,
  Sliders,
  Info,
  AlertTriangle,
  Search,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Link2,
  Lock,
  Wallet,
  PieChart,
  UserPlus,
  ArrowRight,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';

// Categorías de transacciones generales
const CATEGORIES = [
  { id: 'Alimentación', label: 'Alimentación', icon: '🍔', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  { id: 'Transporte', label: 'Transporte', icon: '🚗', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20' },
  { id: 'Hogar', label: 'Hogar', icon: '🏠', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20' },
  { id: 'Servicios', label: 'Servicios', icon: '🔌', color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20' },
  { id: 'Entretenimiento', label: 'Entretenimiento', icon: '📺', color: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/20' },
  { id: 'Salud', label: 'Salud', icon: '🏥', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20' },
  { id: 'Otros', label: 'Otros', icon: '📦', color: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500/20' }
];

const formatMoney = (amount) => {
  return `S/ ${Number(amount || 0).toFixed(2)}`;
};

export default function App() {
  // ─── 1. STATE MANAGEMENT ─────────────────────────────────
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'transacciones' | 'streaming' | 'conexiones'
  const [services, setServices] = useState([]);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gmailRules, setGmailRules] = useState([]);
  
  // Gmail simulation states
  const [isGmailConnected, setIsGmailConnected] = useState(() => {
    const saved = localStorage.getItem('gmail_connected');
    return saved ? JSON.parse(saved) : true;
  });
  const [gmailLogs, setGmailLogs] = useState(() => {
    const saved = localStorage.getItem('gmail_logs');
    return saved ? JSON.parse(saved) : [
      { id: 1, time: 'Hace 10 min', text: 'Sincronización inicial exitosa.' },
      { id: 2, time: 'Hace 5 min', text: 'Bandeja al día. Sin correos nuevos de emisores permitidos.' }
    ];
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'connecting' | 'error'
  const [toast, setToast] = useState(null);
  
  // Forms & Modal controls
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [expandedService, setExpandedService] = useState(null);

  // Form states
  const [newTx, setNewTx] = useState({ description: '', amount: '', type: 'expense', category: 'Alimentación', date: new Date().toISOString().split('T')[0] });
  const [newSvc, setNewSvc] = useState({ name: '', cost: '', paymentDay: '1' });
  const [newRule, setNewRule] = useState({ name: '', sender: '', category: 'Otros', type: 'expense' });
  
  // Filters
  const [txFilterCategory, setTxFilterCategory] = useState('Todos');
  const [txSearch, setTxSearch] = useState('');

  // Simulator states
  const [simAdditionalIncome, setSimAdditionalIncome] = useState(0);
  const [simExpenseReduction, setSimExpenseReduction] = useState(0);
  const [simSavingsGoal, setSimSavingsGoal] = useState(200);
  const [simCanceledServices, setSimCanceledServices] = useState({}); // { serviceId: boolean }

  // ─── Helper: Show Toast ──────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── 2. FIRESTORE REAL-TIME SYNC & LOCALSTORAGE BACKUPS ───
  useEffect(() => {
    setLoading(true);

    // Load LocalStorage backups first for instant loading representation
    try {
      const backupServices = localStorage.getItem('backup_services');
      const backupMembers = localStorage.getItem('backup_members');
      const backupTransactions = localStorage.getItem('backup_transactions');
      const backupRules = localStorage.getItem('backup_gmail_rules');

      if (backupServices) setServices(JSON.parse(backupServices));
      if (backupMembers) setMembers(JSON.parse(backupMembers));
      if (backupTransactions) setTransactions(JSON.parse(backupTransactions));
      if (backupRules) setGmailRules(JSON.parse(backupRules));
    } catch (e) {
      console.error('Error cargando backups locales:', e);
    }

    // A) Services Listener
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(data);
      localStorage.setItem('backup_services', JSON.stringify(data));
      setConnectionStatus('connected');
      setLoading(false);
    }, (error) => {
      console.error('Error en snapshot servicios:', error);
      setConnectionStatus('error');
      setLoading(false);
    });

    // B) Members Listener
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(data);
      localStorage.setItem('backup_members', JSON.stringify(data));
    }, (error) => console.error('Error en snapshot miembros:', error));

    // C) Transactions Listener
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar por fecha descendente
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sorted);
      localStorage.setItem('backup_transactions', JSON.stringify(sorted));
    }, (error) => console.error('Error en snapshot transacciones:', error));

    // D) Gmail Rules Listener (with pre-population if empty)
    const unsubRules = onSnapshot(collection(db, 'gmail_rules'), async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (data.length === 0) {
        // Pre-populamos reglas por defecto
        const defaultRules = [
          { sender: 'no-reply@yape.com.pe', name: 'Yape', category: 'Otros', type: 'income', active: true },
          { sender: 'alertas@plin.pe', name: 'Plin', category: 'Otros', type: 'income', active: true },
          { sender: 'bcpnet@bcp.com.pe', name: 'BCP', category: 'Servicios', type: 'expense', active: true },
          { sender: 'info@account.netflix.com', name: 'Netflix', category: 'Entretenimiento', type: 'expense', active: true }
        ];
        
        try {
          for (const rule of defaultRules) {
            await addDoc(collection(db, 'gmail_rules'), rule);
          }
          showToast('Reglas predeterminadas configuradas.', 'info');
        } catch (err) {
          console.error('Error pre-populando reglas:', err);
        }
      } else {
        setGmailRules(data);
        localStorage.setItem('backup_gmail_rules', JSON.stringify(data));
      }
    }, (error) => {
      console.error('Error en snapshot gmail_rules:', error);
      // Fallback a localStorage si falla
      const backup = localStorage.getItem('backup_gmail_rules');
      if (backup) setGmailRules(JSON.parse(backup));
    });

    return () => {
      unsubServices();
      unsubMembers();
      unsubTransactions();
      unsubRules();
    };
  }, [showToast]);

  // Guardar estado de conexión de gmail en localStorage
  useEffect(() => {
    localStorage.setItem('gmail_connected', JSON.stringify(isGmailConnected));
  }, [isGmailConnected]);

  // Guardar logs de gmail en localStorage
  useEffect(() => {
    localStorage.setItem('gmail_logs', JSON.stringify(gmailLogs));
  }, [gmailLogs]);

  // ─── 3. COMPUTED VARIABLES & DATA INTEGRATION ───────────
  // A) Calcular costo total de streaming
  const totalStreamingCost = useMemo(() => {
    return services.reduce((sum, s) => sum + Number(s.cost || 0), 0);
  }, [services]);

  // B) Calcular aportes totales de los miembros
  const totalMembersContributions = useMemo(() => {
    return members.reduce((sum, m) => sum + Number(m.contribution || 0), 0);
  }, [members]);

  // C) Integración dinámica de Streaming en Gastos ('Entretenimiento')
  // Combinamos las transacciones reales con el gasto de streaming calculado
  const integratedTransactions = useMemo(() => {
    const list = [...transactions];
    if (totalStreamingCost > 0) {
      // Inyectamos dinámicamente un gasto mensual ficticio / virtual bajo la categoría de 'Entretenimiento'
      list.push({
        id: 'virtual-streaming-expense',
        description: 'Gastos de Streaming (Suscripciones)',
        amount: totalStreamingCost,
        type: 'expense',
        category: 'Entretenimiento',
        date: new Date().toISOString().split('T')[0], // hoy
        day: new Date().getDate(),
        isVirtual: true
      });
    }
    
    // Inyectamos también los aportes de los miembros como ingresos en 'Otros' o una categoría virtual de aportes
    if (totalMembersContributions > 0) {
      list.push({
        id: 'virtual-streaming-income',
        description: 'Aportes de Miembros (Streaming)',
        amount: totalMembersContributions,
        type: 'income',
        category: 'Otros',
        date: new Date().toISOString().split('T')[0],
        day: new Date().getDate(),
        isVirtual: true
      });
    }

    return list;
  }, [transactions, totalStreamingCost, totalMembersContributions]);

  // D) Resumen financiero consolidado
  const financialSummary = useMemo(() => {
    let income = 0;
    let expense = 0;

    integratedTransactions.forEach(t => {
      if (t.type === 'income') {
        income += Number(t.amount || 0);
      } else {
        expense += Number(t.amount || 0);
      }
    });

    const balance = income - expense;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    return { income, expense, balance, savingsRate };
  }, [integratedTransactions]);

  // E) Desglose de Gastos por Categoría
  const categoryBreakdown = useMemo(() => {
    const totals = {};
    CATEGORIES.forEach(c => {
      totals[c.id] = 0;
    });

    let totalExpensesOnly = 0;
    integratedTransactions.forEach(t => {
      if (t.type === 'expense') {
        const amt = Number(t.amount || 0);
        totals[t.category] = (totals[t.category] || 0) + amt;
        totalExpensesOnly += amt;
      }
    });

    return {
      totals,
      total: totalExpensesOnly,
      percentages: Object.keys(totals).reduce((acc, cat) => {
        acc[cat] = totalExpensesOnly > 0 ? (totals[cat] / totalExpensesOnly) * 100 : 0;
        return acc;
      }, {})
    };
  }, [integratedTransactions]);

  // F) Próximos cobros y pagos de streaming ordenados por días restantes
  const upcomingStreamingEvents = useMemo(() => {
    const today = new Date().getDate();
    const list = [];

    services.forEach(s => {
      const pDay = Number(s.paymentDay || 1);
      let diff = pDay - today;
      if (diff < 0) diff += 30; // ciclo mensual aproximado
      list.push({
        id: `svc-${s.id}`,
        name: `Pago ${s.name}`,
        amount: s.cost,
        type: 'expense',
        day: pDay,
        daysRemaining: diff
      });
    });

    members.forEach(m => {
      const svc = services.find(s => s.id === m.serviceId);
      const pDay = Number(m.paymentDay || svc?.paymentDay || 1);
      let diff = pDay - today;
      if (diff < 0) diff += 30;
      list.push({
        id: `mem-${m.id}`,
        name: `Cobro a ${m.name} (${svc?.name || 'Streaming'})`,
        amount: m.contribution,
        type: 'income',
        day: pDay,
        daysRemaining: diff
      });
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [services, members]);

  // G) Transacciones del día seleccionado (Horizontal Scroll)
  const selectedDayEvents = useMemo(() => {
    return integratedTransactions.filter(t => {
      const txDay = Number(t.day || (t.date ? new Date(t.date).getDate() + 1 : 1));
      return txDay === selectedDay;
    });
  }, [integratedTransactions, selectedDay]);

  // H) Indicadores en el Calendario de días
  const dayIndicators = useMemo(() => {
    const indicators = {};
    integratedTransactions.forEach(t => {
      const txDay = Number(t.day || (t.date ? new Date(t.date).getDate() + 1 : 1));
      if (!indicators[txDay]) {
        indicators[txDay] = { income: false, expense: false };
      }
      if (t.type === 'income') indicators[txDay].income = true;
      if (t.type === 'expense') indicators[txDay].expense = true;
    });
    return indicators;
  }, [integratedTransactions]);

  // I) Desglose por Cuenta de Streaming (Costo vs Aporte)
  const streamingServiceDetails = useMemo(() => {
    return services.map(s => {
      const svcMembers = members.filter(m => m.serviceId === s.id);
      const totalCont = svcMembers.reduce((sum, m) => sum + Number(m.contribution || 0), 0);
      const netBalance = totalCont - Number(s.cost || 0);
      const costPerMember = svcMembers.length > 0 ? Number(s.cost) / (svcMembers.length + 1) : Number(s.cost);

      return {
        ...s,
        members: svcMembers,
        totalContributions: totalCont,
        netBalance,
        costPerMember,
        memberCount: svcMembers.length
      };
    });
  }, [services, members]);

  // J) Simulador Financiero en Tiempo Real
  const simulationResult = useMemo(() => {
    // Ingresos base
    let projectedIncome = financialSummary.income + Number(simAdditionalIncome || 0);

    // Gastos base calculando qué servicios de streaming están "cancelados" en el simulador
    let simulatedStreamingCost = 0;
    let simulatedStreamingIncome = 0;
    
    services.forEach(s => {
      if (!simCanceledServices[s.id]) {
        simulatedStreamingCost += Number(s.cost || 0);
        // Sumar aportes de miembros correspondientes a servicios activos
        const svcMembers = members.filter(m => m.serviceId === s.id);
        simulatedStreamingIncome += svcMembers.reduce((sum, m) => sum + Number(m.contribution || 0), 0);
      }
    });

    // Gastos generales sin el streaming inyectado
    let baseGeneralExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Aplicar reducción simulada de gastos generales
    let projectedGeneralExpenses = Math.max(0, baseGeneralExpenses - Number(simExpenseReduction || 0));

    // Consolidado simulado
    let totalProjectedExpenses = projectedGeneralExpenses + simulatedStreamingCost;
    let totalProjectedIncomes = (financialSummary.income - totalMembersContributions) + simulatedStreamingIncome + Number(simAdditionalIncome || 0);
    
    let projectedBalance = totalProjectedIncomes - totalProjectedExpenses;
    let goalDiff = projectedBalance - simSavingsGoal;

    return {
      projectedIncome: totalProjectedIncomes,
      projectedExpense: totalProjectedExpenses,
      projectedBalance,
      goalAchieved: goalDiff >= 0,
      goalDiff: Math.abs(goalDiff)
    };
  }, [financialSummary, transactions, services, members, simAdditionalIncome, simExpenseReduction, simSavingsGoal, simCanceledServices, totalMembersContributions]);


  // ─── 4. CRUD OPERATIONS (FIREBASE & FAILSAFE LOCAL) ──────
  // A) Crear Transacción General
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTx.description || !newTx.amount) {
      showToast('Por favor, ingresa descripción y monto.', 'error');
      return;
    }

    const txDay = Number(newTx.date.split('-')[2]);

    const txData = {
      description: newTx.description.trim(),
      amount: Number(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      date: newTx.date,
      day: txDay
    };

    try {
      await addDoc(collection(db, 'transactions'), txData);
      showToast('Transacción registrada con éxito.');
      setNewTx({
        description: '',
        amount: '',
        type: 'expense',
        category: 'Alimentación',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddTransaction(false);
    } catch (err) {
      console.error(err);
      // Guardar en state local temporalmente si no hay conexión
      const offlineTx = { id: `offline-${Date.now()}`, ...txData };
      const updated = [offlineTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('backup_transactions', JSON.stringify(updated));
      showToast('Guardado localmente (Sin conexión a base de datos).', 'info');
      setShowAddTransaction(false);
    }
  };

  // B) Eliminar Transacción
  const triggerDeleteTransaction = (tx) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Transacción?',
      message: `¿Estás seguro de que deseas eliminar "${tx.description}" por ${formatMoney(tx.amount)}?`,
      onConfirm: async () => {
        try {
          if (tx.id.startsWith('offline-')) {
            const updated = transactions.filter(t => t.id !== tx.id);
            setTransactions(updated);
            localStorage.setItem('backup_transactions', JSON.stringify(updated));
          } else {
            await deleteDoc(doc(db, 'transactions', tx.id));
          }
          showToast('Transacción eliminada.');
        } catch (err) {
          showToast('Error al eliminar transacción.', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // C) Crear Servicio de Streaming
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newSvc.name || !newSvc.cost) {
      showToast('Falta el nombre o el costo mensual.', 'error');
      return;
    }

    const svcData = {
      name: newSvc.name.trim(),
      cost: Number(newSvc.cost),
      paymentDay: Number(newSvc.paymentDay || 1)
    };

    try {
      await addDoc(collection(db, 'services'), svcData);
      showToast(`Servicio "${svcData.name}" agregado.`);
      setNewSvc({ name: '', cost: '', paymentDay: '1' });
      setShowAddService(false);
    } catch (err) {
      console.error(err);
      const offlineSvc = { id: `offline-${Date.now()}`, ...svcData };
      const updated = [...services, offlineSvc];
      setServices(updated);
      localStorage.setItem('backup_services', JSON.stringify(updated));
      showToast('Servicio guardado localmente (Offline).', 'info');
      setShowAddService(false);
    }
  };

  // D) Eliminar Servicio
  const triggerDeleteService = (svc) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar cuenta de Streaming?',
      message: `Esta acción también dará de baja a los miembros asociados de la suscripción de "${svc.name}".`,
      onConfirm: async () => {
        try {
          if (svc.id.startsWith('offline-')) {
            setServices(services.filter(s => s.id !== svc.id));
            setMembers(members.filter(m => m.serviceId !== svc.id));
          } else {
            // Eliminar servicio de firestore
            await deleteDoc(doc(db, 'services', svc.id));
            
            // Eliminar miembros asociados
            const assocMembers = members.filter(m => m.serviceId === svc.id);
            for (const member of assocMembers) {
              await deleteDoc(doc(db, 'members', member.id));
            }
          }
          showToast('Servicio y miembros asociados eliminados.');
        } catch (err) {
          showToast('Error al eliminar servicio.', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // E) Agregar Miembro a Servicio
  const handleAddMember = async (serviceId, e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.memberName.value.trim();
    const contr = form.memberContribution.value;
    const pDay = form.memberPaymentDay.value;

    if (!name || !contr) {
      showToast('Falta el nombre o aporte del miembro.', 'error');
      return;
    }

    const memberData = {
      serviceId,
      name,
      contribution: Number(contr),
      paymentDay: Number(pDay || 1),
      paymentMethod: 'yape' // por defecto
    };

    try {
      await addDoc(collection(db, 'members'), memberData);
      showToast(`Miembro "${name}" asignado.`);
      form.reset();
    } catch (err) {
      console.error(err);
      const offlineMem = { id: `offline-${Date.now()}`, ...memberData };
      const updated = [...members, offlineMem];
      setMembers(updated);
      localStorage.setItem('backup_members', JSON.stringify(updated));
      showToast('Miembro agregado en almacenamiento local.', 'info');
      form.reset();
    }
  };

  // F) Eliminar Miembro
  const triggerDeleteMember = (mem) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Retirar Miembro?',
      message: `¿Estás seguro de que deseas retirar a "${mem.name}" del servicio de streaming?`,
      onConfirm: async () => {
        try {
          if (mem.id.startsWith('offline-')) {
            setMembers(members.filter(m => m.id !== mem.id));
          } else {
            await deleteDoc(doc(db, 'members', mem.id));
          }
          showToast('Miembro eliminado.');
        } catch (err) {
          showToast('Error al retirar miembro.', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // G) Cambiar Método de Pago del Miembro (Yape, Plin, Efectivo, Transferencia)
  const togglePaymentMethod = async (mem) => {
    const methods = ['yape', 'plin', 'efectivo', 'transferencia'];
    const nextIdx = (methods.indexOf(mem.paymentMethod || 'yape') + 1) % methods.length;
    const nextMethod = methods[nextIdx];

    try {
      if (mem.id.startsWith('offline-')) {
        const updated = members.map(m => m.id === mem.id ? { ...m, paymentMethod: nextMethod } : m);
        setMembers(updated);
        localStorage.setItem('backup_members', JSON.stringify(updated));
      } else {
        await updateDoc(doc(db, 'members', mem.id), { paymentMethod: nextMethod });
      }
      showToast(`Método actualizado a ${nextMethod.toUpperCase()}`);
    } catch (err) {
      showToast('Error al cambiar método de pago.', 'error');
    }
  };

  // H) Gmail: Cambiar estado Activo/Inactivo de Regla
  const toggleRuleActive = async (rule) => {
    try {
      await updateDoc(doc(db, 'gmail_rules', rule.id), { active: !rule.active });
      showToast(`Regla ${rule.name} ${!rule.active ? 'activada' : 'desactivada'}.`);
    } catch (err) {
      console.error(err);
      // Fallback local
      const updated = gmailRules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r);
      setGmailRules(updated);
      localStorage.setItem('backup_gmail_rules', JSON.stringify(updated));
      showToast('Cambio guardado localmente.', 'info');
    }
  };

  // I) Gmail: Agregar Nueva Regla de Emisor
  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.name || !newRule.sender) {
      showToast('Nombre y emisor son obligatorios.', 'error');
      return;
    }

    const ruleData = {
      name: newRule.name.trim(),
      sender: newRule.sender.trim().toLowerCase(),
      category: newRule.category,
      type: newRule.type,
      active: true
    };

    try {
      await addDoc(collection(db, 'gmail_rules'), ruleData);
      showToast(`Regla para "${ruleData.name}" agregada.`);
      setNewRule({ name: '', sender: '', category: 'Otros', type: 'expense' });
      setShowAddRule(false);
    } catch (err) {
      console.error(err);
      const offlineRule = { id: `offline-${Date.now()}`, ...ruleData };
      const updated = [...gmailRules, offlineRule];
      setGmailRules(updated);
      localStorage.setItem('backup_gmail_rules', JSON.stringify(updated));
      showToast('Regla guardada localmente.', 'info');
      setShowAddRule(false);
    }
  };

  // J) Gmail: Eliminar Regla
  const triggerDeleteRule = (rule) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Regla de Correo?',
      message: `Se dejarán de analizar automáticamente los correos que provengan de "${rule.sender}".`,
      onConfirm: async () => {
        try {
          if (rule.id.startsWith('offline-')) {
            setGmailRules(gmailRules.filter(r => r.id !== rule.id));
          } else {
            await deleteDoc(doc(db, 'gmail_rules', rule.id));
          }
          showToast('Regla de conexión eliminada.');
        } catch (err) {
          showToast('Error al eliminar la regla.', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // K) Simulador: Recibir Correo (Generación dinámica de transacciones basadas en reglas activas)
  const simulateEmailReceived = async () => {
    if (!isGmailConnected) {
      showToast('Conecta tu cuenta de Gmail primero.', 'error');
      return;
    }

    const activeRules = gmailRules.filter(r => r.active);
    if (activeRules.length === 0) {
      showToast('No tienes reglas de emisor activas configuradas.', 'error');
      return;
    }

    // Seleccionar una regla aleatoria
    const selectedRule = activeRules[Math.floor(Math.random() * activeRules.length)];
    
    // Generar monto aleatorio realista
    const amountsBySender = {
      'no-reply@yape.com.pe': [10, 15, 20, 35, 50],
      'alertas@plin.pe': [5, 12, 25, 40, 60],
      'bcpnet@bcp.com.pe': [8.50, 42.90, 85, 120, 250],
      'info@account.netflix.com': [44.90] // Tarifa estándar Netflix
    };
    
    const possibleAmounts = amountsBySender[selectedRule.sender] || [15, 30, 45, 75];
    const finalAmount = possibleAmounts[Math.floor(Math.random() * possibleAmounts.length)];
    
    const isIncome = selectedRule.type === 'income';
    const desc = isIncome 
      ? `Simulado: Transferencia recibida (${selectedRule.name})` 
      : `Simulado: Débito automático (${selectedRule.name})`;

    const txData = {
      description: desc,
      amount: finalAmount,
      type: selectedRule.type,
      category: selectedRule.category,
      date: new Date().toISOString().split('T')[0],
      day: new Date().getDate()
    };

    try {
      await addDoc(collection(db, 'transactions'), txData);
      
      // Actualizar log de Gmail
      const newLog = {
        id: Date.now(),
        time: 'Justo ahora',
        text: `📥 Correo de ${selectedRule.sender} detectado. Transacción agregada: "${desc}" por ${formatMoney(finalAmount)} en ${selectedRule.category}.`
      };
      setGmailLogs(prev => [newLog, ...prev.slice(0, 8)]);
      showToast(`¡Regla de Gmail activada! Transacción creada.`);
    } catch (err) {
      console.error(err);
      showToast('Error al simular entrada de correo.', 'error');
    }
  };

  // Cargar estado de expandido del primer servicio al cargar
  useEffect(() => {
    if (services.length > 0 && expandedService === null) {
      setExpandedService(services[0].id);
    }
  }, [services, expandedService]);


  // ─── 5. UI COMPONENTS & RENDER ───────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start font-sans antialiased">
      
      {/* Estilos CSS para animaciones premium */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(-24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Ocultar barra de scroll en scroll horizontal */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* CONTENEDOR MÓVIL (NATIVE APP WRAPPER) */}
      <div className="w-full max-w-lg bg-slate-950 min-h-screen flex flex-col shadow-2xl relative pb-28">
        
        {/* TOAST NOTIFICACIÓN FLOATING */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-50 animate-slide-down">
            <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-800/50' : 
              toast.type === 'info' ? 'bg-sky-950/90 text-sky-200 border-sky-800/50' : 
              'bg-emerald-950/90 text-emerald-200 border-emerald-800/50'
            }`}>
              {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" /> : <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />}
              <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
            </div>
          </div>
        )}

        {/* REUSABLE CONFIRMATION MODAL */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-scale-in">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">{confirmModal.title}</h3>
                <p className="text-sm text-slate-400 mt-2 mb-6 leading-relaxed">{confirmModal.message}</p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                  >
                    Atrás
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-lg shadow-rose-900/30"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NATIVE-LIKE APP HEADER */}
        <header className="px-6 pt-6 pb-4 bg-slate-900/50 border-b border-slate-900 sticky top-0 backdrop-blur-md z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-900/30 text-white flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Finanzas & Streaming
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {connectionStatus === 'connected' ? 'Tiempo Real Activo' : 
                   connectionStatus === 'connecting' ? 'Conectando...' : 'Modo Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGmailConnected && activeTab === 'conexiones' && (
              <button 
                onClick={simulateEmailReceived}
                className="bg-indigo-950 border border-indigo-800/40 text-indigo-400 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 hover:bg-indigo-900/40 transition active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Simular Email
              </button>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-400">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* RENDER ACTIVE TAB */}
        <main className="flex-1 px-5 pt-4">
          
          {/* ========================================================
              TAB 1: RESUMEN (DASHBOARD)
              ======================================================== */}
          {activeTab === 'resumen' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* BALANCE & METRICS */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-800/20 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-4 -mt-4 pointer-events-none" />
                <span className="text-xs text-indigo-300 font-semibold tracking-wider uppercase">Balance Neto Consolidado</span>
                <div className="text-3xl font-black tracking-tight mt-1 text-white">
                  {formatMoney(financialSummary.balance)}
                </div>
                
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                    financialSummary.balance >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {financialSummary.balance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {financialSummary.savingsRate.toFixed(1)}% tasa ahorro
                  </span>
                  <span className="text-[11px] text-slate-400">mensual proyectado</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 mt-5 pt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Ingresos</span>
                    <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-4 h-4" />
                      {formatMoney(financialSummary.income)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Gastos</span>
                    <div className="text-sm font-bold text-rose-400 flex items-center gap-1 mt-0.5">
                      <TrendingDown className="w-4 h-4" />
                      {formatMoney(financialSummary.expense)}
                    </div>
                  </div>
                </div>
              </div>

              {/* CATEGORY BREAKDOWN PROGRESS BAR */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    Gastos por Categoría
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">{formatMoney(categoryBreakdown.total)} total</span>
                </div>

                {/* Progress Bar Completa */}
                <div className="h-3 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  {CATEGORIES.map(cat => {
                    const pct = categoryBreakdown.percentages[cat.id] || 0;
                    if (pct === 0) return null;
                    return (
                      <div 
                        key={cat.id}
                        style={{ width: `${pct}%` }}
                        className={`${cat.color} transition-all duration-500`}
                        title={`${cat.label}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                  {categoryBreakdown.total === 0 && (
                    <div className="w-full bg-slate-850 h-full rounded-full" />
                  )}
                </div>

                {/* Leyenda de Categorías */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  {CATEGORIES.map(cat => {
                    const amt = categoryBreakdown.totals[cat.id] || 0;
                    const pct = categoryBreakdown.percentages[cat.id] || 0;
                    
                    return (
                      <div key={cat.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm shrink-0">{cat.icon}</span>
                          <span className="text-slate-300 font-medium truncate max-w-[80px]">{cat.label}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-200">{formatMoney(amt)}</span>
                          <span className="text-[9px] text-slate-500 block">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HORIZONTAL DAY SCROLLING FLOW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Flujo Diario de Transacciones
                  </h3>
                  <span className="text-xs text-indigo-400 font-bold bg-indigo-950/60 border border-indigo-900/40 px-2 py-0.5 rounded-full">
                    Día {selectedDay} seleccionado
                  </span>
                </div>
                
                <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => {
                    const isSelected = selectedDay === dayNum;
                    const hasIndicator = dayIndicators[dayNum];
                    
                    return (
                      <button
                        key={dayNum}
                        onClick={() => setSelectedDay(dayNum)}
                        className={`flex-shrink-0 w-11 h-16 rounded-2xl flex flex-col items-center justify-center border transition relative active:scale-95 ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30' 
                            : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-tight opacity-75">Día</span>
                        <span className="text-base font-black mt-0.5">{dayNum}</span>
                        
                        {/* Indicadores de transacciones en ese día */}
                        {hasIndicator && (
                          <div className="absolute bottom-1.5 flex gap-1 justify-center">
                            {hasIndicator.income && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                            {hasIndicator.expense && <span className="w-1 h-1 rounded-full bg-rose-400" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Transacciones del día seleccionado */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-4 space-y-3 min-h-[100px]">
                  <span className="text-xs font-semibold text-slate-400">Eventos programados y registrados del día {selectedDay}:</span>
                  {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No hay transacciones registradas para el día {selectedDay}.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedDayEvents.map(t => (
                        <div key={t.id} className="bg-slate-900 border border-slate-800/60 p-3 rounded-2xl flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {CATEGORIES.find(c => c.id === t.category)?.icon || '💸'}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-200 block leading-tight">{t.description}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-950/40 border border-indigo-900/20 px-1.5 py-0.2 rounded">
                                  {t.category}
                                </span>
                                {t.isVirtual && (
                                  <span className="text-[9px] font-semibold tracking-wider text-amber-400 uppercase bg-amber-950/40 border border-amber-900/20 px-1.5 py-0.2 rounded">
                                    Simulado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className={`text-xs font-black ${
                              t.type === 'income' ? 'text-emerald-400' : 'text-slate-300'
                            }`}>
                              {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                            </span>
                            {!t.isVirtual && (
                              <button 
                                onClick={() => triggerDeleteTransaction(t)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-rose-400/70 hover:text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* FINANCIAL SIMULATOR */}
              <div className="bg-slate-900 border border-indigo-950/60 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Simulador Financiero Proyectado
                  </h3>
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Modifica tus ingresos y gastos para proyectar tus metas y ver cómo influye la distribución compartida de cuentas de Streaming en tu balance mensual.
                </p>

                <div className="space-y-3.5 pt-2">
                  
                  {/* Ingreso adicional slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">Ingreso Adicional Estimado:</span>
                      <span className="text-emerald-400 font-bold">+{formatMoney(simAdditionalIncome)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="2000" 
                      step="50" 
                      value={simAdditionalIncome}
                      onChange={(e) => setSimAdditionalIncome(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Reducción gastos slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">Reducción de Gastos Estimada:</span>
                      <span className="text-rose-400 font-bold">-{formatMoney(simExpenseReduction)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1000" 
                      step="25" 
                      value={simExpenseReduction}
                      onChange={(e) => setSimExpenseReduction(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Meta de ahorro input */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">Meta de Ahorro Deseada:</span>
                      <span className="text-slate-100 font-bold">{formatMoney(simSavingsGoal)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="2000" 
                      step="50" 
                      value={simSavingsGoal}
                      onChange={(e) => setSimSavingsGoal(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Simulador: Desactivar cuentas de Streaming para ver impacto */}
                  {services.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs text-slate-400 font-semibold block">Simular de baja suscripciones:</span>
                      <div className="flex gap-2 flex-wrap">
                        {services.map(s => {
                          const isCanceled = simCanceledServices[s.id];
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSimCanceledServices(prev => ({ ...prev, [s.id]: !isCanceled }))}
                              className={`text-[10px] font-bold py-1.5 px-3 rounded-xl border transition ${
                                isCanceled 
                                  ? 'bg-rose-950/40 border-rose-800 text-rose-400' 
                                  : 'bg-indigo-950/20 border-indigo-900/50 text-indigo-300 hover:bg-slate-800'
                              }`}
                            >
                              {s.name} {isCanceled ? '(De baja)' : '(Activo)'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resultados Simulación */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 mt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Balance Proyectado:</span>
                      <span className="font-bold text-slate-100">{formatMoney(simulationResult.projectedBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Meta de Ahorro:</span>
                      <span className="font-bold text-slate-100">{formatMoney(simSavingsGoal)}</span>
                    </div>
                    <div className="border-t border-slate-900 my-2 pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Estado de la Meta:</span>
                      {simulationResult.goalAchieved ? (
                        <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 animate-pulse">
                          ✓ Meta Alcanzada (+{formatMoney(simulationResult.goalDiff)})
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold bg-rose-950/40 border border-rose-900/30 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                          ✕ Faltan {formatMoney(simulationResult.goalDiff)}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 2: TRANSACCIONES (INGRESO / GASTO GENERAL)
              ======================================================== */}
          {activeTab === 'transacciones' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TRIGGER NEW TRANSACTION EXPAND */}
              <button 
                onClick={() => setShowAddTransaction(!showAddTransaction)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95"
              >
                {showAddTransaction ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {showAddTransaction ? 'Cerrar Formulario' : 'Registrar Nuevo Movimiento'}
              </button>

              {/* ADD TRANSACTION FORM */}
              {showAddTransaction && (
                <form onSubmit={handleAddTransaction} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 animate-slide-down">
                  <h3 className="text-sm font-bold text-white">Nuevo Registro</h3>
                  
                  {/* Tipo Toggle (Gasto / Ingreso) */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                      className={`py-2 rounded-lg font-bold text-xs transition ${
                        newTx.type === 'expense' 
                          ? 'bg-slate-800 text-white shadow' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Gasto 💸
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTx({ ...newTx, type: 'income' })}
                      className={`py-2 rounded-lg font-bold text-xs transition ${
                        newTx.type === 'income' 
                          ? 'bg-emerald-600 text-white shadow' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Ingreso 💰
                    </button>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Descripción / Establecimiento</label>
                    <input
                      type="text"
                      placeholder="Ej. Compras supermercado, Aporte Netflix..."
                      value={newTx.description}
                      onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* Monto & Fecha */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Monto (S/)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={newTx.amount}
                        onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Fecha</label>
                      <input
                        type="date"
                        value={newTx.date}
                        onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">Categoría del Gasto</label>
                    <select
                      value={newTx.category}
                      onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wider transition active:scale-95"
                  >
                    Guardar Movimiento
                  </button>
                </form>
              )}

              {/* FILTERS & SEARCH */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar transacciones..."
                    value={txSearch}
                    onChange={e => setTxSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Categorías Chips Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                  {['Todos', ...CATEGORIES.map(c => c.id)].map(catId => {
                    const isSelected = txFilterCategory === catId;
                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => setTxFilterCategory(catId)}
                        className={`flex-shrink-0 text-xs py-1.5 px-3.5 rounded-full font-semibold border transition ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {catId === 'Todos' ? '🌐 Todos' : `${CATEGORIES.find(c => c.id === catId)?.icon} ${catId}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HISTORY LIST */}
              <div className="space-y-3">
                <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Historial de Operaciones</h4>
                
                {integratedTransactions.filter(t => {
                  const matchesCategory = txFilterCategory === 'Todos' || t.category === txFilterCategory;
                  const matchesSearch = t.description.toLowerCase().includes(txSearch.toLowerCase());
                  return matchesCategory && matchesSearch;
                }).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No se encontraron transacciones registradas.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {integratedTransactions
                      .filter(t => {
                        const matchesCategory = txFilterCategory === 'Todos' || t.category === txFilterCategory;
                        const matchesSearch = t.description.toLowerCase().includes(txSearch.toLowerCase());
                        return matchesCategory && matchesSearch;
                      })
                      .map(t => (
                        <div key={t.id} className="bg-slate-900 border border-slate-905 rounded-2xl p-4 flex items-center justify-between transition hover:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl p-2 bg-slate-950 rounded-xl border border-slate-800/50">
                              {CATEGORIES.find(c => c.id === t.category)?.icon || '💸'}
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-slate-200 block">{t.description}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                  {t.date}
                                </span>
                                <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/20 uppercase">
                                  {t.category}
                                </span>
                                {t.isVirtual && (
                                  <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/20 uppercase">
                                    Simulado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black ${
                              t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'
                            }`}>
                              {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                            </span>
                            {!t.isVirtual && (
                              <button 
                                onClick={() => triggerDeleteTransaction(t)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                title="Eliminar transacción"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 3: STREAMING (CUENTAS COMPARTIDAS)
              ======================================================== */}
          {activeTab === 'streaming' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* STACKS STATISTICS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-900 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Gasto Total Streaming</span>
                  <div className="text-base font-extrabold text-white mt-0.5">{formatMoney(totalStreamingCost)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-900 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Aportes Recaudados</span>
                  <div className="text-base font-extrabold text-emerald-400 mt-0.5">+{formatMoney(totalMembersContributions)}</div>
                </div>
              </div>

              {/* TRIGGER NEW SERVICE */}
              <button 
                onClick={() => setShowAddService(!showAddService)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-indigo-900/30 rounded-2xl font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 active:scale-95"
              >
                {showAddService ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddService ? 'Cerrar Formulario' : 'Crear Cuenta / Suscripción'}
              </button>

              {/* ADD STREAMING FORM */}
              {showAddService && (
                <form onSubmit={handleAddService} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 animate-slide-down">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1">
                    <Tv className="w-4 h-4 text-indigo-400" /> Crear Servicio
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Nombre del Servicio</label>
                    <input
                      type="text"
                      placeholder="Ej. Netflix, Spotify, Prime Video..."
                      value={newSvc.name}
                      onChange={e => setNewSvc({ ...newSvc, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Costo Mensual (S/)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={newSvc.cost}
                        onChange={e => setNewSvc({ ...newSvc, cost: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Día de Pago (1-31)</label>
                      <input
                        type="number"
                        placeholder="1"
                        min="1"
                        max="31"
                        value={newSvc.paymentDay}
                        onChange={e => setNewSvc({ ...newSvc, paymentDay: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wider transition active:scale-95"
                  >
                    Guardar Suscripción
                  </button>
                </form>
              )}

              {/* COLLAPSIBLE ACCOUNT LIST */}
              <div className="space-y-4">
                <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cuentas Activas</h4>
                
                {streamingServiceDetails.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No tienes servicios de streaming registrados.
                  </div>
                ) : (
                  streamingServiceDetails.map(svc => {
                    const isExpanded = expandedService === svc.id;
                    const diffColor = svc.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400';
                    const diffBg = svc.netBalance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10';
                    
                    return (
                      <div key={svc.id} className="bg-slate-900 border border-slate-900 rounded-3xl overflow-hidden transition-all duration-300">
                        
                        {/* Header del Servicio */}
                        <div 
                          onClick={() => setExpandedService(isExpanded ? null : svc.id)}
                          className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-850 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-indigo-950 border border-indigo-900/30 p-2.5 rounded-2xl text-indigo-400">
                              <Tv className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-100 block leading-tight">{svc.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 font-bold">Costo: {formatMoney(svc.cost)}</span>
                                <span className="text-[10px] text-slate-400 font-bold">Día {svc.paymentDay}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${diffBg} ${diffColor}`}>
                              {svc.netBalance >= 0 ? '+' : ''}{formatMoney(svc.netBalance)}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Contenido Expandible (Miembros e Info de Reparto) */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-slate-950 pt-4 space-y-4 animate-slide-down">
                            
                            {/* Reparto Inteligente Sugerido */}
                            <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl text-xs space-y-1">
                              <div className="flex justify-between items-center text-slate-400">
                                <span>Reparto sugerido (Persona + Dueño):</span>
                                <span className="font-bold text-slate-200">{formatMoney(svc.costPerMember)}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                Si todos aportan equitativamente, el costo se divide por {svc.memberCount + 1} personas (incluyéndote).
                              </p>
                            </div>

                            {/* Listado de Miembros del Servicio */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Miembros que Aportan:</span>
                              
                              {svc.members.length === 0 ? (
                                <p className="text-xs text-slate-500 py-2">No hay miembros asignados a este servicio aún.</p>
                              ) : (
                                svc.members.map(m => (
                                  <div key={m.id} className="bg-slate-950/60 border border-slate-850 p-3 rounded-2xl flex justify-between items-center">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase border border-slate-800">
                                        {m.name.substring(0,2)}
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-slate-300 block">{m.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[9px] text-slate-500">Día {m.paymentDay}</span>
                                          
                                          {/* Badge Método de Pago (Interactivo al hacer click) */}
                                          <button
                                            onClick={() => togglePaymentMethod(m)}
                                            className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-indigo-950/60 text-indigo-400 border border-indigo-900/30 active:scale-95"
                                            title="Click para cambiar método de pago"
                                          >
                                            {m.paymentMethod || 'yape'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-emerald-400">+{formatMoney(m.contribution)}</span>
                                      <button 
                                        onClick={() => triggerDeleteMember(m)}
                                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Formulario Agregar Miembro */}
                            <form onSubmit={(e) => handleAddMember(svc.id, e)} className="bg-slate-950/30 p-3 rounded-2xl border border-slate-850/50 space-y-3">
                              <span className="text-[10px] text-indigo-300 font-bold block">＋ Agregar Miembro</span>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  name="memberName"
                                  placeholder="Nombre miembro"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                                />
                                <input
                                  type="number"
                                  name="memberContribution"
                                  placeholder="Aporte (S/)"
                                  step="0.1"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  name="memberPaymentDay"
                                  placeholder="Día pago"
                                  min="1"
                                  max="31"
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                                />
                                <button
                                  type="submit"
                                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0 active:scale-95"
                                >
                                  Asignar
                                </button>
                              </div>
                            </form>

                            {/* Botón Eliminar Servicio */}
                            <div className="pt-2 border-t border-slate-950 flex justify-end">
                              <button
                                type="button"
                                onClick={() => triggerDeleteService(svc)}
                                className="py-2 px-3 text-xs bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar Suscripción
                              </button>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 4: CONEXIONES (GMAIL SENDER RULES)
              ======================================================== */}
          {activeTab === 'conexiones' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* GMAIL SYNC STATUS CARD */}
              <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-100 block">Sincronizador Gmail</span>
                      <span className="text-[10px] text-slate-400">Escáner automático de correos bancarios y billeteras</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsGmailConnected(!isGmailConnected)}
                    className={`text-[10px] font-bold py-1.5 px-3 rounded-full border transition ${
                      isGmailConnected 
                        ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isGmailConnected ? 'Conectado ✓' : 'Desconectado'}
                  </button>
                </div>

                {isGmailConnected ? (
                  <div className="p-3.5 bg-slate-950/50 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Último escaneo exitoso</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Buscando correos de aportes de Yape, Plin y cobros Netflix para automatizar los ingresos y gastos mensuales.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-rose-950/10 border border-rose-900/20 rounded-2xl flex gap-2">
                    <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-rose-200/80 leading-relaxed">
                      La conexión con Gmail está inactiva. Deberás registrar todos tus movimientos manualmente en la pestaña de transacciones.
                    </p>
                  </div>
                )}
              </div>

              {/* RULES HEADER AND ADD RULE BUTTON */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reglas de Registro Automático</h4>
                  <button
                    onClick={() => setShowAddRule(!showAddRule)}
                    className="text-xs font-bold text-indigo-400 flex items-center gap-1"
                  >
                    {showAddRule ? 'Cancelar' : '＋ Nueva Regla'}
                  </button>
                </div>

                {/* ADD RULE FORM */}
                {showAddRule && (
                  <form onSubmit={handleAddRule} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 animate-slide-down">
                    <h3 className="text-xs font-bold text-white">Nueva Regla de Emisor</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">Nombre Emisor</label>
                        <input
                          type="text"
                          placeholder="Ej. BCP, Yape, Plin..."
                          value={newRule.name}
                          onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">Tipo Transacción</label>
                        <select
                          value={newRule.type}
                          onChange={e => setNewRule({ ...newRule, type: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none"
                        >
                          <option value="expense">Gasto 💸</option>
                          <option value="income">Ingreso 💰</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Correo Emisor (De:)</label>
                      <input
                        type="email"
                        placeholder="Ej. no-reply@yape.com.pe"
                        value={newRule.sender}
                        onChange={e => setNewRule({ ...newRule, sender: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Categoría Asignada</label>
                      <select
                        value={newRule.category}
                        onChange={e => setNewRule({ ...newRule, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wider transition active:scale-95"
                    >
                      Activar Regla
                    </button>
                  </form>
                )}

                {/* RULES LIST */}
                <div className="space-y-2.5">
                  {gmailRules.map(rule => (
                    <div 
                      key={rule.id}
                      className={`bg-slate-900 border p-4 rounded-3xl flex justify-between items-center transition ${
                        rule.active ? 'border-slate-850' : 'border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400">
                          {rule.name.substring(0,3).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-200">{rule.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              rule.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {rule.type === 'income' ? 'Ingreso' : 'Gasto'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[170px]">{rule.sender}</span>
                          <span className="text-[9px] text-indigo-400 font-semibold block mt-0.5">Categoría: {rule.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Activar/Desactivar Switch */}
                        <button
                          type="button"
                          onClick={() => toggleRuleActive(rule)}
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                            rule.active ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${
                            rule.active ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                        
                        <button 
                          onClick={() => triggerDeleteRule(rule)}
                          className="p-1 text-slate-600 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIMULATION CONSOLE LOG */}
              <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-indigo-400" />
                    Bandeja y Logs de Correo
                  </h4>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                
                <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {gmailLogs.map(log => (
                    <div key={log.id} className="text-[10px] bg-slate-950/70 border border-slate-900/60 p-2.5 rounded-xl space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span className="font-bold">Gmail Parser</span>
                        <span>{log.time}</span>
                      </div>
                      <p className="text-slate-300 leading-normal">{log.text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>

        {/* BOTTOM NAVIGATION BAR (MOBILE-FIRST) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-slate-900/90 backdrop-blur-md border-t border-slate-850 px-4 py-2 flex justify-around items-center z-40 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
          
          {/* Tab 1: Resumen */}
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'resumen' ? 'text-indigo-400 font-bold bg-indigo-950/45' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Resumen</span>
          </button>

          {/* Tab 2: Transacciones */}
          <button 
            onClick={() => setActiveTab('transacciones')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'transacciones' ? 'text-indigo-400 font-bold bg-indigo-950/45' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Movimientos</span>
          </button>

          {/* Tab 3: Streaming */}
          <button 
            onClick={() => setActiveTab('streaming')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'streaming' ? 'text-indigo-400 font-bold bg-indigo-950/45' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Streaming</span>
          </button>

          {/* Tab 4: Conexiones */}
          <button 
            onClick={() => setActiveTab('conexiones')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'conexiones' ? 'text-indigo-400 font-bold bg-indigo-950/45' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Conexiones</span>
          </button>

        </nav>

      </div>
    </div>
  );
}
