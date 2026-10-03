export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDhnaLx-ygbzDWRyiJk0dLCW7aLtM4Cxg4';

export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

// Standard coordinates for major Mozambican cities (array for mapping)
export const MOZAMBIQUE_CITIES = [
  { name: 'Maputo', province: 'Maputo Cidade', lat: -25.9692, lng: 32.5732 },
  { name: 'Matola', province: 'Maputo Província', lat: -25.9622, lng: 32.4589 },
  { name: 'Beira', province: 'Sofala', lat: -19.8436, lng: 34.8389 },
  { name: 'Nampula', province: 'Nampula', lat: -15.1165, lng: 39.2666 },
  { name: 'Chimoio', province: 'Manica', lat: -19.1164, lng: 33.4833 },
  { name: 'Inhambane', province: 'Inhambane', lat: -23.865, lng: 35.3833 },
  { name: 'Quelimane', province: 'Zambézia', lat: -17.8786, lng: 36.8883 },
  { name: 'Tete', province: 'Tete', lat: -16.1564, lng: 33.5864 },
  { name: 'Xai-Xai', province: 'Gaza', lat: -25.0444, lng: 35.0392 },
  { name: 'Pemba', province: 'Cabo Delgado', lat: -12.9732, lng: 40.5178 },
];

export const DEFAULT_CENTER = MOZAMBIQUE_CITIES[0];
export const DEFAULT_ZOOM = 14;

// Default vector map ID for AdvancedMarkerElement support
export const DEFAULT_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
