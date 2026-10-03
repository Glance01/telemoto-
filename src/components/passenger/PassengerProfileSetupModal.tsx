import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  X,
  Sparkles,
  Heart,
  CreditCard,
  Building,
} from 'lucide-react';
import { PROVINCES_LIST, MOZAMBIQUE_ADMIN_DIVISIONS } from '../../lib/mozambiqueLocations';

interface PassengerProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PassengerProfileSetupModal: React.FC<PassengerProfileSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState<string>(userProfile?.fullName || '');
  const [phone, setPhone] = useState<string>(userProfile?.phone || '');
  const [province, setProvince] = useState<string>(userProfile?.province || 'Inhambane');
  const [city, setCity] = useState<string>(userProfile?.city || 'Massinga');
  const [emergencyContactName, setEmergencyContactName] = useState<string>(
    userProfile?.emergencyContactName || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(
    userProfile?.emergencyContactPhone || ''
  );
  const [defaultPickupAddress, setDefaultPickupAddress] = useState<string>(
    userProfile?.defaultPickupAddress || ''
  );
  const [preferredPayment, setPreferredPayment] = useState<'mpesa' | 'card'>(
    (userProfile as any)?.preferredPayment === 'card' ? 'card' : 'mpesa'
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableDistricts = MOZAMBIQUE_ADMIN_DIVISIONS[province] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMsg('Por favor insere o teu nome completo.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMsg('Por favor insere um número de telefone móvel válido em Moçambique.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const res = await updateUserProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      province,
      city,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      defaultPickupAddress: defaultPickupAddress.trim(),
      preferredPayment,
      isProfileComplete: true,
    } as any);

    setSaving(false);

    if (res.success) {
      setSuccessMsg('Perfil de passageiro atualizado com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.error || 'Erro ao guardar dados do perfil.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className="p-5 sm:p-6 text-white transition-colors relative bg-red-600 dark:bg-red-700"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider opacity-90">
              Passo Importante
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Completar Perfil de Passageiro
          </h3>
          <p className="text-xs opacity-90 mt-1 leading-relaxed">
            Adiciona as tuas informações para viabilizar contactos diretos com os moto-taxistas e garantir segurança em todas as tuas viagens em Moçambique.
          </p>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Nome Completo */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-800">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Arnaldo Francisco Sitoe"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Telefone / M-Pesa */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-800">
              Número de Telefone (M-Pesa / e-Mola) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +258 84 123 4567"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* Localização / Província e Distrito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-800">Província</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <select
                  value={province}
                  onChange={(e) => {
                    const prov = e.target.value;
                    setProvince(prov);
                    const dists = MOZAMBIQUE_ADMIN_DIVISIONS[prov] || [];
                    if (dists.length > 0) setCity(dists[0]);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                >
                  {PROVINCES_LIST.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-800">Distrito / Cidade</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                >
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ponto de Recolha Frequente / Casa */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-800">
              Endereço / Ponto de Referência Frequente
            </label>
            <input
              type="text"
              value={defaultPickupAddress}
              onChange={(e) => setDefaultPickupAddress(e.target.value)}
              placeholder="Ex: Mercado Central / Paragem de Chapas"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          {/* Contacto de Emergência SOS */}
          <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
              <Shield className="w-4 h-4 text-red-600" />
              <span>Contacto de Emergência SOS (Opcional)</span>
            </div>
            <p className="text-[11px] text-red-600/90 leading-tight">
              A pessoa que será notificada caso uses o botão de emergência SOS durante uma viagem.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Nome do Familiar / Amigo"
                className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-medium focus:outline-none"
              />
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+258 84 999 0000"
                className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Método de Pagamento Preferido */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Forma de Pagamento Preferida
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPreferredPayment('mpesa')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  preferredPayment === 'mpesa'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>M-Pesa (Vodacom)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredPayment('card')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  preferredPayment === 'card'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cartão Bancário</span>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-neutral-100 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
            >
              Depois
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-2/3 py-3 px-4 text-xs font-extrabold uppercase tracking-wider rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Guardar Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
