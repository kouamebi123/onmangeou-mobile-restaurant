import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { fetchMerchantOrders } from '@/api/merchant';
import { hapticWarning } from '@/feedback/haptics';
import { useMerchantStore } from '@/store/merchant-store';

import { newPendingIds, pendingCount } from './order-queue';

/**
 * Nombre de commandes qui attendent une réponse, relevé en continu quel que
 * soit l'onglet ouvert. Le téléphone vibre à l'arrivée d'une nouvelle commande.
 */
export function usePendingOrders(enabled: boolean): number {
  const selectedId = useMerchantStore((state) => state.selectedEstablishmentId);
  const orders = useQuery({
    queryKey: ['merchant', 'orders', selectedId],
    queryFn: () => fetchMerchantOrders(selectedId ?? undefined),
    refetchInterval: 8000,
    enabled,
  });
  const seen = useRef<{ scope: string | null; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!orders.data) {
      return;
    }
    // Changer d'établissement n'est pas une arrivée de commande : on repart d'un relevé neuf.
    const known = seen.current !== null && seen.current.scope === selectedId ? seen.current.ids : null;
    if (newPendingIds(known, orders.data).length > 0) {
      hapticWarning();
    }
    seen.current = {
      scope: selectedId,
      ids: new Set(orders.data.filter((order) => order.status === 'PENDING_RESTAURANT').map((order) => order.id)),
    };
  }, [orders.data, selectedId]);

  return pendingCount(orders.data);
}
