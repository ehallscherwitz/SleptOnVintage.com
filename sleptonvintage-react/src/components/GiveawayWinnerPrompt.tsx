import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { giveawayService, type GiveawayOrderNeedingShipping } from '../services/giveawayService';
import { GIVEAWAY_REVEAL_COMPLETE, hasSeenGiveawayReveal } from '../utils/giveawayReveal';
import { GiveawayWinnerModal } from './GiveawayWinnerModal';

/** Congrats + shipping form — only after the winner has seen the reveal spin on /giveaway. */
export const GiveawayWinnerPrompt: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState<GiveawayOrderNeedingShipping | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setPending(null);
      return;
    }
    const { order, giveawayId, error } = await giveawayService.getOrderNeedingShipping();
    if (error || !order) {
      setPending(null);
      return;
    }

    if (giveawayId && !hasSeenGiveawayReveal(giveawayId)) {
      if (location.pathname !== '/giveaway') {
        navigate('/giveaway', { replace: true });
      }
      setPending(null);
      return;
    }

    setPending(order);
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [loading, refresh]);

  useEffect(() => {
    const onRevealComplete = () => void refresh();
    window.addEventListener(GIVEAWAY_REVEAL_COMPLETE, onRevealComplete);
    return () => window.removeEventListener(GIVEAWAY_REVEAL_COMPLETE, onRevealComplete);
  }, [refresh]);

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
