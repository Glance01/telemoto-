import { PlatformPricing, TripFareBreakdown } from '../types';

export const DEFAULT_PRICING: PlatformPricing = {
  id: 'default',
  baseFare: 55, // 55 MT (cobre até 5 km)
  includedBaseKm: 5, // Até 5 km incluídos no preço base
  pricePerKm: 15, // 15 MT por quilómetro a mais depois de 5 km
  minimumFare: 55, // Tarifa mínima de 55 MT
  platformCommissionPercent: 15, // TeleMoto+ 15%
  gatewayFeePercent: 8, // Gateway e.g. 8%
  gatewayFeePaidBy: 'platform',
  commissionCalculation: 'gross',
};

/**
 * Calculates fare and commission transparently according to TeleMoto+ Mozambican rules:
 * - Até 5 km, o preço fixo é 55 MT.
 * - A cada km a mais depois de 5 km, soma-se 15 MT/km.
 * - Exemplo: 7.7 km = 55 + (2.7 * 15) = 95.5 -> 96 MT
 */
export function calculateFare(
  distanceKm: number,
  pricing: PlatformPricing = DEFAULT_PRICING
): TripFareBreakdown {
  const safeDistance = Math.max(0.1, Number(distanceKm) || 0.1);
  const includedBaseKm = pricing.includedBaseKm ?? 5;
  const baseFare = pricing.baseFare ?? 55;
  const pricePerKm = pricing.pricePerKm ?? 15;
  const minimumFare = pricing.minimumFare ?? 55;

  // Quilómetros excedentes aos primeiros 5 km
  const extraKm = Math.max(0, safeDistance - includedBaseKm);
  
  // Fórmula TeleMoto+: 55 MT até 5km + 15 MT/km para o restante
  const rawTotal = safeDistance <= includedBaseKm ? baseFare : baseFare + extraKm * pricePerKm;
  let totalFare = Math.max(minimumFare, Math.round(rawTotal));

  const distanceFare = totalFare - baseFare;

  // Calculate platform commission (15%)
  const platformCommission = Math.round((totalFare * (pricing.platformCommissionPercent ?? 15)) / 100);

  // Gateway fee (8%)
  const gatewayFee = Math.round((totalFare * (pricing.gatewayFeePercent ?? 8)) / 100);

  // Driver net earnings calculation based on policy
  let driverNetEarnings: number;
  if (pricing.commissionCalculation === 'gross') {
    if (pricing.gatewayFeePaidBy === 'driver') {
      driverNetEarnings = totalFare - platformCommission - gatewayFee;
    } else {
      // Platform absorbs gateway fee or passenger pays
      driverNetEarnings = totalFare - platformCommission;
    }
  } else {
    // afterGatewayFee
    const afterGateway = totalFare - gatewayFee;
    const netCommission = Math.round((afterGateway * (pricing.platformCommissionPercent ?? 15)) / 100);
    driverNetEarnings = afterGateway - netCommission;
  }

  return {
    baseFare,
    includedBaseKm,
    extraKm: Math.round(extraKm * 10) / 10,
    distanceFare,
    totalFare,
    platformCommission,
    gatewayFee,
    driverNetEarnings,
  };
}

/**
 * Calculates estimated distance between two coordinates using Haversine formula as fallback
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDist = R * c;
  // Road factor in urban Mozambique is roughly 1.35x straight line
  return Math.round(straightDist * 1.35 * 10) / 10;
}
