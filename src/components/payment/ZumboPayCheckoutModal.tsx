import React, { useState, useEffect, useRef } from 'react';
import { PaymentMethodType, TripFareBreakdown } from '../../types';
import { initiateTripPayment, verifyPaymentStatus } from '../../services/paymentService';
import { playNotificationSound, triggerHapticFeedback } from '../../services/notificationService';
import {
  Smartphone,
  CreditCard,
  Lock,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

interface ZumboPayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentMethod: PaymentMethodType) => void;
  tripId: string;
  passengerId: string;
  driverId: string;
  driverName: string;
  amount: number;
  fareBreakdown?: TripFareBreakdown;
  initialMethod?: PaymentMethodType;
  initialPhone?: string;
}

export const ZumboPayCheckoutModal: React.FC<ZumboPayCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tripId,
  passengerId,
  driverId,
  driverName,
  amount,
  fareBreakdown,
  initialMethod = 'mpesa',
  initialPhone = '',
}) => {
  const [method, setMethod] = useState<PaymentMethodType>(
    initialMethod === 'emola' || initialMethod === 'cash' ? 'mpesa' : initialMethod
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    initialPhone.replace('+258', '').trim()
  );

  // Card details state
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [mpesaSecurePin, setMpesaSecurePin] = useState<string>('');
  const [otpResentNotice, setOtpResentNotice] = useState<boolean>(false);

  // Flow Steps: 'idle' | 'sending_stk' | 'waiting_authorization' | 'card_3dsecure' | 'processing' | 'success'
  const [flowState, setFlowStep] = useState<
    'idle' | 'sending_stk' | 'waiting_authorization' | 'card_3dsecure' | 'processing' | 'success'
  >('idle');

  const pollingRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const [ussdPin, setUssdPin] = useState<string>('');
  const [cardOtp, setCardOtp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const defaultBreakdown: TripFareBreakdown = fareBreakdown || {
    baseFare: amount,
    distanceFare: 0,
    totalFare: amount,
    platformCommission: Math.round(amount * 0.15),
    gatewayFee: Math.round(amount * 0.08),
    driverNetEarnings: Math.round(amount * 0.85),
  };

  // Polling tracker for waiting authorization
  const startStatusPolling = (reference: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await verifyPaymentStatus(reference);
        if (res.paid) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          playNotificationSound();
          triggerHapticFeedback();
          setSuccessMessage(`Pagamento de ${amount} MT via M-Pesa autorizado com sucesso!`);
          setFlowStep('success');

          setTimeout(() => {
            onSuccess('mpesa');
            onClose();
          }, 2200);
        } else if (attempts > 50) { // ~125 seconds timeout
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage('O tempo limite de autorização M-Pesa expirou. Por favor tente novamente.');
          setFlowStep('idle');
        }
      } catch (err) {
        console.warn('Error during polling status:', err);
      }
    }, 2500);
  };

  // Step 1: Initiate M-Pesa STK Push
  const handleInitiateMpesa = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setErrorMessage('Por favor introduza um número válido de Moçambique (84/85/86/87XXXXXXX).');
      return;
    }
    setErrorMessage('');
    setFlowStep('sending_stk');

    try {
      const result = await initiateTripPayment(
        tripId,
        passengerId,
        driverId,
        amount,
        method,
        defaultBreakdown,
        cleanPhone
      );

      if (result.success) {
        setFlowStep('waiting_authorization');
        // Start waiting for the physical phone PIN prompt response
        startStatusPolling(result.gatewayReference || tripId);
      } else {
        setErrorMessage(result.message || 'Falha ao iniciar pagamento M-Pesa no gateway ZumboPay.');
        setFlowStep('idle');
      }
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor do gateway ZumboPay.');
      setFlowStep('idle');
    }
  };

  // Step 1: Initiate Card Payment via ZumboPay Hosted Portal
  const handleInitiateCardCheckout = async () => {
    setErrorMessage('');
    setFlowStep('sending_stk');

    try {
      const result = await initiateTripPayment(
        tripId,
        passengerId,
        driverId,
        amount,
        'card',
        defaultBreakdown,
        phoneNumber
      );

      if (result.success && result.checkoutUrl) {
        // Open ZumboPay Secure Hosted Checkout portal in a new tab
        window.open(result.checkoutUrl, '_blank');

        setFlowStep('waiting_authorization');
        // Start polling ZumboPay status for this card transaction
        startStatusPolling(result.gatewayReference || tripId);
      } else {
        setErrorMessage(result.message || 'Falha ao iniciar pagamento por Cartão no gateway ZumboPay.');
        setFlowStep('idle');
      }
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor do gateway ZumboPay.');
      setFlowStep('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 relative my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={flowState === 'processing'}
          className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-full transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ZumboPay Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-md shrink-0">
            ZP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-neutral-900 dark:text-white uppercase tracking-tight">
                ZumboPay Checkout
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> 258-Bit SSL
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Gateway Oficial Moçambique • Merchant: TeleMoto+
            </p>
          </div>
        </div>

        {/* Amount & Trip Summary Badge */}
        <div className="bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/30 p-4 rounded-2xl border border-red-200/80 dark:border-red-800/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Valor Total da Corrida
            </span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono tracking-tight">
              {amount} MT
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold text-neutral-900 dark:text-white block">
              Condutor: {driverName}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Viagem #{tripId.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* IDLE STATE: Choose Payment Operator */}
        {flowState === 'idle' && (
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
              Selecione o Método de Pagamento
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Vodacom M-Pesa */}
              <button
                type="button"
                onClick={() => setMethod('mpesa')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  method === 'mpesa'
                    ? 'border-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold ring-2 ring-red-500/20 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    M
                  </span>
                  {method === 'mpesa' && <CheckCircle2 className="w-5 h-5 text-red-600" />}
                </div>
                <div className="mt-3">
                  <p className="font-black text-sm">Vodacom M-Pesa</p>
                  <p className="text-[10px] text-neutral-400">USSD STK Push (*150#)</p>
                </div>
              </button>

              {/* Cartão Bancário */}
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  method === 'card'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="w-7 h-7 text-blue-600" />
                  {method === 'card' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="mt-3">
                  <p className="font-black text-sm">Cartão Bancário</p>
                  <p className="text-[10px] text-neutral-400">Visa / Mastercard / SIMO</p>
                </div>
              </button>
            </div>

            {/* M-Pesa Form */}
            {method === 'mpesa' && (
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3 animate-fade-in">
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Número de Telemóvel Vodacom M-Pesa
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-black text-neutral-400 pointer-events-none">
                    +258
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="84 000 0000 ou 85 000 0000"
                    className="w-full pl-14 pr-4 py-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-extrabold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  Será enviado um prompt automático do Vodacom M-Pesa (*150#) para o ecrã do seu telemóvel para aprovar os {amount} MT.
                </p>

                <button
                  type="button"
                  onClick={handleInitiateMpesa}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>PAGAR COM VODACOM M-PESA ({amount} MT)</span>
                </button>
              </div>
            )}

            {/* Card Form */}
            {method === 'card' && (
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3 animate-fade-in text-center">
                <div className="relative w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-950/20 text-blue-600 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-neutral-900 dark:text-white">
                    Checkout Seguro Zumbo Pay
                  </p>
                  <p className="text-xs text-neutral-500 leading-normal max-w-xs mx-auto">
                    Ao clicar abaixo, abrirá um novo separador seguro com o portal de pagamentos oficial do Zumbo Pay para introduzir os dados do seu cartão Visa ou Mastercard.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInitiateCardCheckout}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>PAGAR {amount} MT COM CARTÃO BANCÁRIO</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: SENDING STK PUSH */}
        {flowState === 'sending_stk' && (
          <div className="p-6 text-center space-y-4 py-8 animate-fade-in">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></span>
              <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Smartphone className="w-7 h-7 animate-bounce" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white uppercase tracking-tight">
                A disparar comando USSD STK Push...
              </h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                A enviar solicitação para +258 {phoneNumber}. Aguarde o ecrã de inserção do PIN no seu telemóvel...
              </p>
            </div>
          </div>
        )}

        {/* STEP: WAITING NATIVE USSD AUTHORIZATION (Vodacom M-Pesa / e-Mola / mKesh / Card Checkout) */}
        {flowState === 'waiting_authorization' && (
          <div className="p-6 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center space-y-5 animate-scale-up font-sans">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full shadow-inner">
              <Smartphone className="w-10 h-10 animate-bounce" />
              <div className="absolute inset-0 border-4 border-t-red-600 border-neutral-200 rounded-full animate-spin"></div>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="font-black text-base text-neutral-900 dark:text-white uppercase tracking-tight">
                {method === 'card' ? 'Aguardando Pagamento...' : 'Autorização Pendente...'}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xs mx-auto">
                {method === 'card'
                  ? 'Abrimos o portal de pagamento seguro do Zumbo Pay. Por favor, complete o pagamento com o seu cartão bancário no portal oficial.'
                  : `Enviámos uma solicitação de transação oficial para o número +258 ${phoneNumber}.`}
              </p>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl text-left space-y-1.5">
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  O que fazer agora?
                </p>
                {method === 'card' ? (
                  <ol className="list-decimal list-inside text-[11px] text-amber-700 dark:text-amber-300 space-y-1 leading-normal">
                    <li>Conclua com segurança o pagamento no portal oficial do Zumbo Pay.</li>
                    <li>Esta página detetará a aprovação e ativará a corrida automaticamente!</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside text-[11px] text-amber-700 dark:text-amber-300 space-y-1 leading-normal">
                    <li>Pegue no seu telemóvel físico agora.</li>
                    <li>Insira o seu <strong>PIN secreto</strong> no menu de diálogo oficial da operadora que apareceu no seu ecrã.</li>
                    <li>Esta página detetará o pagamento automaticamente e continuará a viagem!</li>
                  </ol>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setFlowStep('idle');
                }}
                className="px-5 py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Cancelar Ordem
              </button>
            </div>
          </div>
        )}



        {/* STEP: PROCESSING */}
        {flowState === 'processing' && (
          <div className="p-6 text-center space-y-3 py-8 animate-fade-in">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto" />
            <h4 className="font-black text-sm text-neutral-900 dark:text-white uppercase tracking-tight">
              A comunicar com os servidores ZumboPay...
            </h4>
            <p className="text-xs text-neutral-500">
              A processar ordem de pagamento com autorização bancária...
            </p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {flowState === 'success' && (
          <div className="p-6 text-center space-y-3 py-8 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border-2 border-emerald-500 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h4 className="font-black text-base text-emerald-900 dark:text-emerald-200 uppercase tracking-tight">
              PAGAMENTO CONFIRMADO!
            </h4>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {successMessage || 'Pagamento registado com sucesso via ZumboPay.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
