import { DriverProfile } from '../types';

export interface DriverProfileValidationResult {
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Validates whether a driver profile has all required real data filled in.
 * If data is missing or set to placeholder defaults, the driver cannot receive rides or go online.
 */
export function checkDriverProfileComplete(driver: DriverProfile | null | undefined): DriverProfileValidationResult {
  if (!driver) {
    return {
      isComplete: false,
      missingFields: ['Perfil de Motorista não encontrado'],
    };
  }

  const missingFields: string[] = [];

  // 1. Full Name check
  if (
    !driver.fullName ||
    driver.fullName.trim() === '' ||
    driver.fullName.trim() === 'Condutor TeleMoto+'
  ) {
    missingFields.push('Nome Completo');
  }

  // 2. Phone check
  if (
    !driver.phone ||
    driver.phone.trim() === '' ||
    driver.phone.trim() === '+258' ||
    driver.phone.includes('000 0000')
  ) {
    missingFields.push('Número de Telefone');
  }

  // 3. ID / BI Document check
  if (!driver.idNumber || driver.idNumber.trim() === '') {
    missingFields.push('Número do BI / Documento');
  }

  // 4. Bike Brand
  if (!driver.bikeBrand || driver.bikeBrand.trim() === '') {
    missingFields.push('Marca da Moto');
  }

  // 5. Bike Model
  if (!driver.bikeModel || driver.bikeModel.trim() === '') {
    missingFields.push('Modelo da Moto');
  }

  // 6. Plate Number
  if (!driver.plateNumber || driver.plateNumber.trim() === '') {
    missingFields.push('Matrícula da Moto');
  }

  // 7. Driver Photo
  if (!driver.photoUrl || driver.photoUrl.trim() === '') {
    missingFields.push('Foto de Rosto do Condutor');
  }

  // 8. Bike Photo
  if (!driver.bikePhotoUrl || driver.bikePhotoUrl.trim() === '') {
    missingFields.push('Foto da Moto');
  }

  // 9. Bio / Personal presentation
  if (
    !driver.bio ||
    driver.bio.trim() === '' ||
    driver.bio.trim() === 'Sem apresentação cadastrada.'
  ) {
    missingFields.push('Apresentação Pessoal / Bio');
  }

  // If explicitly flagged profileCompleted AND all essential text fields exist
  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    missingFields: isComplete ? [] : missingFields,
  };
}
