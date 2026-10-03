import React, { useState } from 'react';
import { PayoutWalletType, DriverWallet } from '../../types';
import { requestDriverWithdrawal } from '../../services/driverService';
import {
  Wallet,
  Smartphone,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Send,
  Zap,
} from 'lucide-react';

interface DriverWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: DriverWallet | null;
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  driverId: string;
  onSuccess: () => void;
}

const MOZAMBIQUE_BANKS = [
  'Millennium BIM',
  'BCI (Banco Comercial e de Investimentos)',
  'Standard Bank Moçambique',
  'Moza Banco',
  'Absa Bank Moçambique',
  'Nedbank Moçambique',
  'First Capital Bank (FCB)',
  'Access Bank Moçambique',
  'FNB Moçambique',
  'Outro Banco Nacional',
];

export const DriverWithdrawalModal: React.FC<DriverWithdrawalModalProps> = ({
  isOpen,
  onClose,
  wallet,
  driverName,
  driverPhone,
  driverEmail,
  driverId,
  onSuccess,
}) => {
  const currentBalance = wallet?.balance || 0;

  const [walletType, setWalletType] = useState<PayoutWalletType>('mpesa');
  const [amount, setAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(
    driverPhone ? driverPhone.replace('+258', '').trim() : ''
  );
  const [accountHolderName, setAccountHolderName] = useState<string>(driverName || '');
  const [bankName, setBankName] = useState<string>(MOZAMBIQUE_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [nib, setNib] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    requestId: string;
    amount: number;
    balanceAfter: number;
    destinationLabel: string;
  } | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleSelectQuickPercent = (percent: number) => {
    if (currentBalance <= 0) return;
    const calculated = Math.floor(currentBalance * (percent / 100));
    setAmount(calculated.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentBalance <= 0) {
      setErrorMessage('Não tens saldo disponível para efetuar saque.');
      return;
    }

    if (numAmount < 50) {
      setErrorMessage('O valor mínimo de saque é de 50 MT.');
      return;
    }

    if (numAmount > currentBalance) {
      setErrorMessage(
        `O valor solicitado (${numAmount} MT) excede o teu saldo disponível (${currentBalance} MT).`
      );
      return;
    }

    if (!accountHolderName.trim()) {
      setErrorMessage('Por favor, indica o nome completo do titular da conta.');
      return;
    }

    if ((walletType === 'mpesa' || walletType === 'emola') && !phoneNumber.trim()) {
      setErrorMessage('Por favor, indica o número de telefone para recepção do valor.');
      return;
    }

    if (walletType === 'bank' && !accountNumber.trim() && !nib.trim()) {
      setErrorMessage('Por favor, indica o Número de Conta ou o NIB do banco.');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('258') ? cleanPhone : `258${cleanPhone}`;

      const res = await requestDriverWithdrawal({
        driverId,
        driverName,
        driverPhone: fullPhone,
        driverEmail,
        amount: numAmount,
        walletType,
        accountDetails: {
          phoneNumber: fullPhone,
          accountHolderName: accountHolderName.trim(),
          bankName: walletType === 'bank' ? bankName : undefined,
          accountNumber: walletType === 'bank' ? accountNumber.trim() : undefined,
          nib: walletType === 'bank' ? nib.trim() : undefined,
        },
      });

      if (res.success) {
        let destLabel = 'M-Pesa (Vodacom)';
        if (walletType === 'emola') destLabel = 'e-Mola (Movitel)';
        if (walletType === 'bank') destLabel = `${bankName} (Conta: ${accountNumber || nib})`;

        setSuccessData({
          requestId: res.requestId || `sq_${Date.now()}`,
          amount: numAmount,
          balanceAfter: res.balanceAfter ?? currentBalance - numAmount,
          destinationLabel: destLabel,
        });
        onSuccess();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao processar solicitação de saque.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative border border-neutral-200 dark:border-neutral-800 max-h-[92vh] overflow-y-auto space-y-5">
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success View */}
        {successData ? (
          <div className="text-center space-y-4 py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider rounded-full">
                Pedido Submetido com Sucesso
              </span>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white pt-1">
                Saque em Processamento!
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                O valor foi descontado da tua carteira TeleMoto+ e o pedido foi enviado para liquidação.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500">Valor do Saque:</span>
                <span className="text-lg font-black font-mono text-red-600 dark:text-red-400">
                  {successData.amount} MT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Destino:</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {successData.destinationLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Titular da Conta:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {accountHolderName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Saldo Restante na Carteira:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {successData.balanceAfter} MT
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-neutral-500">Tempo de Espera Estimado:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Dentro de minutos</span>
                </span>
              </div>
            </div>

            {/* Email dispatch notice */}
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-[11px] flex items-start gap-2 text-left">
              <Send className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                Notificação e detalhes de transferência despachados automaticamente para a administração da plataforma (<strong>brunomuhacha016@gmail.com</strong>).
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
            >
              FECHAR E VER CARTEIRA ATUALIZADA
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-black rounded-full uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5" />
                <span>Levantamento de Fundos</span>
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                Solicitar Saque de Ganhos
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Transfira o seu saldo disponível diretamente para o seu M-Pesa, e-Mola ou Banco.
              </p>
            </div>

            {/* Current Balance Pill */}
            <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Saldo Disponível TeleMoto+
                </span>
                <p className="text-2xl font-black font-mono">
                  {currentBalance.toLocaleString('pt-MZ')}{' '}
                  <span className="text-red-400 font-sans text-base">MT</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                  Taxa: 0 MT (Grátis)
                </span>
              </div>
            </div>

            {/* Destination Wallet Tabs */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                1. Escolha a Carteira de Destino
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* M-Pesa */}
                <button
                  type="button"
                  onClick={() => setWalletType('mpesa')}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    walletType === 'mpesa'
                      ? 'border-red-500 bg-red-50/70 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-2 ring-red-500/20 font-bold'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                    M
                  </span>
                  <div>
                    <p className="text-xs font-bold">M-Pesa</p>
                    <p className="text-[10px] text-neutral-400">Vodacom Moçambique</p>
                  </div>
                </button>

                {/* Banco */}
                <button
                  type="button"
                  onClick={() => setWalletType('bank')}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    walletType === 'bank'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Conta Bancária</p>
                    <p className="text-[10px] text-neutral-400">BIM / Standard / BCI</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Payout Destination Details */}
            <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                2. Dados da Conta para Recepção
              </span>

              {/* Account Holder Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Nome Completo do Titular
                </label>
                <input
                  type="text"
                  required
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Nome exato registado na conta"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:outline-none focus:border-red-500"
                />
              </div>

              {/* M-Pesa Phone */}
              {walletType === 'mpesa' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Número M-Pesa (Vodacom)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-neutral-400 pointer-events-none">
                      +258
                    </span>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="84 000 0000 ou 85 000 0000"
                      className="w-full pl-14 pr-3.5 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Bank Selection */}
              {walletType === 'bank' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Banco em Moçambique
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:outline-none focus:border-red-500"
                    >
                      {MOZAMBIQUE_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Número de Conta
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Ex: 123456789"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        NIB (Opcional / 21 dígitos)
                      </label>
                      <input
                        type="text"
                        value={nib}
                        onChange={(e) => setNib(e.target.value.replace(/\D/g, '').slice(0, 21))}
                        placeholder="000100000000000000000"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Amount Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  3. Valor a Levantar (MT)
                </label>
                <span className="text-[10px] text-neutral-400">Mínimo: 50 MT</span>
              </div>

              <div className="relative flex items-center">
                <input
                  type="number"
                  min="50"
                  max={currentBalance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full pl-4 pr-14 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-300 dark:border-neutral-700 text-base font-black font-mono focus:outline-none focus:border-red-500"
                />
                <span className="absolute right-4 text-sm font-bold text-red-600 pointer-events-none">
                  MT
                </span>
              </div>

              {/* Quick Percent Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectQuickPercent(25)}
                  disabled={currentBalance <= 0}
                  className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-40"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickPercent(50)}
                  disabled={currentBalance <= 0}
                  className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-40"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickPercent(100)}
                  disabled={currentBalance <= 0}
                  className="flex-1 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                >
                  100% (Tudo)
                </button>
              </div>
            </div>

            {/* Delivery SLA & Terms */}
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Prazo de Liquidação: Dentro de minutos</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Ao clicar em confirmar, o valor de <strong>{numAmount || 0} MT</strong> será descontado imediatamente da sua carteira TeleMoto+ e enviado diretamente para o seu destino. A administração (<strong>brunomuhacha016@gmail.com</strong>) recebe a notificação instantânea para liquidação célere.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-300 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading || currentBalance < 50}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-500/25 transition-transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>CONFIRMAR E SOLICITAR SAQUE ({numAmount || 0} MT)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
