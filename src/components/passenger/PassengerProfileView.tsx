import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { compressImageToBase64 } from '../../utils/imageCompressor';
import {
  requestWebNotificationPermission,
  scheduleTestBackgroundNotification,
  playNotificationSound,
} from '../../services/notificationService';
import {
  User,
  Camera,
  Upload,
  Trash2,
  LogOut,
  Shield,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HeartHandshake,
  BellRing,
  Sparkles,
} from 'lucide-react';

interface PassengerProfileViewProps {
  onOpenSOS: () => void;
}

export const PassengerProfileView: React.FC<PassengerProfileViewProps> = ({ onOpenSOS }) => {
  const { user, userProfile, updateUserProfile, deleteAccount, logout } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [emergencyPhone, setEmergencyPhone] = useState(userProfile?.emergencyPhone || '');
  const [photoUrl, setPhotoUrl] = useState(userProfile?.photoUrl || '');

  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal confirmation for account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      setErrorMsg(null);
      const base64 = await compressImageToBase64(file, {
        maxWidth: 480,
        maxHeight: 480,
        quality: 0.8,
      });

      setPhotoUrl(base64);

      // Auto-save photo to Firestore
      const res = await updateUserProfile({ photoUrl: base64 });
      if (res.success) {
        setSuccessMsg('Foto de perfil atualizada com sucesso!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg('Não foi possível gravar a foto: ' + res.error);
      }
    } catch (err: any) {
      console.error('Photo compression error:', err);
      setErrorMsg('Erro ao processar a imagem. Tenta outra foto.');
    } finally {
      setCompressing(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateUserProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      emergencyPhone: emergencyPhone.trim(),
      photoUrl: photoUrl || undefined,
    });

    setSaving(false);
    if (res.success) {
      setSuccessMsg('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || 'Erro ao guardar dados.');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const res = await deleteAccount();
    setDeleting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao apagar conta.');
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-6 sm:my-10 px-4 space-y-6 pb-28 sm:pb-12">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-200/80 space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* Avatar with Camera Overlay */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-red-100 border-4 border-white shadow-lg flex items-center justify-center text-red-600 font-black text-3xl">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName || 'Passageiro'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{fullName?.[0]?.toUpperCase() || 'P'}</span>
              )}
            </div>

            {/* Upload Button */}
            <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-red-500 text-white shadow-md flex items-center justify-center cursor-pointer hover:bg-red-600 transition-transform active:scale-95">
              {compressing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={compressing}
                className="hidden"
              />
            </label>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mt-3">
            {fullName || 'Passageiro TeleMoto+'}
          </h2>
          <p className="text-xs text-neutral-500 font-mono">
            {phone || user?.email || 'Conta de Passageiro'}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>Passageiro Verificado • Moçambique 🇲🇿</span>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Information tip about profile photo */}
        <div className="p-3.5 bg-red-50/70 border border-red-200/80 rounded-2xl text-xs text-red-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-red-600" />
            Foto de Perfil para Identificação
          </p>
          <p className="text-[11px] text-red-800/90 leading-relaxed">
            A tua foto de perfil é visível para o moto-taxista durante a recolha, permitindo que te
            encontre de forma rápida e segura nas ruas.
          </p>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full text-xs p-3 bg-neutral-50 border border-neutral-200 rounded-2xl font-medium focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
              placeholder="O teu nome e apelido"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Contacto Principal (M-Pesa / Telefone)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full text-xs p-3 bg-neutral-50 border border-neutral-200 rounded-2xl font-medium focus:ring-2 focus:ring-red-500 focus:bg-white outline-none font-mono"
              placeholder="+258 84 000 0000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Contacto de Emergência (Opcional)
            </label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full text-xs p-3 bg-neutral-50 border border-neutral-200 rounded-2xl font-medium focus:ring-2 focus:ring-red-500 focus:bg-white outline-none font-mono"
              placeholder="+258 82/84/86/87 000 0000"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Guardar Alterações do Perfil</span>
          </button>
        </form>
      </div>

      {/* Notification & Background Push Settings */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-200 space-y-3">
        <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-amber-500" />
          Notificações no Telemóvel & Segundo Plano
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Receba notificações sonoras e no ecrã quando o condutor aceitar a corrida ou chegar ao ponto de partida, mesmo com o aplicativo fechado ou telemóvel bloqueado.
        </p>

        <button
          type="button"
          onClick={async () => {
            setTestingPush(true);
            const perm = await requestWebNotificationPermission();
            if (perm === 'granted') {
              playNotificationSound('success');
            }
            scheduleTestBackgroundNotification(5);
            setTimeout(() => setTestingPush(false), 5500);
          }}
          disabled={testingPush}
          className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-2xl border border-amber-200 text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {testingPush ? (
            <>
              <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
              <span>A testar em 5s! Bloqueia o ecrã ou muda de aba agora...</span>
            </>
          ) : (
            <>
              <BellRing className="w-4 h-4 text-amber-600" />
              <span>🔔 Testar Notificação Fora do App (5 Segundos)</span>
            </>
          )}
        </button>
      </div>

      {/* Safety & Emergency Contacts */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-200 space-y-3">
        <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-red-500" />
          Segurança e Apoio ao Passageiro
        </h3>
        <p className="text-xs text-neutral-500">
          Acesso rápido ao botão de emergência SOS, canais de apoio e números da Polícia / Pronto-Socorro.
        </p>
        <button
          onClick={onOpenSOS}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-200 text-xs transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Ver Central de Contactos SOS</span>
        </button>
      </div>

      {/* Account Management & Delete Account Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-200 space-y-4">
        <h3 className="font-black text-sm text-neutral-900">Gestão de Conta</h3>

        <div className="space-y-2">
          <button
            onClick={() => logout()}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-200 text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Apagar Conta Definitivamente</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-red-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-neutral-900">
              Apagar Conta Permanentemente?
            </h3>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Tens a certeza que desejas apagar a tua conta do TeleMoto+? Todos os teus dados
              pessoais, histórico de viagens e preferências serão eliminados permanentemente do
              Firestore. Esta ação <strong>não pode ser desfeita</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl font-bold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Sim, Apagar Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
