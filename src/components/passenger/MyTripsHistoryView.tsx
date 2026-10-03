import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';
import { Trip, UserRole } from '../../types';
import { TripReceiptModal } from './TripReceiptModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Route,
  Navigation,
  MapPin,
  Clock,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Bike,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ChevronRight,
  Receipt,
  RotateCcw,
  Sparkles,
  ArrowRight,
  LogIn,
} from 'lucide-react';

interface MyTripsHistoryViewProps {
  onNavigateHome: () => void;
  onOpenAuth: (mode?: 'login' | 'register', role?: UserRole, prompt?: string) => void;
}

export const MyTripsHistoryView: React.FC<MyTripsHistoryViewProps> = ({
  onNavigateHome,
  onOpenAuth,
}) => {
  const { user, userProfile, role } = useAuth();
  const { activeTrip, setOriginPoint, setDestinationPoint } = useRide();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReceiptTrip, setSelectedReceiptTrip] = useState<Trip | null>(null);

  // Real-time Firestore subscription for user's trips
  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query without compound orderBy to avoid Firestore composite index requirement
    const tripsRef = collection(db, 'trips');
    const fieldToQuery = role === 'driver' ? 'driverId' : 'passengerId';
    const q = query(tripsRef, where(fieldToQuery, '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Trip[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        // Client-side sort by createdAt descending (most recent first)
        list.sort((a, b) => {
          const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime();
          const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setTrips(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Error fetching trip history:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  // Compute summary metrics
  const completedTrips = trips.filter((t) => t.status === 'trip_completed' || t.status === 'paid');
  const totalKmTraveled = completedTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
  const totalSpentMT = completedTrips.reduce((acc, t) => acc + (t.fareAmount || 0), 0);

  // Filter trips by status and search text
  const filteredTrips = trips.filter((t) => {
    // Filter by status tab
    if (statusFilter === 'completed' && t.status !== 'trip_completed' && t.status !== 'paid') return false;
    if (statusFilter === 'cancelled' && !t.status.startsWith('cancelled')) return false;
    if (
      statusFilter === 'active' &&
      !['requested', 'searching_driver', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'trip_started', 'payment_pending'].includes(t.status)
    ) {
      return false;
    }

    // Filter by search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const originMatch = t.origin?.address?.toLowerCase().includes(q) || false;
      const destMatch = t.destination?.address?.toLowerCase().includes(q) || false;
      const driverMatch = t.driverName?.toLowerCase().includes(q) || false;
      const passengerMatch = t.passengerName?.toLowerCase().includes(q) || false;
      return originMatch || destMatch || driverMatch || passengerMatch;
    }

    return true;
  });

  const handleRepeatTrip = (trip: Trip) => {
    if (trip.origin && trip.destination) {
      setOriginPoint(trip.origin);
      setDestinationPoint(trip.destination);
      onNavigateHome();
    }
  };

  const formatTripDate = (timestamp?: number | string) => {
    if (!timestamp) return 'Data não disponível';
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trip_completed':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Concluída
          </span>
        );
      case 'trip_started':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
            <Bike className="w-3 h-3" />
            Em Viagem
          </span>
        );
      case 'driver_arriving':
      case 'driver_assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
            <Clock className="w-3 h-3" />
            Motorista a Caminho
          </span>
        );
      case 'driver_arrived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-pulse">
            <MapPin className="w-3 h-3" />
            No Local de Encontro
          </span>
        );
      case 'requested':
      case 'searching_driver':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <Navigation className="w-3 h-3 animate-spin" />
            A Procurar Condutor
          </span>
        );
      case 'cancelled':
      case 'cancelled_by_passenger':
      case 'cancelled_by_driver':
      case 'cancelled_by_system':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            <XCircle className="w-3 h-3" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'card':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
            <CreditCard className="w-3.5 h-3.5" />
            Cartão Bancário
          </span>
        );
      case 'mpesa':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
            <Smartphone className="w-3.5 h-3.5" />
            M-Pesa (Vodacom)
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6 font-sans pb-28 sm:pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/25">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                As minhas viagens
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Histórico detalhado com distâncias, preços, localizações e motoristas
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Navigation className="w-4 h-4" />
          <span>Pedir no Mapa</span>
        </button>
      </div>

      {/* UNAUTHENTICATED STATE */}
      {!user && (
        <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
            <LogIn className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Inicia sessão para ver o teu histórico
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Cria uma conta ou entra com o teu número de telefone para acompanhar todas as viagens realizadas no TeleMoto+.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenAuth('login', 'passenger', 'Entra para consultar as tuas viagens realizadas.')}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/25 transition-transform active:scale-95 cursor-pointer"
          >
            Entrar ou Criar Conta
          </button>
        </div>
      )}

      {/* AUTHENTICATED CONTENT */}
      {user && (
        <>
          {/* ACTIVE TRIP CARD ALERT (IF IN PROGRESS) */}
          {activeTrip && (
            <div className="p-5 bg-gradient-to-r from-red-600/10 via-amber-500/10 to-transparent dark:from-red-950/30 dark:to-neutral-900 rounded-3xl border-2 border-red-500 shadow-md space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                    Viagem Atual em Curso
                  </span>
                </div>
                <span className="text-base font-black font-mono text-red-600 dark:text-red-400">
                  {activeTrip.biddingPrice || activeTrip.fareAmount ? `${activeTrip.biddingPrice || activeTrip.fareAmount} MT` : 'A combinar'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-neutral-500 dark:text-neutral-400 text-[11px] font-bold">ROTA</p>
                  <p className="text-neutral-800 dark:text-neutral-200 font-semibold truncate">
                    <span className="text-emerald-600 font-bold">Origem: </span>
                    {activeTrip.origin.address}
                  </p>
                  <p className="text-neutral-800 dark:text-neutral-200 font-semibold truncate">
                    <span className="text-red-600 font-bold">Destino: </span>
                    {activeTrip.destination.address}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-neutral-500 dark:text-neutral-400 text-[11px] font-bold">CONDUTOR</p>
                  <p className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {activeTrip.driverName || 'A aguardar condutor...'}
                  </p>
                  <p className="text-neutral-500 text-[11px]">
                    Distância: <strong>{activeTrip.distanceKm.toFixed(1)} km</strong> (~{activeTrip.estimatedDurationMin} min)
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Ver em Tempo Real no Mapa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* METRICS SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-center shadow-xs">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">
                Viagens Feitas
              </p>
              <p className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono mt-0.5">
                {completedTrips.length}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-center shadow-xs">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">
                Quilómetros
              </p>
              <p className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white font-mono mt-0.5">
                {totalKmTraveled.toFixed(1)} <span className="text-xs font-sans text-neutral-400">km</span>
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-center shadow-xs">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">
                Total Gasto
              </p>
              <p className="text-lg sm:text-2xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
                {totalSpentMT} <span className="text-xs font-sans text-neutral-400">MT</span>
              </p>
            </div>
          </div>

          {/* SEARCH & STATUS FILTER ROW */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex p-1 bg-neutral-200/70 dark:bg-neutral-800/80 rounded-2xl text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                }`}
              >
                Todas ({trips.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'completed'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                }`}
              >
                Concluídas ({completedTrips.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('cancelled')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'cancelled'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                }`}
              >
                Canceladas
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por destino ou motorista..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-xs"
              />
            </div>
          </div>

          {/* TRIP CARDS LIST */}
          {loading ? (
            <div className="p-12 text-center text-neutral-400 space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold">A carregar o teu histórico de viagens...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-12 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center space-y-3 shadow-xs">
              <Clock className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700" />
              <div className="space-y-1">
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                  {searchQuery ? 'Nenhuma viagem encontrada com essa pesquisa' : 'Nenhuma viagem realizada ainda'}
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {searchQuery
                    ? 'Tenta pesquisar por outro nome de bairro, rua ou motorista.'
                    : 'Pede a tua primeira corrida no mapa para começar a acumular o teu histórico.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="mt-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  Ir para o Mapa
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTrips.map((trip) => {
                const isCompleted = trip.status === 'trip_completed' || trip.status === 'paid';

                return (
                  <div
                    key={trip.id}
                    className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs hover:border-red-500/50 transition-all space-y-4"
                  >
                    {/* Top Row: Date, Status Badge, Price */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white">
                            {formatTripDate(trip.createdAt)}
                          </p>
                          <div className="mt-0.5">
                            {getStatusBadge(trip.status)}
                          </div>
                        </div>
                      </div>

                      {/* PREÇO EM DESTAQUE */}
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-black font-mono text-red-600 dark:text-red-400">
                          {trip.biddingPrice || trip.fareAmount ? `${trip.biddingPrice || trip.fareAmount} MT` : 'A combinar'}
                        </p>
                        <div className="flex justify-end mt-0.5">
                          {getPaymentBadge(trip.paymentMethod)}
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Route (Origem e Destino) + Distância */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Route Addresses */}
                      <div className="md:col-span-8 space-y-2 relative pl-6">
                        {/* Connecting Track Line */}
                        <div className="absolute left-[9px] top-[14px] bottom-[14px] w-0.5 border-l-2 border-dashed border-neutral-300 dark:border-neutral-700"></div>

                        {/* Origem */}
                        <div className="relative">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Ponto de Partida
                          </p>
                          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1">
                            {trip.origin?.address || 'Localização de Origem'}
                          </p>
                        </div>

                        {/* Destino */}
                        <div className="relative pt-1">
                          <div className="absolute -left-6 top-2 w-3 h-3 rounded-md bg-red-600 ring-4 ring-red-600/20"></div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                            Destino Final
                          </p>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                            {trip.destination?.address || 'Localização de Destino'}
                          </p>
                        </div>
                      </div>

                      {/* DISTÂNCIA & TEMPO */}
                      <div className="md:col-span-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col justify-center gap-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-xs font-bold">
                          <Navigation className="w-3.5 h-3.5 text-red-500" />
                          <span>Distância Percorrida:</span>
                        </div>
                        <p className="text-base font-black font-mono text-neutral-900 dark:text-white">
                          {trip.distanceKm ? trip.distanceKm.toFixed(1) : '0.0'} km
                        </p>
                        <p className="text-[10px] text-neutral-400 font-medium">
                          Duração est.: ~{trip.estimatedDurationMin || 10} min
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: NOME DO MOTORISTA e Ações */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {/* O NOME DO MOTORISTA */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-red-500 shrink-0">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-neutral-400">
                            Motorista
                          </p>
                          {trip.driverName ? (
                            <p className="font-extrabold text-neutral-900 dark:text-white truncate">
                              {trip.driverName}
                              {trip.plateNumber && (
                                <span className="ml-1 text-[10px] font-mono text-neutral-500 font-normal">
                                  ({trip.plateNumber})
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="font-medium text-neutral-400 italic">
                              Não atribuído
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* Repeat Trip Button */}
                        <button
                          type="button"
                          onClick={() => handleRepeatTrip(trip)}
                          title="Fazer novamente esta mesma rota"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Repetir</span>
                        </button>

                        {/* View Receipt Modal */}
                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptTrip(trip)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 text-red-600 dark:text-red-400 font-black text-[11px] rounded-xl transition-all cursor-pointer active:scale-95"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Ver Recibo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TRIP RECEIPT MODAL */}
      {selectedReceiptTrip && user && (
        <TripReceiptModal
          trip={selectedReceiptTrip}
          onClose={() => setSelectedReceiptTrip(null)}
          currentUserId={user.uid}
          isDriver={role === 'driver'}
        />
      )}
    </div>
  );
};
