import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Bike,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { UserRole } from '../../types';
import { MOZAMBIQUE_ADMIN_DIVISIONS, PROVINCES_LIST } from '../../lib/mozambiqueLocations';
import telemotoLogo from '../../assets/images/telemoto_app_logo.png';
import { compressImageToBase64 } from '../../utils/imageCompressor';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  promptMessage?: string | null;
}

// Built-in vector SVG avatars for instant, offline-safe, high-contrast display without external network dependencies
const BUILTIN_AVATARS = [
  {
    id: 'avatar-1',
    label: 'Clássico',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%23EF4444"/><circle cx="50" cy="40" r="18" fill="%23FFFFFF"/><path d="M22 86 C24 64 36 60 50 60 C64 60 76 64 78 86 Z" fill="%23FFFFFF"/></svg>',
  },
  {
    id: 'avatar-2',
    label: 'Safira',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%232563EB"/><circle cx="50" cy="40" r="18" fill="%23FFFFFF"/><path d="M22 86 C24 64 36 60 50 60 C64 60 76 64 78 86 Z" fill="%23FFFFFF"/></svg>',
  },
  {
    id: 'avatar-3',
    label: 'Esmeralda',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%2310B981"/><circle cx="50" cy="40" r="18" fill="%23FFFFFF"/><path d="M22 86 C24 64 36 60 50 60 C64 60 76 64 78 86 Z" fill="%23FFFFFF"/></svg>',
  },
  {
    id: 'avatar-4',
    label: 'Âmbar',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%23F59E0B"/><circle cx="50" cy="40" r="18" fill="%23FFFFFF"/><path d="M22 86 C24 64 36 60 50 60 C64 60 76 64 78 86 Z" fill="%23FFFFFF"/></svg>',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'register',
  initialRole = 'passenger',
  promptMessage,
}) => {
  const { login, register, updateUserProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [step, setStep] = useState<'form' | 'photo'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+258 ');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [driverProvince, setDriverProvince] = useState<string>('Inhambane');
  const [driverDistrict, setDriverDistrict] = useState<string>('Massinga');
  const [driverBairro, setDriverBairro] = useState<string>('Bairro Central');
  const [customPhoto, setCustomPhoto] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(BUILTIN_AVATARS[0].url);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode and role whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedRole(initialRole);
      setStep('form');
      setCustomPhoto('');
      setSelectedAvatar(BUILTIN_AVATARS[0].url);
      setErrorMsg(null);
      setShowPassword(false);
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    // Keep Mozambique international prefix +258
    if (!val.startsWith('+258')) {
      setPhone('+258 ' + val.replace(/\D/g, ''));
    } else {
      setPhone(val);
    }
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    try {
      const base64 = await compressImageToBase64(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.78,
      });
      setCustomPhoto(base64);
      setSelectedAvatar('');
    } catch (err) {
      console.warn('Failed to compress avatar photo:', err);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (mode === 'login') {
      const res = await login(email.trim(), password);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Falha ao autenticar. Verifica as tuas credenciais.');
      }
    } else {
      if (!fullName.trim()) {
        setErrorMsg('Por favor insira o seu nome completo.');
        setLoading(false);
        return;
      }
      if (!phone.trim() || phone.trim() === '+258' || phone.trim().length < 9) {
        setErrorMsg('Por favor insira um número de telefone válido de Moçambique (+258 8X XXX XXXX).');
        setLoading(false);
        return;
      }
      const res = await register(
        email.trim(),
        password,
        fullName.trim(),
        phone.trim(),
        selectedRole,
        selectedRole === 'driver' ? driverProvince : undefined,
        selectedRole === 'driver' ? driverDistrict : undefined,
        selectedRole === 'driver' ? driverBairro : undefined
      );
      if (res.success) {
        // Transition to profile photo step
        setStep('photo');
      } else {
        setErrorMsg(res.error || 'Falha ao registar conta.');
      }
    }
    setLoading(false);
  };

  const handleSavePhoto = async () => {
    setLoading(true);
    const photoToSave = customPhoto.trim() || selectedAvatar;
    if (photoToSave) {
      await updateUserProfile({ photoURL: photoToSave, photoUrl: photoToSave });
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="ios-glass dark:bg-neutral-900/90 max-w-md w-full p-8 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative border border-white/20 dark:border-white/5 max-h-[92vh] overflow-y-auto scrollbar-thin transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Fechar"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'photo' ? (
          /* STEP 2: PROFILE PHOTO */
          <div className="text-center py-2 space-y-5 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500 text-white font-extrabold shadow-lg shadow-red-500/25 mx-auto">
              <Camera className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Foto de Perfil
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {selectedRole === 'driver'
                  ? 'Ajuda os passageiros a reconhecer-te no ponto de encontro.'
                  : 'Para que os moto-taxistas te identifiquem facilmente nas viagens.'}
              </p>
            </div>

            {/* Avatar Preview */}
            <div className="flex flex-col items-center justify-center my-3">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-red-500 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-lg shadow-red-500/10">
                  {customPhoto || selectedAvatar ? (
                    <img
                      src={customPhoto || selectedAvatar}
                      alt="Pré-visualização do perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-neutral-400" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-transform active:scale-90 cursor-pointer"
                  title="Carregar foto"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileUpload}
                className="hidden"
              />

              {isCompressingPhoto && (
                <p className="text-[11px] text-red-500 mt-1 animate-pulse">
                  A otimizar imagem...
                </p>
              )}
            </div>

            {/* Direct Upload Button */}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-red-500" />
                <span>Escolher foto do dispositivo</span>
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2 text-left pt-1">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Ou seleciona um avatar padrão:
              </label>
              <div className="flex items-center justify-center gap-3">
                {BUILTIN_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(av.url);
                      setCustomPhoto('');
                    }}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedAvatar === av.url && !customPhoto
                        ? 'border-red-500 ring-2 ring-red-500/30 scale-105 shadow-md'
                        : 'border-neutral-200 dark:border-neutral-700 opacity-70 hover:opacity-100'
                    }`}
                    title={av.label}
                  >
                    <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="space-y-1 text-left pt-1">
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Ou insere um link direto de imagem:
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="url"
                  placeholder="https://exemplo.com/minha-foto.jpg"
                  value={customPhoto}
                  onChange={(e) => {
                    setCustomPhoto(e.target.value);
                    setSelectedAvatar('');
                  }}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleSavePhoto}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-2xl shadow-lg shadow-red-500/25 transition-transform active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir e Guardar Foto</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Saltar por agora
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: AUTHENTICATION FORM */
          <>
            {/* Brand Logo & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-red-500/25 mb-3 border border-red-500/30 bg-black">
                <img
                  src={telemotoLogo}
                  alt="TeleMoto+ Logótipo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                {mode === 'login' ? 'Entrar no TeleMoto+' : 'Criar Conta no TeleMoto+'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {mode === 'login'
                  ? 'Acede à tua conta de passageiro ou moto-taxista'
                  : 'Registo rápido para mobilidade e corridas em Moçambique'}
              </p>
            </div>

            {/* Mode Switcher Segmented Control */}
            <div className="p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl flex items-center gap-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Iniciar Sessão
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Action Prompt Message (when user tries to request ride or driver action without auth) */}
            {promptMessage && (
              <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl text-xs text-red-950 dark:text-red-200 flex items-start gap-2.5 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  !
                </span>
                <div>
                  <p className="font-bold text-red-900 dark:text-red-300 text-xs leading-tight">
                    Conta Necessária
                  </p>
                  <p className="text-red-800 dark:text-red-400 text-[11px] mt-0.5 leading-snug">
                    {promptMessage}
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  {/* Role Selector Cards */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                      Queres usar o TeleMoto+ como:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('passenger')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          selectedRole === 'passenger'
                            ? 'border-red-500 bg-red-50/70 dark:bg-red-500/10 text-neutral-900 dark:text-white shadow-xs ring-1 ring-red-500'
                            : 'border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <User className={`w-4 h-4 ${selectedRole === 'passenger' ? 'text-red-500' : 'text-neutral-400'}`} />
                          {selectedRole === 'passenger' && (
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          )}
                        </div>
                        <span className="font-extrabold text-xs">Passageiro</span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                          Pedir moto e viajar com segurança
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('driver')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          selectedRole === 'driver'
                            ? 'border-red-500 bg-red-50/70 dark:bg-red-500/10 text-neutral-900 dark:text-white shadow-xs ring-1 ring-red-500'
                            : 'border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Bike className={`w-4 h-4 ${selectedRole === 'driver' ? 'text-red-500' : 'text-neutral-400'}`} />
                          {selectedRole === 'driver' && (
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          )}
                        </div>
                        <span className="font-extrabold text-xs">Motorista</span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                          Faturar com a tua mota
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: João Samora Machel"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Contacto Telefónico (M-Pesa / Vodacom / Movitel)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="+258 84 000 0000"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  {/* Driver Province / District Selection */}
                  {selectedRole === 'driver' && (
                    <div className="p-4 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-200">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span>Área Operacional de Atuação</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Província
                          </label>
                          <select
                            value={driverProvince}
                            onChange={(e) => {
                              const newProv = e.target.value;
                              setDriverProvince(newProv);
                              const availableDistricts = MOZAMBIQUE_ADMIN_DIVISIONS[newProv] || [];
                              setDriverDistrict(availableDistricts[0] || '');
                            }}
                            className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
                          >
                            {PROVINCES_LIST.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Distrito / Cidade
                          </label>
                          <select
                            value={driverDistrict}
                            onChange={(e) => setDriverDistrict(e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
                          >
                            {(MOZAMBIQUE_ADMIN_DIVISIONS[driverProvince] || []).map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Bairro / Ponto de Referência
                        </label>
                        <input
                          type="text"
                          value={driverBairro}
                          onChange={(e) => setDriverBairro(e.target.value)}
                          placeholder="Ex: Bairro Central / Mercado Central"
                          className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Endereço de Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="teunome@exemplo.co.mz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-neutral-400"
                  />
                </div>
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/25 transition-transform active:scale-[0.99] disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : mode === 'login' ? (
                  <>
                    <span>Entrar na Plataforma</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Criar Conta e Prosseguir</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Mode Switch Link */}
            <div className="mt-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
              {mode === 'login' ? (
                <p>
                  Ainda não tens conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg(null);
                    }}
                    className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Regista-te grátis
                  </button>
                </p>
              ) : (
                <p>
                  Já tens conta no TeleMoto+?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Inicia sessão
                  </button>
                </p>
              )}
            </div>

            {/* Trust badge */}
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Plataforma 100% segura com suporte M-Pesa em Moçambique</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
