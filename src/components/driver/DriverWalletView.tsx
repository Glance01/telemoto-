import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DriverWallet, WalletTransaction, WithdrawalRequest } from '../../types';
import {
  getDriverWallet,
  getDriverTransactions,
  getDriverWithdrawalRequests,
} from '../../services/driverService';
import { DriverWithdrawalModal } from './DriverWithdrawalModal';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Building2,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export const DriverWalletView: React.FC = () => {
  const { user, driverProfile, userProfile } = useAuth();
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadWalletData();
  }, [user]);

  const loadWalletData = async () => {
    if (!user) return;
    setLoading(true);
    const [w, tx, wq] = await Promise.all([
      getDriverWallet(user.uid),
      getDriverTransactions(user.uid),
      getDriverWithdrawalRequests(user.uid),
    ]);
    setWallet(w);
    setTransactions(tx);
    setWithdrawals(wq);
    setLoading(false);
  };

  const driverName = driverProfile?.fullName || userProfile?.fullName || 'Motorista TeleMoto+';
  const driverPhone = driverProfile?.phone || userProfile?.phone || '';
  const driverEmail = driverProfile?.email || user?.email || '';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-28 sm:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Carteira & Rendimentos do Motorista
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Registo detalhado dos rendimentos feitos em dinheiro vivo este mês e histórico de corridas.
          </p>
        </div>
        <button
          onClick={() => setShowPayoutModal(true)}
          className="px-5 py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-neutral-700/50"
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Informações de Saque</span>
        </button>
      </div>

      {/* Phase 1 Hand Cash Explanatory Banner */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl text-emerald-950 dark:text-emerald-200 text-xs space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>PAGAMENTO EM DINHEIRO VIVO (FASE 1)</span>
        </div>
        <p className="leading-relaxed">
          Nesta primeira fase, todas as corridas são pagas pelo passageiro em <strong>dinheiro vivo (em mão)</strong> diretamente a si. O valor que você cobra entra imediatamente na sua conta como <strong>Rendimento Feito Este Mês</strong>, garantindo transparência total e controlo da sua faturação diária.
        </p>
      </div>

      {/* Main Earnings & Balance Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rendimento Feito Este Mês Card (HERO) */}
        <div className="p-6 bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white rounded-3xl shadow-xl shadow-red-600/25 space-y-2 border border-red-500/40">
          <div className="flex items-center justify-between text-red-100 text-xs font-black uppercase tracking-wider">
            <span>RENDIMENTO FEITO ESTE MÊS</span>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="pt-1">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {wallet ? (wallet.monthlyEarnings ?? wallet.totalEarned).toLocaleString('pt-MZ') : '0'}
            </span>{' '}
            <span className="text-xl font-black text-white font-mono">MT</span>
          </div>
          <p className="text-[11px] text-red-100 font-medium pt-1">
            Ganhos em dinheiro recebidos nas viagens deste mês
          </p>
        </div>

        {/* Total Acumulado */}
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold uppercase tracking-wider">
            <span>TOTAL ACUMULADO</span>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="pt-1">
            <span className="text-3xl font-black font-mono text-neutral-900 dark:text-white">
              {wallet ? wallet.totalEarned.toLocaleString('pt-MZ') : '0'}
            </span>{' '}
            <span className="text-base font-bold text-emerald-600 font-mono">MT</span>
          </div>
          <p className="text-[11px] text-neutral-400 pt-1">
            {wallet ? wallet.totalTripsCount : 0} corridas realizadas
          </p>
        </div>

        {/* Saldo de Levantamento Digital (Fase 1: 0 MT) */}
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-bold uppercase tracking-wider">
            <span>SALDO P/ LEVANTAMENTO</span>
            <ShieldCheck className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="pt-1">
            <span className="text-3xl font-black font-mono text-neutral-900 dark:text-white">
              {wallet ? (wallet.balance > 0 ? wallet.balance.toLocaleString('pt-MZ') : '0') : '0'}
            </span>{' '}
            <span className="text-base font-bold text-neutral-400 font-mono">MT</span>
          </div>
          <p className="text-[11px] text-neutral-400 pt-1">
            Dinheiro recebido 100% em mão pelo condutor
          </p>
        </div>
      </div>

      {/* Recent Withdrawals (Saques Solicitados) */}
      {withdrawals.length > 0 && (
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              <span>Pedidos de Saque Recentes</span>
            </h3>
            <span className="text-[11px] text-neutral-400">
              Processamento em minutos
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {withdrawals.map((w) => {
              const dateStr = new Date(w.createdAt).toLocaleDateString('pt-MZ', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={w.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      {w.walletType === 'bank' ? <Building2 className="w-4 h-4" /> : 'MT'}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">
                        Saque {w.walletType === 'mpesa' ? 'M-Pesa' : w.walletType === 'emola' ? 'e-Mola' : 'Banco'}:{' '}
                        {w.accountDetails.phoneNumber || w.accountDetails.accountNumber}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {dateStr} • Titular: {w.accountDetails.accountHolderName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <p className="font-mono font-black text-sm text-red-600">
                      -{w.amount} MT
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      w.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : w.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {w.status === 'completed'
                        ? 'Liquidado'
                        : w.status === 'rejected'
                        ? 'Recusado'
                        : 'Em minutos...'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-neutral-900">
          Extrato do Ledger Financeiro
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400">A carregar extrato...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-700">Ainda não existem transações.</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Quando completares a tua primeira corrida, os ganhos e as deduções de comissão aparecerão aqui detalhados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {transactions.map((tx) => {
              const isCredit = tx.amount > 0;
              const date = new Date(tx.createdAt).toLocaleDateString('pt-MZ', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-800">{tx.description}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{date}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-mono font-bold text-sm ${
                        isCredit ? 'text-emerald-600' : 'text-neutral-800'
                      }`}
                    >
                      {isCredit ? '+' : ''}
                      {tx.amount} MT
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      Saldo: {tx.balanceAfter} MT
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payout Withdrawal Modal */}
      {showPayoutModal && (
        <DriverWithdrawalModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          wallet={wallet}
          driverId={user?.uid || ''}
          driverName={driverName}
          driverPhone={driverPhone}
          driverEmail={driverEmail}
          onSuccess={() => {
            loadWalletData();
          }}
        />
      )}
    </div>
  );
};

