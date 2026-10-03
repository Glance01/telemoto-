import React from 'react';
import { Trip, PaymentMethodType } from '../../types';
import { ZumboPayCheckoutModal } from '../payment/ZumboPayCheckoutModal';
import { processTripCompletedPayment } from '../../services/paymentService';

interface PaymentCheckoutModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  trip,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  if (!isOpen) return null;

  const handleSuccess = async (method: PaymentMethodType) => {
    if (trip.driverId) {
      await processTripCompletedPayment(
        trip.id,
        trip.driverId,
        trip.fareAmount || 0,
        method,
        trip.fareBreakdown
      );
    }
    onPaymentSuccess();
  };

  return (
    <ZumboPayCheckoutModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={handleSuccess}
      tripId={trip.id}
      passengerId={trip.passengerId}
      driverId={trip.driverId || ''}
      driverName={trip.driverName || 'Condutor'}
      amount={trip.fareAmount || 0}
      fareBreakdown={trip.fareBreakdown}
      initialMethod={trip.paymentMethod || 'mpesa'}
      initialPhone={trip.passengerPhone || ''}
    />
  );
};
