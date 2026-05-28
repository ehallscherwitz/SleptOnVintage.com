import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { giveawayService, type GiveawayOrderNeedingShipping } from '../services/giveawayService';
import { GiveawayWinnerModal } from './GiveawayWinnerModal';

/** Shows congrats + shipping form when the signed-in user won a giveaway but has not submitted shipping yet. */
export const GiveawayWinnerPrompt: React.FC = () => {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState<GiveawayOrderNeedingShipping | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setPending(null);
      return;
    }
    const { order } = await giveawayService.getOrderNeedingShipping();
    setPending(order);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [loading, refresh]);

  if (!pending) return null;

  return (
    <GiveawayWinnerModal
      order={pending}
      defaultEmail={user?.email}
      onSubmitted={() => {
        setPending(null);
        void refresh();
      }}
    />
  );
};
