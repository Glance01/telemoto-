import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  AdminStats,
  getAdminPlatformStats,
  updateDriverVerificationStatus,
  updatePricingConfig,
} from '../../services/adminService';
import {
  DriverProfile,
  Trip,
  ComplaintRecord,
  AdminLog,
  PlatformPricing,
  WithdrawalRequest,
  DriverStatus,
} from '../../types';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_PRICING, calculateFare } from '../../services/pricingService';
import { GoogleMapContainer } from '../common/GoogleMapContainer';
import {
  LayoutDashboard,
  Users,
  Bike,
  Route,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Sliders,
  FileText,
  MapPin,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  TrendingUp,
  Download,
  Copy,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Calendar,
  AlertCircle,
  BarChart3,
  BadgeAlert,
} from 'lucide-react';
import {
  MOZAMBIQUE_ADMIN_DIVISIONS,
  PROVINCES_LIST,
  getDistrictCoordinates,
} from '../../lib/mozambiqueLocations';
import {
  getAntiAbuseSettings,
  updateAntiAbuseSettings,
  getPenalizedUsers,
  getAbuseReports,
  liftUserPenalties,
  resolveAbuseReport,
  AntiAbuseSettings,
  AbuseReport,
  PenalizedUser,
} from '../../services/antiAbuseService';
import telemotoLogo from '../../assets/images/telemoto_app_logo.png';

export const AdminPanel: React.FC = () => {
  const { user, userProfile, switchActiveRole } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'drivers' | 'trips' | 'payouts' | 'map' | 'pricing' | 'complaints' | 'logs' | 'antiabuse'
  >('dashboard');

  // Core Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [pricing, setPricing] = useState<PlatformPricing>(DEFAULT_PRICING);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Anti-Abuse States
  const [antiAbuseConfig, setAntiAbuseConfig] = useState<AntiAbuseSettings | null>(null);
  const [penalizedUsers, setPenalizedUsers] = useState<PenalizedUser[]>([]);
  const [abuseReports, setAbuseReports] = useState<AbuseReport[]>([]);
  const [updatingConfig, setUpdatingConfig] = useState<boolean>(false);
  const [reportActionNotes, setReportActionNotes] = useState<Record<string, string>>({});

  // Interactive Action States
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);
  const [inspectingDriver, setInspectingDriver] = useState<DriverProfile | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [showRejectDialog, setShowRejectDialog] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filtering States
  const [driverSearch, setDriverSearch] = useState<string>('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [driverProvinceFilter, setDriverProvinceFilter] = useState<string>('all');

  const [tripSearch, setTripSearch] = useState<string>('');
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('all');

  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  // Interactive Pricing Simulator State
  const [simulatedKm, setSimulatedKm] = useState<number>(5);

  // Fleet Map Center
  const [fleetProvince, setFleetProvince] = useState<string>('Inhambane');
  const [fleetDistrict, setFleetDistrict] = useState<string>('Massinga');
  const [fleetCenter, setFleetCenter] = useState<{ lat: number; lng: number }>({
    lat: -23.3328,
    lng: 35.3789,
  });

  // Real-time synchronization
  useEffect(() => {
    loadAllAdminData();

    // Drivers
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      const dList: DriverProfile[] = [];
      snap.forEach((docSnap) => dList.push(docSnap.data() as DriverProfile));
      setDrivers(dList);
    });

    // Trips
    const unsubTrips = onSnapshot(
      query(collection(db, 'trips'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        const tList: Trip[] = [];
        snap.forEach((docSnap) => tList.push(docSnap.data() as Trip));
        setTrips(tList);
        getAdminPlatformStats().then((s) => setStats(s)).catch(() => {});
      }
    );

    // Withdrawals (Saques)
    const unsubWithdrawals = onSnapshot(
      query(collection(db, 'withdrawalRequests'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        const wList: WithdrawalRequest[] = [];
        snap.forEach((docSnap) => wList.push(docSnap.data() as WithdrawalRequest));
        setWithdrawals(wList);
      }
    );

    // Complaints
    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        const cList: ComplaintRecord[] = [];
        snap.forEach((docSnap) => cList.push(docSnap.data() as ComplaintRecord));
        setComplaints(cList);
      },
      (err) => {
        console.warn('Complaints listener note:', err);
      }
    );

    return () => {
      unsubDrivers();
      unsubTrips();
      unsubWithdrawals();
      unsubComplaints();
    };
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      // 1. Stats
      const s = await getAdminPlatformStats();
      setStats(s);

      // 2. Drivers
      const dSnap = await getDocs(collection(db, 'drivers'));
      const dList: DriverProfile[] = [];
      dSnap.forEach((docSnap) => dList.push(docSnap.data() as DriverProfile));
      setDrivers(dList);

      // 3. Trips
      const tSnap = await getDocs(
        query(collection(db, 'trips'), orderBy('createdAt', 'desc'), limit(100))
      );
      const tList: Trip[] = [];
      tSnap.forEach((docSnap) => tList.push(docSnap.data() as Trip));
      setTrips(tList);

      // 4. Withdrawals
      const wSnap = await getDocs(
        query(collection(db, 'withdrawalRequests'), orderBy('createdAt', 'desc'), limit(100))
      );
      const wList: WithdrawalRequest[] = [];
      wSnap.forEach((docSnap) => wList.push(docSnap.data() as WithdrawalRequest));
      setWithdrawals(wList);

      // 5. Complaints
      try {
        const cSnap = await getDocs(
          query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(50))
        );
        const cList: ComplaintRecord[] = [];
        cSnap.forEach((docSnap) => cList.push(docSnap.data() as ComplaintRecord));
        setComplaints(cList);
      } catch (err) {
        // complaints collection might be fresh
      }

      // 6. Logs
      const lSnap = await getDocs(
        query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(50))
      );
      const lList: AdminLog[] = [];
      lSnap.forEach((docSnap) => lList.push(docSnap.data() as AdminLog));
      setLogs(lList);

      // 7. Pricing Config
      const pSnap = await getDoc(doc(db, 'pricing', 'default'));
      if (pSnap.exists()) {
        setPricing(pSnap.data() as PlatformPricing);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize anti-abuse settings, penalized list, and abuse reports
  useEffect(() => {
    if (activeTab === 'antiabuse') {
      loadAntiAbuseData();
    }
  }, [activeTab]);

  const loadAntiAbuseData = async () => {
    try {
      const cfg = await getAntiAbuseSettings();
      setAntiAbuseConfig(cfg);
      
      const pUsers = await getPenalizedUsers();
      setPenalizedUsers(pUsers);

      const aReports = await getAbuseReports();
      setAbuseReports(aReports);
    } catch (err) {
      console.warn('Failed loading anti-abuse admin data:', err);
    }
  };

  // Status updates
  const handleUpdateDriverStatus = async (
    driverId: string,
    status: DriverStatus,
    reason?: string
  ) => {
    if (!user) return;
    setUpdatingDriverId(driverId);
    await updateDriverVerificationStatus(
      user.uid,
      userProfile?.fullName || 'Admin',
      driverId,
      status,
      reason
    );
    await loadAllAdminData();
    setUpdatingDriverId(null);
    setShowRejectDialog(false);
    setRejectionReasonInput('');
    if (inspectingDriver?.id === driverId) {
      setInspectingDriver((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const handleCompleteWithdrawal = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'withdrawalRequests', requestId), {
        status: 'completed',
        processedAt: Date.now(),
        updatedAt: Date.now(),
      });
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === requestId ? { ...w, status: 'completed', processedAt: Date.now() } : w
        )
      );
    } catch (err) {
      console.error('Failed to update withdrawal status:', err);
    }
  };

  const handleDeleteWithdrawal = async (requestId: string) => {
    if (!confirm('Eliminar permanentemente este registo de saque?')) return;
    try {
      await deleteDoc(doc(db, 'withdrawalRequests', requestId));
      setWithdrawals((prev) => prev.filter((w) => w.id !== requestId));
    } catch (err) {
      console.error('Failed to delete withdrawal request:', err);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Eliminar esta corrida dos registos?')) return;
    try {
      await deleteDoc(doc(db, 'trips', tripId));
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      const s = await getAdminPlatformStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const handleClearAllTrips = async () => {
    if (
      !confirm(
        'Tem a certeza que deseja zerar todas as viagens e comissões da plataforma? Esta ação apagará todo o histórico de corridas e pagamentos de teste.'
      )
    )
      return;
    try {
      const tSnap = await getDocs(collection(db, 'trips'));
      for (const d of tSnap.docs) {
        await deleteDoc(doc(db, 'trips', d.id));
      }
      const pSnap = await getDocs(collection(db, 'payments'));
      for (const d of pSnap.docs) {
        await deleteDoc(doc(db, 'payments', d.id));
      }
      setTrips([]);
      const s = await getAdminPlatformStats();
      setStats(s);
      alert('Histórico de viagens e comissões zerado com sucesso!');
    } catch (err) {
      console.error('Failed to clear trips:', err);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (
      !confirm('Deseja eliminar este condutor e todos os seus registos da plataforma definitivamente?')
    )
      return;
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
      try {
        await deleteDoc(doc(db, 'users', driverId));
        await deleteDoc(doc(db, 'wallets', driverId));
      } catch {
        // ignore
      }
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
      if (inspectingDriver?.id === driverId) setInspectingDriver(null);
    } catch (err) {
      console.error('Failed to delete driver:', err);
    }
  };

  const handleResolveComplaint = async (complaintId: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        status,
        resolvedAt: Date.now(),
      });
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status, resolvedAt: Date.now() } : c))
      );
    } catch (err) {
      console.error('Failed to resolve complaint:', err);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await updatePricingConfig(user.uid, userProfile?.fullName || 'Admin', pricing);
    alert('Regras de preços e comissões atualizadas com sucesso!');
    await loadAllAdminData();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        !driverSearch.trim() ||
        d.fullName.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.phone.includes(driverSearch) ||
        (d.plateNumber && d.plateNumber.toLowerCase().includes(driverSearch.toLowerCase())) ||
        (d.idNumber && d.idNumber.toLowerCase().includes(driverSearch.toLowerCase())) ||
        (d.district && d.district.toLowerCase().includes(driverSearch.toLowerCase())) ||
        (d.bairro && d.bairro.toLowerCase().includes(driverSearch.toLowerCase()));

      const matchStatus = driverStatusFilter === 'all' || d.status === driverStatusFilter;
      const matchProvince = driverProvinceFilter === 'all' || d.province === driverProvinceFilter;

      return matchSearch && matchStatus && matchProvince;
    });
  }, [drivers, driverSearch, driverStatusFilter, driverProvinceFilter]);

  // Filtered trips list
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        !tripSearch.trim() ||
        t.passengerName.toLowerCase().includes(tripSearch.toLowerCase()) ||
        (t.driverName && t.driverName.toLowerCase().includes(tripSearch.toLowerCase())) ||
        t.origin.address.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.destination.address.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(tripSearch.toLowerCase());

      const matchStatus = tripStatusFilter === 'all' || t.status === tripStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [trips, tripSearch, tripStatusFilter]);

  // Filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      return withdrawalStatusFilter === 'all' || w.status === withdrawalStatusFilter;
    });
  }, [withdrawals, withdrawalStatusFilter]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      return complaintStatusFilter === 'all' || c.status === complaintStatusFilter;
    });
  }, [complaints, complaintStatusFilter]);

  // Interactive Pricing Simulation Output
  const simulatedFare = useMemo(() => {
    return calculateFare(simulatedKm, pricing);
  }, [simulatedKm, pricing]);

  const pendingDriversCount = drivers.filter((d) => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingComplaintsCount = complaints.filter((c) => c.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* TOP ADMIN BAR & BREADCRUMB */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md shadow-red-500/25 border border-red-500/30 bg-black flex items-center justify-center shrink-0">
            <img src={telemotoLogo} alt="TeleMoto+" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Painel Administrativo
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">/</span>
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 capitalize">
                {activeTab === 'dashboard'
                  ? 'Visão Geral & KPIs'
                  : activeTab === 'drivers'
                  ? 'Gestão de Condutores'
                  : activeTab === 'trips'
                  ? 'Histórico de Corridas'
                  : activeTab === 'payouts'
                  ? 'Tesouraria & Saques'
                  : activeTab === 'map'
                  ? 'Radar da Frota'
                  : activeTab === 'pricing'
                  ? 'Tarifas & Comissões'
                  : activeTab === 'complaints'
                  ? 'Denúncias & Suporte'
                  : activeTab === 'antiabuse'
                  ? 'Segurança & Anti-Abuso'
                  : 'Auditoria de Sistema'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>TeleMoto+ Moçambique</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Online
              </span>
            </h1>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
            <Clock className="w-3.5 h-3.5" />
            <span>Sincronizado: {lastRefreshed.toLocaleTimeString('pt-MZ')}</span>
          </div>

          <button
            onClick={loadAllAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            title="Recarregar dados do servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-red-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => switchActiveRole('passenger')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl border border-red-200 dark:border-red-500/30 transition-all cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Modo App</span>
          </button>
        </div>
      </header>

      {/* ORGANIZED NAVIGATION CATEGORY TABS */}
      <nav className="p-1.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'map'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Radar Frota</span>
        </button>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer relative ${
            activeTab === 'drivers'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Condutores</span>
          <span className="font-mono text-[11px] opacity-80">({drivers.length})</span>
          {pendingDriversCount > 0 && (
            <span className="bg-amber-400 text-neutral-950 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
              {pendingDriversCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('trips')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'trips'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Route className="w-4 h-4" />
          <span>Corridas</span>
          <span className="font-mono text-[11px] opacity-80">({trips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer relative ${
            activeTab === 'payouts'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Saques M-Pesa</span>
          {pendingWithdrawalsCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tarifas</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'complaints'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Denúncias</span>
          {pendingComplaintsCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {pendingComplaintsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('antiabuse')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'antiabuse'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Segurança</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-red-500 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Auditoria</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* TAB 1: DASHBOARD GERAL & KPIS */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Notice Alerts */}
          {pendingDriversCount > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Existem {pendingDriversCount} novos moto-taxistas aguardando verificação e aprovação de documentos.
                </span>
              </div>
              <button
                onClick={() => {
                  setDriverStatusFilter('pending');
                  setActiveTab('drivers');
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs rounded-xl shadow-xs cursor-pointer self-start sm:self-auto"
              >
                Rever Candidaturas
              </button>
            </div>
          )}

          {pendingWithdrawalsCount > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-xs font-bold text-red-900 dark:text-red-200">
                  Existem {pendingWithdrawalsCount} pedidos de levantamento de saldo pendentes para pagamento via M-Pesa / e-Mola.
                </span>
              </div>
              <button
                onClick={() => {
                  setWithdrawalStatusFilter('pending');
                  setActiveTab('payouts');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer self-start sm:self-auto"
              >
                Processar Saques
              </button>
            </div>
          )}

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Volume */}
            <div className="p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Volume Movimentado</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-neutral-900 dark:text-white">
                {stats.totalVolumeMT.toLocaleString('pt-MZ')} <span className="text-sm font-semibold text-neutral-400">MT</span>
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Total bruto processado nas viagens
              </p>
            </div>

            {/* Platform Commission */}
            <div className="p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Comissão Plataforma (15%)</span>
                <DollarSign className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-red-600 dark:text-red-400">
                {stats.totalCommissionMT.toLocaleString('pt-MZ')} <span className="text-sm font-semibold text-neutral-400">MT</span>
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Receita líquida retida pela TeleMoto+
              </p>
            </div>

            {/* Active Fleet */}
            <div className="p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Frota Online Agora</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats.onlineDrivers}
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                de {stats.totalDrivers} condutores registados
              </p>
            </div>

            {/* Completed Rides */}
            <div className="p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Corridas Concluídas</span>
                <Route className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-neutral-900 dark:text-white">
                {stats.tripsCompleted}
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                {stats.tripsToday} realizadas hoje
              </p>
            </div>
          </div>

          {/* Split Activity Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Trips Widget */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Últimas Corridas Registadas
                  </h3>
                  <p className="text-xs text-neutral-400">Atualização em tempo real</p>
                </div>
                <button
                  onClick={() => setActiveTab('trips')}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {trips.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Nenhuma corrida registada ainda.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  {trips.slice(0, 5).map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-900 dark:text-white truncate">
                          {t.passengerName}
                          {t.driverName && (
                            <span className="text-neutral-400 font-normal"> · {t.driverName}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {t.origin.address} → {t.destination.address}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {t.fareAmount} MT
                        </span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 capitalize">
                          {t.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Pricing Summary & Simulator Teaser */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Simulador Rápido de Tarifas
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Até 5 km: {pricing.baseFare} MT · +{pricing.pricePerKm} MT/km adicional · Comissão: {pricing.platformCommissionPercent}%
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Configurar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Interactive Distance Slider */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                    Distância de Teste:
                  </span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {simulatedKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={simulatedKm}
                  onChange={(e) => setSimulatedKm(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">Cliente</span>
                    <p className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      {simulatedFare.totalFare} MT
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">Comissão 15%</span>
                    <p className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                      {simulatedFare.platformCommission} MT
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">Líquido Mota</span>
                    <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {simulatedFare.driverNetEarnings} MT
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GESTÃO E VERIFICAÇÃO DE CONDUTORES */}
      {/* ========================================================= */}
      {activeTab === 'drivers' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs space-y-4 p-5 animate-fade-in">
          {/* Header & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Moto-Taxistas Registados</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {filteredDrivers.length} de {drivers.length}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Auditoria de documentos, matrículas e aprovação operacional em Moçambique
              </p>
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, matrícula, BI..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={driverStatusFilter}
                onChange={(e) => setDriverStatusFilter(e.target.value as any)}
                className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="all">Todos os Estados</option>
                <option value="pending">🟡 Pendentes</option>
                <option value="approved">🟢 Aprovados</option>
                <option value="rejected">🔴 Rejeitados</option>
                <option value="suspended">⚫ Suspensos</option>
              </select>

              {/* Province Filter */}
              <select
                value={driverProvinceFilter}
                onChange={(e) => setDriverProvinceFilter(e.target.value)}
                className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="all">Todas as Províncias</option>
                {PROVINCES_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Nenhum motorista encontrado com os filtros selecionados.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredDrivers.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setInspectingDriver(d)}
                    className="p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3.5 cursor-pointer hover:border-red-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-sm">
                          {d.photoUrl ? (
                            <img src={d.photoUrl} alt={d.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">{d.fullName}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{d.email || 'Sem email'}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          d.status === 'approved'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            : d.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {d.status === 'pending'
                          ? '🟡 Pendente'
                          : d.status === 'approved'
                          ? '🟢 Ativo'
                          : '🔴 ' + d.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 text-[11px] leading-tight">
                      <div>
                        <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider mb-0.5">Moto & Matrícula</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">
                          {d.bikeBrand} {d.bikeModel}
                        </span>
                        <span className="block font-mono font-bold text-[9px] text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 rounded mt-1.5 w-max">
                          {d.plateNumber || 'Sem matrícula'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider mb-0.5">Contacto / BI</span>
                        <a
                          href={`tel:${d.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{d.phone}</span>
                        </a>
                        <span className="block text-neutral-400 mt-1 font-mono">BI: {d.idNumber || 'Não submetido'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-neutral-100 dark:border-neutral-800/60 text-neutral-500">
                      <span className="truncate">📍 {d.province || 'Moçambique'} • {d.district || d.city}</span>
                      <span className="font-mono font-black text-amber-500 flex items-center gap-0.5 shrink-0">
                        {d.rating?.toFixed(1) || '5.0'} ⭐
                      </span>
                    </div>

                    <div className="pt-2.5 flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingDriver(d);
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] rounded-xl transition-all active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Perfil</span>
                      </button>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {d.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateDriverStatus(d.id, 'approved')}
                            disabled={updatingDriverId === d.id}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] shadow-sm active:scale-95"
                          >
                            Aprovar
                          </button>
                        )}

                        {d.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingDriver(d);
                              setShowRejectDialog(true);
                            }}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[10px] active:scale-95"
                          >
                            Rejeitar
                          </button>
                        )}

                        {d.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateDriverStatus(d.id, 'suspended', 'Suspensão pelo painel de controlo')}
                            disabled={updatingDriverId === d.id}
                            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl font-bold text-[10px] active:scale-95"
                          >
                            Suspender
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteDriver(d.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                      <th className="p-3">Condutor</th>
                      <th className="p-3">Moto & Matrícula</th>
                      <th className="p-3">Contacto / BI</th>
                      <th className="p-3">Localização</th>
                      <th className="p-3">Avaliação</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Ações de Verificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {filteredDrivers.map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                        onClick={() => setInspectingDriver(d)}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                              {d.photoUrl ? (
                                <img src={d.photoUrl} alt={d.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-neutral-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-neutral-900 dark:text-white">{d.fullName}</p>
                              <p className="text-[10px] text-neutral-400">{d.email || 'Sem email'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {d.bikePhotoUrl && (
                              <div className="w-10 h-7 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0">
                                <img src={d.bikePhotoUrl} alt="Moto" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-neutral-900 dark:text-white">
                                {d.bikeBrand} {d.bikeModel}
                              </span>{' '}
                              <span className="text-neutral-700 dark:text-neutral-300 font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                                {d.plateNumber || 'Sem matrícula'}
                              </span>
                              <div className="text-[10px] text-neutral-400">{d.bikeColor}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-mono text-[11px]">
                          <a
                            href={`tel:${d.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            title="Ligar para o motorista"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{d.phone}</span>
                          </a>
                          <div className="text-neutral-400">BI: {d.idNumber || 'Não submetido'}</div>
                        </td>

                        <td className="p-3 text-xs">
                          <div className="font-bold text-neutral-900 dark:text-white">
                            {d.province || 'Moçambique'}
                          </div>
                          <div className="text-neutral-400">
                            {d.district || d.city} • <span className="text-neutral-600 dark:text-neutral-300">{d.bairro || d.zone}</span>
                          </div>
                        </td>

                        <td className="p-3 font-mono font-semibold">
                          {d.rating?.toFixed(1) || '5.0'} ⭐
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              d.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                : d.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse'
                                : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {d.status === 'pending'
                              ? '🟡 Pendente'
                              : d.status === 'approved'
                              ? '🟢 Aprovado'
                              : '🔴 ' + d.status}
                          </span>
                        </td>

                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingDriver(d)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              title="Inspecionar perfil completo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {d.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateDriverStatus(d.id, 'approved')}
                                disabled={updatingDriverId === d.id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-xs cursor-pointer"
                              >
                                Aprovar
                              </button>
                            )}

                            {d.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setInspectingDriver(d);
                                  setShowRejectDialog(true);
                                }}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                              >
                                Rejeitar
                              </button>
                            )}

                            {d.status === 'approved' && (
                              <button
                                onClick={() => handleUpdateDriverStatus(d.id, 'suspended', 'Suspensão pelo painel de controlo')}
                                disabled={updatingDriverId === d.id}
                                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                              >
                                Suspender
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteDriver(d.id)}
                              title="Eliminar motorista permanentemente"
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* DRIVER INSPECTION MODAL */}
      {/* ========================================================= */}
      {inspectingDriver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-fade-in"
          role="dialog"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] overflow-y-auto space-y-5">
            <button
              onClick={() => {
                setInspectingDriver(null);
                setShowRejectDialog(false);
              }}
              className="absolute right-4 top-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Auditoria de Condutor
              </span>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                {inspectingDriver.fullName}
              </h3>
              <p className="text-xs text-neutral-400">ID: {inspectingDriver.id}</p>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500">Foto do Condutor</span>
                <div className="h-40 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  {inspectingDriver.photoUrl ? (
                    <img
                      src={inspectingDriver.photoUrl}
                      alt={inspectingDriver.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-neutral-400" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500">Foto da Moto</span>
                <div className="h-40 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  {inspectingDriver.bikePhotoUrl ? (
                    <img
                      src={inspectingDriver.bikePhotoUrl}
                      alt="Moto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Bike className="w-10 h-10 text-neutral-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Telefone</span>
                <a
                  href={`tel:${inspectingDriver.phone}`}
                  className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 mt-0.5"
                  title="Ligar agora"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{inspectingDriver.phone}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">BI / Documento</span>
                <p className="font-mono font-bold text-neutral-900 dark:text-white">
                  {inspectingDriver.idNumber || 'Não submetido'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Matrícula</span>
                <p className="font-mono font-bold text-neutral-900 dark:text-white">
                  {inspectingDriver.plateNumber || 'Pendente'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Moto</span>
                <p className="font-bold text-neutral-900 dark:text-white">
                  {inspectingDriver.bikeBrand} {inspectingDriver.bikeModel} ({inspectingDriver.bikeColor})
                </p>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Local de Atuação</span>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {inspectingDriver.province} · {inspectingDriver.district || inspectingDriver.city} · {inspectingDriver.bairro || inspectingDriver.zone}
                </p>
              </div>
            </div>

            {/* Rejection input */}
            {showRejectDialog && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-red-900 dark:text-red-200">
                  Motivo da Rejeição (enviado ao motorista):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Foto do BI ilegível ou placa inválida"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-500/40 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectDialog(false)}
                    className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:underline"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateDriverStatus(
                        inspectingDriver.id,
                        'rejected',
                        rejectionReasonInput || 'Documentação não aprovada'
                      )
                    }
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
                  >
                    Confirmar Rejeição
                  </button>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => handleDeleteDriver(inspectingDriver.id)}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
              >
                Eliminar Registo
              </button>

              <div className="flex items-center gap-2">
                {inspectingDriver.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateDriverStatus(inspectingDriver.id, 'approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Aprovar Condutor
                  </button>
                )}

                {inspectingDriver.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateDriverStatus(inspectingDriver.id, 'suspended', 'Suspenso pela administração')}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Suspender
                  </button>
                )}

                {inspectingDriver.status === 'pending' && !showRejectDialog && (
                  <button
                    type="button"
                    onClick={() => setShowRejectDialog(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Rejeitar...
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: HISTÓRICO DE CORRIDAS */}
      {/* ========================================================= */}
      {activeTab === 'trips' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs space-y-4 p-5 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Histórico de Corridas</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {filteredTrips.length} corridas
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Auditoria de rotas, tarifas praticadas e comissões da plataforma
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar corrida ou cliente..."
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {trips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllTrips}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zerar Viagens de Teste</span>
                </button>
              )}
            </div>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Nenhuma viagem registada no histórico.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredTrips.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                          #{t.id.slice(0, 8)}...
                        </span>
                        <span className="block text-[9px] text-neutral-400 font-medium">
                          {new Date(t.createdAt).toLocaleDateString('pt-MZ', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] leading-tight">
                      <div>
                        <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider mb-0.5">Passageiro</span>
                        <p className="font-bold text-neutral-900 dark:text-white truncate">{t.passengerName}</p>
                        {t.passengerPhone ? (
                          <a
                            href={`tel:${t.passengerPhone}`}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{t.passengerPhone}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-mono">Sem contacto</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider mb-0.5">Motorista</span>
                        <p className="font-bold text-neutral-900 dark:text-white truncate">
                          {t.driverName || <span className="text-neutral-400 font-normal">Sem motorista</span>}
                        </p>
                        {t.driverPhone ? (
                          <a
                            href={`tel:${t.driverPhone}`}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <Phone className="w-3 h-3 text-blue-600" />
                            <span>{t.driverPhone}</span>
                          </a>
                        ) : t.driverName ? (
                          <span className="text-[10px] text-neutral-400 font-mono">Sem telefone</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-2xl border border-neutral-100 dark:border-neutral-800/50">
                      <div className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">🟢</span>
                        <p className="truncate text-neutral-700 dark:text-neutral-300"><strong>Origem:</strong> {t.origin.address}</p>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-red-500 font-bold">🏁</span>
                        <p className="truncate text-neutral-700 dark:text-neutral-300"><strong>Destino:</strong> {t.destination.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-neutral-100 dark:border-neutral-800/60">
                      <div>
                        <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider">Valor total</span>
                        <span className="font-mono font-black text-sm text-neutral-900 dark:text-white">
                          {t.fareAmount} MT
                        </span>
                        <span className="text-[9px] text-neutral-400 capitalize block mt-0.5">
                          {t.paymentMethod} ({t.paymentStatus})
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider text-right">Comissão (15%)</span>
                        <span className="font-mono font-black text-sm text-red-600 dark:text-red-400 block text-right">
                          {t.fareBreakdown?.platformCommission || Math.round(t.fareAmount * 0.15)} MT
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteTrip(t.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold text-[10px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Viagem</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                      <th className="p-3">ID / Data</th>
                      <th className="p-3">Passageiro</th>
                      <th className="p-3">Motorista</th>
                      <th className="p-3">Origem → Destino</th>
                      <th className="p-3">Valor & Pagamento</th>
                      <th className="p-3">Comissão (15%)</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {filteredTrips.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                        <td className="p-3 font-mono text-[11px]">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {t.id.slice(0, 8)}...
                          </span>
                          <div className="text-[10px] text-neutral-400">
                            {new Date(t.createdAt).toLocaleDateString('pt-MZ', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="p-3">
                          <p className="font-bold text-neutral-900 dark:text-white">{t.passengerName}</p>
                          {t.passengerPhone ? (
                            <a
                              href={`tel:${t.passengerPhone}`}
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                              title="Ligar para o passageiro"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{t.passengerPhone}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-mono">Sem contacto</span>
                          )}
                        </td>

                        <td className="p-3">
                          <p className="font-bold text-neutral-900 dark:text-white">
                            {t.driverName || <span className="text-neutral-400 font-normal">Sem motorista</span>}
                          </p>
                          {t.driverPhone ? (
                            <a
                              href={`tel:${t.driverPhone}`}
                              className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                              title="Ligar para o motorista"
                            >
                              <Phone className="w-3 h-3 text-blue-600" />
                              <span>{t.driverPhone}</span>
                            </a>
                          ) : t.driverName ? (
                            <span className="text-[10px] text-neutral-400 font-mono">Sem telefone</span>
                          ) : null}
                        </td>

                        <td className="p-3 max-w-xs truncate">
                          <div className="truncate font-medium">{t.origin.address}</div>
                          <div className="truncate text-neutral-400">{t.destination.address}</div>
                        </td>

                        <td className="p-3 font-mono font-bold text-neutral-900 dark:text-white">
                          {t.fareAmount} MT{' '}
                          <span className="text-[10px] text-neutral-400 capitalize block font-normal">
                            {t.paymentMethod} ({t.paymentStatus})
                          </span>
                        </td>

                        <td className="p-3 font-mono font-bold text-red-600 dark:text-red-400">
                          {t.fareBreakdown?.platformCommission || Math.round(t.fareAmount * 0.15)} MT
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrip(t.id)}
                            title="Eliminar viagem"
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: TESOURARIA & SAQUES */}
      {/* ========================================================= */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs space-y-4 p-5 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Tesouraria & Saques de Moto-Taxistas</span>
                {pendingWithdrawalsCount > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                    {pendingWithdrawalsCount} Pendentes
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Pagamentos de saldos via M-Pesa, e-Mola e Transferência Bancária em Moçambique
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={withdrawalStatusFilter}
                onChange={(e) => setWithdrawalStatusFilter(e.target.value as any)}
                className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="all">Todos os Saques</option>
                <option value="pending">🟡 Pendentes</option>
                <option value="completed">🟢 Concluídos / Transferidos</option>
                <option value="rejected">🔴 Recusados</option>
              </select>
            </div>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 space-y-2">
              <CreditCard className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700" />
              <p className="text-sm font-semibold">Nenhum pedido de saque registado.</p>
              <p className="text-xs text-neutral-400">
                Quando os motoristas solicitarem levantamento, os dados M-Pesa e bancários surgirão aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredWithdrawals.map((w) => {
                  const accNumber = w.accountDetails.phoneNumber || w.accountDetails.accountNumber || '';
                  return (
                    <div
                      key={w.id}
                      className="p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">{w.driverName}</p>
                          <p className="text-[10px] text-neutral-400">{w.driverPhone}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            w.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                              : w.status === 'rejected'
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse'
                          }`}
                        >
                          {w.status === 'completed' ? 'Transferido' : w.status === 'rejected' ? 'Recusado' : 'Pendente'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <div>
                          <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider">Valor do Saque</span>
                          <span className="font-mono font-black text-base text-red-600 dark:text-red-400">
                            {w.amount} MT
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-neutral-400 uppercase font-black tracking-wider text-right">Método</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${
                              w.walletType === 'mpesa'
                                ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300'
                                : w.walletType === 'emola'
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {w.walletType === 'mpesa' ? 'M-Pesa' : w.walletType === 'emola' ? 'e-Mola' : 'Banco'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/50 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Número da Conta:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">{accNumber}</span>
                            {accNumber && (
                              <button
                                onClick={() => handleCopyText(accNumber, w.id)}
                                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                              >
                                {copiedId === w.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-neutral-500 text-right leading-tight">
                          Titular: {w.accountDetails.accountHolderName}
                          {w.accountDetails.bankName && ` · ${w.accountDetails.bankName}`}
                          {w.accountDetails.nib && ` · NIB: ${w.accountDetails.nib}`}
                        </p>
                      </div>

                      <div className="text-[10px] text-neutral-400 font-mono">
                        Solicitado em: {new Date(w.createdAt).toLocaleDateString('pt-MZ', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800/60">
                        {w.status !== 'completed' && (
                          <button
                            onClick={() => handleCompleteWithdrawal(w.id)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] shadow-sm active:scale-95"
                          >
                            Marcar Pago
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteWithdrawal(w.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Motorista</th>
                      <th className="p-3">Valor Solicitado</th>
                      <th className="p-3">Método / Destino</th>
                      <th className="p-3">Conta / Contacto</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {filteredWithdrawals.map((w) => {
                      const accNumber = w.accountDetails.phoneNumber || w.accountDetails.accountNumber || '';
                      return (
                        <tr key={w.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                          <td className="p-3 font-mono text-[11px] text-neutral-500">
                            {new Date(w.createdAt).toLocaleDateString('pt-MZ', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="p-3">
                            <p className="font-bold text-neutral-900 dark:text-white">{w.driverName}</p>
                            <p className="text-[10px] text-neutral-400">{w.driverPhone}</p>
                          </td>

                          <td className="p-3 font-mono font-black text-sm text-red-600 dark:text-red-400">
                            {w.amount} MT
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                w.walletType === 'mpesa'
                                  ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300'
                                  : w.walletType === 'emola'
                                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                  : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {w.walletType === 'mpesa' ? 'M-Pesa' : w.walletType === 'emola' ? 'e-Mola' : 'Banco'}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-neutral-900 dark:text-white">
                                {accNumber}
                              </span>
                              {accNumber && (
                                <button
                                  onClick={() => handleCopyText(accNumber, w.id)}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                                  title="Copiar número"
                                >
                                  {copiedId === w.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-neutral-400">
                              Titular: {w.accountDetails.accountHolderName}
                              {w.accountDetails.bankName && ` · ${w.accountDetails.bankName}`}
                              {w.accountDetails.nib && ` · NIB: ${w.accountDetails.nib}`}
                            </p>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                w.status === 'completed'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                  : w.status === 'rejected'
                                  ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300'
                                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse'
                              }`}
                            >
                              {w.status === 'completed'
                                ? 'Transferido'
                                : w.status === 'rejected'
                                ? 'Recusado'
                                : 'Pendente'}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {w.status !== 'completed' && (
                                <button
                                  onClick={() => handleCompleteWithdrawal(w.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-xs cursor-pointer"
                                >
                                  Marcar Pago
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteWithdrawal(w.id)}
                                title="Eliminar registo"
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: RADAR DA FROTA NO MAPA */}
      {/* ========================================================= */}
      {activeTab === 'map' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Radar Geográfico da Frota em Tempo Real</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {drivers.filter((d) => d.isOnline).length} Online
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Localização GPS dos motoristas com turnos abertos em Moçambique
              </p>
            </div>

            {/* District & Province Jumper */}
            <div className="flex items-center gap-2">
              <select
                value={fleetProvince}
                onChange={(e) => {
                  const newProv = e.target.value;
                  setFleetProvince(newProv);
                  const distList = MOZAMBIQUE_ADMIN_DIVISIONS[newProv] || [];
                  const firstDist = distList[0] || '';
                  setFleetDistrict(firstDist);
                  const coords = getDistrictCoordinates(newProv, firstDist);
                  setFleetCenter(coords);
                }}
                className="text-xs font-bold p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                {PROVINCES_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={fleetDistrict}
                onChange={(e) => {
                  const newDist = e.target.value;
                  setFleetDistrict(newDist);
                  const coords = getDistrictCoordinates(fleetProvince, newDist);
                  setFleetCenter(coords);
                }}
                className="text-xs font-bold p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                {(MOZAMBIQUE_ADMIN_DIVISIONS[fleetProvince] || []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-[520px] w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-inner">
            <GoogleMapContainer
              center={fleetCenter}
              zoom={13}
              drivers={drivers.filter((d) => d.currentLat && d.currentLng)}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: TARIFAS & COMISSÕES */}
      {/* ========================================================= */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Form Configuration */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="font-black text-lg text-neutral-900 dark:text-white">
                Regras Oficiais de Tarifas & Comissões
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Valores oficiais calculados automaticamente pelo algoritmo do TeleMoto+
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Tarifa Base de Partida (MT)
                  </label>
                  <input
                    type="number"
                    required
                    value={pricing.baseFare}
                    onChange={(e) => setPricing({ ...pricing, baseFare: Number(e.target.value) })}
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Preço fixado até 5 km (55 MT)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Quilómetros Inclusos na Base (km)
                  </label>
                  <input
                    type="number"
                    required
                    value={pricing.includedBaseKm ?? 5}
                    onChange={(e) => setPricing({ ...pricing, includedBaseKm: Number(e.target.value) })}
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Distância coberta pela tarifa base (5 km)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Preço por Km Adicional (MT/km)
                  </label>
                  <input
                    type="number"
                    required
                    value={pricing.pricePerKm}
                    onChange={(e) => setPricing({ ...pricing, pricePerKm: Number(e.target.value) })}
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">+15 MT por cada km excedente aos 5 km</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Tarifa Mínima de Corrida (MT)
                  </label>
                  <input
                    type="number"
                    required
                    value={pricing.minimumFare}
                    onChange={(e) => setPricing({ ...pricing, minimumFare: Number(e.target.value) })}
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Garante que nenhuma corrida custe menos de 55 MT</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Comissão TeleMoto+ (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={pricing.platformCommissionPercent}
                    onChange={(e) =>
                      setPricing({ ...pricing, platformCommissionPercent: Number(e.target.value) })
                    }
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono font-black text-red-600 dark:text-red-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Taxa Gateway M-Pesa / ZumboPay (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={pricing.gatewayFeePercent}
                    onChange={(e) =>
                      setPricing({ ...pricing, gatewayFeePercent: Number(e.target.value) })
                    }
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Taxa de Gateway Paga Por
                  </label>
                  <select
                    value={pricing.gatewayFeePaidBy}
                    onChange={(e) =>
                      setPricing({
                        ...pricing,
                        gatewayFeePaidBy: e.target.value as PlatformPricing['gatewayFeePaidBy'],
                      })
                    }
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                  >
                    <option value="platform">Plataforma (absorvida pelo TeleMoto+)</option>
                    <option value="driver">Motorista</option>
                    <option value="passenger">Passageiro</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                Guardar Configurações no Servidor
              </button>
            </form>
          </div>

          {/* Interactive Live Simulator */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="font-black text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-red-500" />
                <span>Simulador de Tarifas</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Regra: Até 5 km = 55 MT · A cada km a mais = +15 MT (ex: 6 km = 70 MT)
              </p>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Distância Percorrida:
                </span>
                <span className="font-mono font-black text-base text-neutral-900 dark:text-white">
                  {simulatedKm} km
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="40"
                step="0.5"
                value={simulatedKm}
                onChange={(e) => setSimulatedKm(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />

              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700/80 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tarifa Base (até {pricing.includedBaseKm ?? 5} km):</span>
                  <span className="font-mono font-semibold">{pricing.baseFare} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">
                    Km Adicional ({Math.max(0, simulatedKm - (pricing.includedBaseKm ?? 5)).toFixed(1)} km × {pricing.pricePerKm} MT):
                  </span>
                  <span className="font-mono font-semibold">{simulatedFare.distanceFare} MT</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-neutral-900 dark:text-white">Preço Total ao Passageiro:</span>
                  <span className="font-mono text-red-600 dark:text-red-400">{simulatedFare.totalFare} MT</span>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs text-red-900 dark:text-red-300">
                    <span>Comissão TeleMoto+ ({pricing.platformCommissionPercent}%):</span>
                    <span className="font-mono font-bold">{simulatedFare.platformCommission} MT</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    <span>Ganho Líquido do Motorista:</span>
                    <span className="font-mono">{simulatedFare.driverNetEarnings} MT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: DENÚNCIAS & SUPORTE */}
      {/* ========================================================= */}
      {activeTab === 'complaints' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs space-y-4 p-5 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Denúncias e Reclamações</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {filteredComplaints.length} registos
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Mediação de conflitos, assédio, segurança na condução e cobranças
              </p>
            </div>

            <select
              value={complaintStatusFilter}
              onChange={(e) => setComplaintStatusFilter(e.target.value as any)}
              className="p-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              <option value="all">Todos os Registos</option>
              <option value="pending">🟡 Pendentes</option>
              <option value="resolved">🟢 Resolvidas</option>
              <option value="dismissed">⚪ Descartadas</option>
            </select>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 space-y-1">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold">Nenhuma denúncia registada.</p>
              <p className="text-xs text-neutral-400">
                Todas as corridas e passageiros operam com normalidade e sem incidentes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {filteredComplaints.map((c) => (
                <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {c.reporterName}
                      </span>
                      <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full uppercase">
                        {c.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(c.createdAt).toLocaleDateString('pt-MZ')}
                      </span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 max-w-xl">{c.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResolveComplaint(c.id, 'resolved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                        >
                          Marcar Resolvida
                        </button>
                        <button
                          onClick={() => handleResolveComplaint(c.id, 'dismissed')}
                          className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Descartar
                        </button>
                      </>
                    )}
                    {c.status !== 'pending' && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: ANTI-ABUSO & SEGURANÇA */}
      {/* ========================================================= */}
      {activeTab === 'antiabuse' && antiAbuseConfig && (
        <div className="space-y-6 animate-fade-in text-neutral-900 dark:text-neutral-100 font-sans">
          
          {/* BARRIERS & PARAMETERS CONFIG */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/10">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Regras e Configurações Anti-Abuso</h3>
                <p className="text-xs text-neutral-400">Configure as três barreiras de segurança e penalizações do sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* BARRIER 1: GEOLOCATION */}
              <div className="p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/40 dark:border-neutral-700/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Barreira 1: Geodistância</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiAbuseConfig.gpsCheckEnabled}
                      onChange={(e) => setAntiAbuseConfig({ ...antiAbuseConfig, gpsCheckEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Valida se o passageiro está fisicamente no local de partida escolhido antes de liberar a listagem de motoristas.
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Tolerância Máxima (metros)
                  </label>
                  <input
                    type="number"
                    value={antiAbuseConfig.gpsDistanceToleranceMeters}
                    onChange={(e) => setAntiAbuseConfig({ ...antiAbuseConfig, gpsDistanceToleranceMeters: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* BARRIER 2: FREQUENCY / LIMITS */}
              <div className="p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/40 dark:border-neutral-700/30 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Barreira 2: Frequência</h4>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Controla o limite de cancelamentos rápidos antes de suspender temporariamente a conta do passageiro.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Max Cancelamentos
                    </label>
                    <input
                      type="number"
                      value={antiAbuseConfig.maxCancellations}
                      onChange={(e) => setAntiAbuseConfig({ ...antiAbuseConfig, maxCancellations: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Janela (minutos)
                    </label>
                    <input
                      type="number"
                      value={antiAbuseConfig.timeWindowMin}
                      onChange={(e) => setAntiAbuseConfig({ ...antiAbuseConfig, timeWindowMin: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* BARRIER 3: PENALTIES */}
              <div className="p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/40 dark:border-neutral-700/30 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Barreira 3: Penalizações</h4>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Define as multas financeiras automáticas por cancelamentos e o tempo que a conta ficará bloqueada.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Multa Passageiro (MT)
                    </label>
                    <input
                      type="number"
                      value={antiAbuseConfig.passengerPenaltyFee}
                      onChange={(e) => setAntiAbuseConfig({ ...antiAbuseConfig, passengerPenaltyFee: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Tempo Bloqueio (min)
                    </label>
                    <input
                      type="number"
                      value={antiAbuseConfig.suspensionDurationMin}
                      onChange={(e) => setAntiAbuseConfig({ ...antiAbuseConfig, suspensionDurationMin: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={async () => {
                  if (!user || !userProfile) return;
                  setUpdatingConfig(true);
                  const ok = await updateAntiAbuseSettings(user.uid, userProfile.fullName, antiAbuseConfig);
                  setUpdatingConfig(false);
                  if (ok) {
                    alert('Definições anti-abuso atualizadas com sucesso!');
                    loadAntiAbuseData();
                  } else {
                    alert('Erro ao atualizar definições.');
                  }
                }}
                disabled={updatingConfig}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer disabled:opacity-50 transition-all shrink-0"
              >
                {updatingConfig ? 'A Guardar...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* PENALIZED USERS LIST */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Utilizadores Penalizados</h3>
                  <p className="text-[11px] text-neutral-400">Contas suspensas ou com strikes ativos na plataforma</p>
                </div>
                <span className="text-xs bg-red-500 text-white font-black px-2.5 py-0.5 rounded-full">{penalizedUsers.length}</span>
              </div>

              {penalizedUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Nenhum utilizador penalizado ou suspenso de momento. 👍
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[350px] overflow-y-auto pr-1">
                  {penalizedUsers.map((u) => {
                    const isSuspended = u.suspendedUntil && u.suspendedUntil > Date.now();
                    return (
                      <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-neutral-900 dark:text-white text-sm">{u.fullName}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                              u.role === 'driver' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700' : 'bg-red-100 dark:bg-red-950/40 text-red-600'
                            }`}>{u.role}</span>
                          </div>
                          <p className="text-neutral-500 dark:text-neutral-400 font-mono text-[10px] mt-0.5">{u.phone}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-bold text-neutral-400">Strikes: <strong className="text-red-500 font-black">{u.strikesCount}</strong></span>
                            {u.pendingPenaltyFee && u.pendingPenaltyFee > 0 ? (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg">Multa: {u.pendingPenaltyFee} MT</span>
                            ) : null}
                          </div>
                          {isSuspended && (
                            <p className="text-[10px] text-red-500 font-bold mt-1.5 max-w-[240px] bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                              🚨 Suspenso por: "{u.suspensionReason}"
                            </p>
                          )}
                        </div>

                        <button
                          onClick={async () => {
                            if (window.confirm(`Deseja perdoar e reabilitar a conta de ${u.fullName}?`)) {
                              if (!user || !userProfile) return;
                              const ok = await liftUserPenalties(user.uid, userProfile.fullName, u.id, u.role);
                              if (ok) {
                                alert('Penalizações limpas com sucesso!');
                                loadAntiAbuseData();
                              }
                            }
                          }}
                          className="px-3.5 py-2 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                        >
                          Limpar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ABUSE REPORTS LIST */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Denúncias de Chamada Falsa</h3>
                  <p className="text-[11px] text-neutral-400">Alertas de passageiros ausentes registados pelos condutores</p>
                </div>
                <span className="text-xs bg-red-500 text-white font-black px-2.5 py-0.5 rounded-full">{abuseReports.length}</span>
              </div>

              {abuseReports.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Nenhum relatório de chamada falsa recente. 👍
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[350px] overflow-y-auto pr-1 space-y-3.5 text-xs">
                  {abuseReports.map((r) => {
                    const dateStr = new Date(r.createdAt).toLocaleDateString('pt-MZ', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isPending = r.status === 'pending';
                    return (
                      <div key={r.id} className="pt-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-red-600 dark:text-red-400 uppercase text-[10px]">Chamada Falsa</span>
                              <span className="text-neutral-300 dark:text-neutral-700">•</span>
                              <span className="text-[10px] font-mono text-neutral-400">{dateStr}</span>
                            </div>
                            <p className="mt-1 font-bold text-neutral-800 dark:text-neutral-200 leading-normal">
                              "{r.description}"
                            </p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                            r.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : r.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}>
                            {r.status}
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl space-y-1 text-[11px] border border-neutral-100 dark:border-neutral-800/50">
                          <p className="text-neutral-400 font-bold">
                            Motorista: <span className="text-neutral-800 dark:text-neutral-200 font-black">{r.driverName}</span>
                          </p>
                          <p className="text-neutral-400 font-bold">
                            Passageiro Alvo: <span className="text-neutral-800 dark:text-neutral-200 font-black">{r.passengerName}</span>
                          </p>
                        </div>

                        {isPending && (
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="text"
                              placeholder="Notas administrativas..."
                              value={reportActionNotes[r.id] || ''}
                              onChange={(e) => setReportActionNotes({ ...reportActionNotes, [r.id]: e.target.value })}
                              className="flex-1 p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-[11px] focus:ring-2 focus:ring-red-500 focus:outline-none"
                            />
                            <button
                              onClick={async () => {
                                if (!user || !userProfile) return;
                                const notes = reportActionNotes[r.id] || 'Confirmado pela administração.';
                                const ok = await resolveAbuseReport(user.uid, userProfile.fullName, r.id, 'resolved', notes);
                                if (ok) {
                                  alert('Denúncia resolvida e confirmada!');
                                  loadAntiAbuseData();
                                }
                              }}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all shrink-0"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={async () => {
                                if (!user || !userProfile) return;
                                const notes = reportActionNotes[r.id] || 'Descartado por falta de provas.';
                                const ok = await resolveAbuseReport(user.uid, userProfile.fullName, r.id, 'dismissed', notes);
                                if (ok) {
                                  alert('Denúncia descartada e perdoada.');
                                  loadAntiAbuseData();
                                }
                              }}
                              className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all shrink-0"
                            >
                              Descartar
                            </button>
                          </div>
                        )}

                        {r.adminNotes && (
                          <p className="text-[11px] text-neutral-400 italic bg-neutral-50 dark:bg-neutral-850/40 p-2.5 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                            Nota do Admin: "{r.adminNotes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: AUDITORIA & LOGS */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs space-y-4 p-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                Registo de Auditoria Administrativa
              </h2>
              <p className="text-xs text-neutral-400">
                Histórico imutável de ações executadas pelos gestores da plataforma
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-neutral-400">{logs.length} eventos</span>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Nenhum registo de auditoria recente.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {logs.map((log) => {
                const date = new Date(log.createdAt).toLocaleDateString('pt-MZ', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white font-mono">
                          {log.action}
                        </span>
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded font-mono uppercase">
                          {log.targetType}
                        </span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">{log.details}</p>
                    </div>

                    <div className="text-right text-[10px] text-neutral-400 font-mono shrink-0">
                      <div>{log.adminName}</div>
                      <div>{date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
