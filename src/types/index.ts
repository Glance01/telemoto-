export type UserRole = 'passenger' | 'driver' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  photoUrl?: string;
  photoURL?: string;
  createdAt: number;
  updatedAt?: number;
  emergencyPhone?: string;
  province?: string;
  city?: string;
  district?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  defaultPickupAddress?: string;
  strikesCount?: number;
  suspendedUntil?: number;
  suspensionReason?: string;
  pendingPenaltyFee?: number;
  cancellationsInWindow?: number;
  lastCancellationTimestamp?: number;
}

export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'banned';

export interface DriverProfile {
  id: string; // matches userId
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  idNumber: string;
  photoUrl?: string;
  bikePhotoUrl?: string;
  idDocumentPhotoUrl?: string;
  bio?: string; // Apresentação pessoal do moto-taxista
  presentationTitle?: string;
  yearsExperience?: number;
  spokenLanguages?: string[];
  helmetProvided?: boolean;
  emergencyContact?: string;
  bikeBrand: string;
  bikeModel: string;
  bikeColor: string;
  plateNumber: string;
  province: string;
  district?: string; // Província / Distrito / Bairro
  city: string; // Alias / backwards compatible with district
  bairro?: string;
  zone: string; // Alias / backwards compatible with bairro
  status: DriverStatus;
  termsAccepted: boolean;
  rating: number;
  totalRatingsCount: number;
  totalRatings?: number;
  totalRides: number;
  baseFare?: number; // Preço base / tarifa configurada pelo condutor (MT)
  customFare?: number;
  monthlyEarnings?: number; // Rendimento feito este mês em dinheiro
  currentMonth?: string; // e.g. '2026-10'
  isOnline: boolean;
  isBusy?: boolean; // Driver is currently occupied on an active trip
  currentLat?: number;
  currentLng?: number;
  lastLocationUpdate?: number;
  currentTripId?: string | null;
  distance?: number;
  profileCompleted?: boolean;
  rejectionReason?: string;
  createdAt: number;
  updatedAt: number;
}

export type TripStatus =
  | 'requested'
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'trip_started'
  | 'trip_completed'
  | 'payment_pending'
  | 'paid'
  | 'cancelled_by_passenger'
  | 'cancelled_by_driver'
  | 'cancelled_by_system'
  | 'disputed';

export type PaymentMethodType = 'cash' | 'mpesa' | 'emola' | 'card';
export type PaymentStatusType = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'disputed';

export interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
  spotType?: string; // Portão, Mercado, Loja, Paragem, etc.
}

export interface TripFareBreakdown {
  baseFare: number;
  includedBaseKm?: number; // e.g. 5 km inclusos na tarifa base
  extraKm?: number; // Quilómetros excedentes após os 5 km
  distanceFare: number;
  totalFare: number;
  platformCommission: number; // 15%
  gatewayFee: number; // e.g. 8%
  driverNetEarnings: number;
}

export interface Trip {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhoto?: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverPhoto?: string | null;
  driverBikePhoto?: string | null;
  driverBio?: string | null;
  driverHelmetProvided?: boolean | null;
  driverYearsExperience?: number | null;
  driverRating?: number;
  driverTotalRides?: number;
  bikeBrand?: string;
  bikeModel?: string;
  bikeColor?: string;
  plateNumber?: string;
  origin: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  estimatedDurationMin: number;
  fareBreakdown: TripFareBreakdown;
  fareAmount: number;
  currency: 'MT';
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  paymentId?: string;
  status: TripStatus;
  preferredDriverId?: string | null;
  biddingPrice?: number | null;
  biddingStatus?: string | null;
  statusTimestamps: Partial<Record<TripStatus, number>>;
  driverCurrentLocation?: {
    lat: number;
    lng: number;
    heading?: number;
  };
  emergencyAlert?: boolean;
  passengerRated?: boolean;
  driverRated?: boolean;
  passengerConfirmedArrival?: boolean;
  passengerConfirmedArrivalTimestamp?: number;
  driverEndedTrip?: boolean;
  driverEndedTripTimestamp?: number;
  passengerConfirmedDestination?: boolean;
  passengerConfirmedDestinationTimestamp?: number;
  cancellationReason?: string;
  pickupReferencePhotoUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentRecord {
  id: string;
  tripId: string;
  passengerId: string;
  driverId: string;
  amount: number;
  currency: 'MT';
  method: PaymentMethodType;
  gateway: 'zumbopay' | 'cash';
  gatewayReference?: string;
  status: PaymentStatusType;
  platformCommission: number;
  driverEarnings: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface DriverWallet {
  id: string; // driverId
  driverId: string;
  balance: number; // In Meticais (MT)
  pendingBalance: number;
  totalEarned: number;
  monthlyEarnings?: number; // Rendimento feito este mês
  currentMonth?: string; // Mês corrente (e.g. '2026-10')
  totalCommissionPaid: number;
  totalTripsCount: number;
  currency: 'MT';
  updatedAt: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  driverId: string;
  tripId?: string;
  type: 'credit_ride' | 'cash_ride_earning' | 'debit_commission' | 'cash_ride_commission_deduction' | 'payout' | 'payout_withdrawal' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: number;
}

export type PayoutWalletType = 'mpesa' | 'emola' | 'bank';

export interface WithdrawalRequest {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  amount: number;
  currency: 'MT';
  walletType: PayoutWalletType;
  accountDetails: {
    phoneNumber?: string;
    accountHolderName: string;
    bankName?: string;
    accountNumber?: string;
    nib?: string;
  };
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  estimatedProcessingTime: string;
  adminNotificationEmail: string;
  adminEmailSent: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: 'passenger' | 'driver';
  senderName: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface RatingRecord {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'passenger' | 'driver';
  toRole: 'passenger' | 'driver';
  score: number; // 1 to 5
  comment?: string;
  createdAt: number;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt: number;
}

export interface ComplaintRecord {
  id: string;
  tripId: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  category: 'conducao_perigosa' | 'comportamento_inadequado' | 'cobranca_incorreta' | 'fraude' | 'assedio' | 'problema_pagamento' | 'outro';
  description: string;
  evidence?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: number;
  resolvedAt?: number;
  adminNotes?: string;
}

export interface PlatformPricing {
  id: string;
  cityId?: string;
  baseFare: number; // e.g. 55 MT
  includedBaseKm?: number; // e.g. 5 km inclusos na tarifa base (55 MT até 5 km)
  pricePerKm: number; // e.g. 15 MT/km para km adicional
  minimumFare: number; // e.g. 55 MT
  maximumFare?: number;
  platformCommissionPercent: number; // 15%
  gatewayFeePercent: number; // 8%
  gatewayFeePaidBy: 'platform' | 'driver' | 'passenger';
  commissionCalculation: 'gross' | 'afterGatewayFee';
}

export interface CityConfig {
  id: string;
  name: string;
  province: string;
  active: boolean;
  center: { lat: number; lng: number };
  zones: string[];
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'driver' | 'trip' | 'payment' | 'pricing' | 'user';
  targetId: string;
  details: string;
  createdAt: number;
}

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  origin: LocationPoint;
  destination: LocationPoint;
  status: 'searching' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface RideBid {
  id: string;
  requestId: string;
  driverId: string;
  driverName: string;
  bikeBrand: string;
  plateNumber: string;
  proposedPrice: number;
  status: 'proposed' | 'accepted' | 'rejected';
  createdAt: number;
}
