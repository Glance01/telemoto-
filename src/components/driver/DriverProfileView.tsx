import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDriverRatings } from '../../services/rideService';
import { updateDriverPresentation } from '../../services/driverService';
import { checkDriverProfileComplete } from '../../utils/driverProfileValidator';
import { RatingRecord } from '../../types';
import { MOZAMBIQUE_ADMIN_DIVISIONS, PROVINCES_LIST, getDistrictCoordinates, addCoordinateJitter } from '../../lib/mozambiqueLocations';
import {
  requestWebNotificationPermission,
  scheduleTestBackgroundNotification,
  playNotificationSound,
} from '../../services/notificationService';
import {
  Bike,
  Shield,
  Trash2,
  LogOut,
  AlertTriangle,
  Loader2,
  Phone,
  FileText,
  MapPin,
  Star,
  Camera,
  MessageSquare,
  Calendar,
  Sparkles,
  Edit3,
  CheckCircle2,
  X,
  Clock,
  ShieldCheck,
  User,
  BellRing,
} from 'lucide-react';

export const DriverProfileView: React.FC = () => {
  const { user, driverProfile, refreshProfiles, deleteAccount, logout } = useAuth();
  const profileStatus = checkDriverProfileComplete(driverProfile);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  // Edit vehicle & document data modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState(driverProfile?.fullName || '');
  const [editPhone, setEditPhone] = useState(driverProfile?.phone || '');
  const [editIdNumber, setEditIdNumber] = useState(driverProfile?.idNumber || '');
  const [editProvince, setEditProvince] = useState(driverProfile?.province || 'Inhambane');
  const [editDistrict, setEditDistrict] = useState(driverProfile?.district || driverProfile?.city || 'Massinga');
  const [editBairro, setEditBairro] = useState(driverProfile?.bairro || driverProfile?.zone || 'Bairro Central');
  const [editBikeBrand, setEditBikeBrand] = useState(driverProfile?.bikeBrand || '');
  const [editBikeModel, setEditBikeModel] = useState(driverProfile?.bikeModel || '');
  const [editBikeColor, setEditBikeColor] = useState(driverProfile?.bikeColor || '');
  const [editPlateNumber, setEditPlateNumber] = useState(driverProfile?.plateNumber || '');
  const [editBaseFare, setEditBaseFare] = useState<number | undefined>(driverProfile?.baseFare);
  const [editBio, setEditBio] = useState(driverProfile?.bio || '');
  const [saving, setSaving] = useState(false);

  // Passenger reviews state
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    if (driverProfile?.id) {
      loadRatings(driverProfile.id);
    }
  }, [driverProfile?.id]);

  useEffect(() => {
    if (driverProfile) {
      setEditFullName(driverProfile.fullName || '');
      setEditPhone(driverProfile.phone || '');
      setEditIdNumber(driverProfile.idNumber || '');
      setEditProvince(driverProfile.province || 'Inhambane');
      setEditDistrict(driverProfile.district || driverProfile.city || 'Massinga');
      setEditBairro(driverProfile.bairro || driverProfile.zone || 'Bairro Central');
      setEditBikeBrand(driverProfile.bikeBrand || '');
      setEditBikeModel(driverProfile.bikeModel || '');
      setEditBikeColor(driverProfile.bikeColor || '');
      setEditPlateNumber(driverProfile.plateNumber || '');
      setEditBaseFare(driverProfile.baseFare);
      setEditBio(driverProfile.bio || '');
    }
  }, [driverProfile]);

  const loadRatings = async (driverId: string) => {
    setLoadingRatings(true);
    const data = await getDriverRatings(driverId);
    setRatings(data);
    setLoadingRatings(false);
  };

  if (!driverProfile) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editFullName.trim() || !editPhone.trim() || !editIdNumber.trim() || !editBikeBrand.trim() || !editPlateNumber.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const coords = addCoordinateJitter(getDistrictCoordinates(editProvince, editDistrict));

    const ok = await updateDriverPresentation(user.uid, {
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      idNumber: editIdNumber.trim(),
      province: editProvince,
      district: editDistrict,
      city: editDistrict,
      bairro: editBairro,
      zone: editBairro,
      currentLat: coords.lat,
      currentLng: coords.lng,
      lastLocationUpdate: Date.now(),
      bikeBrand: editBikeBrand.trim(),
      bikeModel: editBikeModel.trim(),
      bikeColor: editBikeColor.trim(),
      plateNumber: editPlateNumber.trim(),
      baseFare: editBaseFare,
      bio: editBio.trim(),
      profileCompleted: true,
      status: 'approved', // Automatically approved so they show up on the radar instantly!
    });

    if (ok) {
      await refreshProfiles();
      setSuccessMsg('Dados associados e guardados no Firestore com sucesso!');
      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMsg(null);
      }, 1500);
    } else {
      setErrorMsg('Não foi possível guardar os dados. Tente novamente.');
    }
    setSaving(false);
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
      {/* Driver Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-200/80 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-900 border-4 border-white shadow-lg flex items-center justify-center text-white font-black text-3xl">
            {driverProfile.photoUrl ? (
              <img
                src={driverProfile.photoUrl}
                alt={driverProfile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{driverProfile.fullName?.[0]?.toUpperCase() || 'M'}</span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mt-3">
            {driverProfile.fullName || 'Condutor TeleMoto+'}
          </h2>
          <p className="text-xs text-neutral-500 font-mono">
            {driverProfile.phone || user?.phoneNumber || '+258 '} • {driverProfile.email || user?.email}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
              <Bike className="w-3.5 h-3.5" />
              <span>Moto-Taxista Oficial</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{driverProfile.rating?.toFixed(1) || '5.0'}</span>
              <span className="text-neutral-400 font-normal">
                ({driverProfile.totalRatingsCount || ratings.length} avaliações)
              </span>
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pending Verification Notice (only when profile is complete) */}
        {driverProfile.status === 'pending' && profileStatus.isComplete && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Candidatura em Análise pelo Administrador</span>
            </div>
            <p className="text-amber-700 leading-snug text-[11px]">
              A sua candidatura e dados do veículo foram associados à sua conta no Firestore! O administrador do TeleMoto+ está a rever a sua documentação.
            </p>
          </div>
        )}

        {/* Motorcycle & Location Details Card */}
        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-neutral-200/60">
            <span className="text-neutral-500 font-medium">Veículo / Moto:</span>
            <span className="font-bold text-neutral-900">
              {driverProfile.bikeBrand ? `${driverProfile.bikeBrand} ${driverProfile.bikeModel} (${driverProfile.bikeColor || 'Cor N/D'})` : 'Pendente de Preenchimento'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-200/60">
            <span className="text-neutral-500 font-medium">Matrícula:</span>
            <span className="font-bold font-mono text-neutral-900">
              {driverProfile.plateNumber || 'Pendente de Preenchimento'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-200/60">
            <span className="text-neutral-500 font-medium">Província / Distrito:</span>
            <span className="font-bold text-neutral-900">
              {driverProfile.province || 'Inhambane'} • {driverProfile.district || driverProfile.city || 'Massinga'} ({driverProfile.bairro || driverProfile.zone || 'Bairro Central'})
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-200/60">
            <span className="text-neutral-500 font-medium">Preço Base do Condutor:</span>
            <span className="font-bold font-mono text-red-600 dark:text-red-400">
              {driverProfile.baseFare ? `${driverProfile.baseFare} MT` : 'Definido na Negociação'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-200/60">
            <span className="text-neutral-500 font-medium">Documento BI:</span>
            <span className="font-bold font-mono text-neutral-900">
              {driverProfile.idNumber || 'Pendente de Preenchimento'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-200/60">
            <span className="text-neutral-500 font-medium">Estado da Conta:</span>
            <span
              className={`font-black uppercase text-[11px] px-2 py-0.5 rounded-md ${
                driverProfile.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : !profileStatus.isComplete
                  ? 'bg-red-100 text-red-800'
                  : driverProfile.status === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {driverProfile.status === 'approved'
                ? 'Aprovado'
                : !profileStatus.isComplete
                ? 'Perfil Incompleto'
                : driverProfile.status === 'pending'
                ? 'EM VERIFICAÇÃO'
                : driverProfile.status}
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar / Submeter Dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Passenger Reviews & Comments Section */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-base text-neutral-900">
                Avaliações dos Passageiros
              </h3>
              <p className="text-xs text-neutral-400">
                Feedback pós-viagem gravado no Firestore
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-full">
            {ratings.length} {ratings.length === 1 ? 'comentário' : 'comentários'}
          </span>
        </div>

        {loadingRatings ? (
          <div className="py-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            <span>A carregar avaliações...</span>
          </div>
        ) : ratings.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100">
            <MessageSquare className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
            <p className="font-semibold text-neutral-600">Ainda sem avaliações pós-viagem</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Assim que os passageiros concluírem corridas contigo, as notas de 1 a 5 estrelas e comentários aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {ratings.map((r) => (
              <div
                key={r.id}
                className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/70 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= r.score
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-200'
                        }`}
                      />
                    ))}
                    <span className="font-bold text-neutral-800 ml-1.5">{r.score}.0</span>
                  </div>

                  <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.createdAt).toLocaleDateString('pt-MZ', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>

                {r.comment && (
                  <p className="text-neutral-700 font-medium bg-white p-2.5 rounded-xl border border-neutral-100 text-[11px] leading-relaxed">
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification & Background Push Settings */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-200 space-y-3">
        <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-amber-500" />
          Alertas de Pedidos de Corrida Fora do App
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Receba toques sonoros e alertas no ecrã mesmo quando estiver com o telemóvel no bolso ou ecrã bloqueado, para nunca perder uma oportunidade de corrida.
        </p>

        <button
          type="button"
          onClick={async () => {
            setTestingPush(true);
            const perm = await requestWebNotificationPermission();
            if (perm === 'granted') {
              playNotificationSound('radar');
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
              <span>A disparar teste em 5s! Bloqueia o telemóvel agora...</span>
            </>
          ) : (
            <>
              <BellRing className="w-4 h-4 text-amber-600" />
              <span>🔔 Testar Alerta de Corrida Fora do App (5s)</span>
            </>
          )}
        </button>
      </div>

      {/* Account Management & Delete Account Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-200 space-y-4">
        <h3 className="font-black text-sm text-neutral-900">Gestão de Conta</h3>

        <div className="space-y-2">
          <button
            onClick={() => logout()}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-200 text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Apagar Conta de Motorista Definitivamente</span>
          </button>
        </div>
      </div>

      {/* MODAL EDIT / SUBMIT PROFILE DATA */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 pb-36 shadow-2xl relative border border-neutral-200 max-h-[92vh] overflow-y-auto space-y-4 my-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <div className="p-2 rounded-xl bg-red-100 text-red-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 uppercase">
                  Submeter Dados do Motorista
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Os dados ficam permanentemente gravados no Firestore da sua conta
                </p>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Ex: Bruno Gonçalves Oliveira"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Contacto Telefónico *
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+258 83 422 8863"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Número do BI / Documento *
                </label>
                <input
                  type="text"
                  required
                  value={editIdNumber}
                  onChange={(e) => setEditIdNumber(e.target.value)}
                  placeholder="Ex: 110100483921B"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>

              {/* Province, District and Bairro Selector */}
              <div className="p-3 bg-red-50/70 border border-red-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span>Província e Distrito de Operação</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-neutral-700 text-[11px] mb-1">
                      Província *
                    </label>
                    <select
                      value={editProvince}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        setEditProvince(newProv);
                        const availableDistricts = MOZAMBIQUE_ADMIN_DIVISIONS[newProv] || [];
                        setEditDistrict(availableDistricts[0] || '');
                      }}
                      className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-red-500 cursor-pointer"
                    >
                      {PROVINCES_LIST.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 text-[11px] mb-1">
                      Distrito *
                    </label>
                    <select
                      value={editDistrict}
                      onChange={(e) => setEditDistrict(e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-red-500 cursor-pointer"
                    >
                      {(MOZAMBIQUE_ADMIN_DIVISIONS[editProvince] || []).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 text-[11px] mb-1">
                    Bairro / Zona de Espera
                  </label>
                  <input
                    type="text"
                    value={editBairro}
                    onChange={(e) => setEditBairro(e.target.value)}
                    placeholder="Ex: Bairro Central"
                    className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Marca da Moto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editBikeBrand}
                    onChange={(e) => setEditBikeBrand(e.target.value)}
                    placeholder="TVS"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={editBikeModel}
                    onChange={(e) => setEditBikeModel(e.target.value)}
                    placeholder="HLX 150"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Cor da Moto
                  </label>
                  <input
                    type="text"
                    value={editBikeColor}
                    onChange={(e) => setEditBikeColor(e.target.value)}
                    placeholder="Vermelho / Preto"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Matrícula da Moto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPlateNumber}
                    onChange={(e) => setEditPlateNumber(e.target.value)}
                    placeholder="Ex: MZ-00-00"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Apresentação Pessoal / Bio
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Informação adicional sobre rotas, experiência..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Preço Base Padrão da Corrida (MT)
                </label>
                <input
                  type="number"
                  min="20"
                  max="1000"
                  value={editBaseFare || ''}
                  onChange={(e) => setEditBaseFare(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 50, 70, 100"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-red-500 font-mono"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">O seu valor sugerido para corridas padrão.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Submeter ao Administrador</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-red-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-neutral-900">
              Apagar Conta de Motorista?
            </h3>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Tens a certeza que desejas apagar a tua conta de condutor? A tua carteira digital,
              dados da mota, histórico e perfil serão permanentemente eliminados do Firestore. Esta ação é irreversível.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>Sim, Apagar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
