import { create } from 'zustand';

interface MerchantUiState {
  selectedEstablishmentId: string | null;
  setSelectedEstablishmentId: (id: string | null) => void;
}

export const useMerchantStore = create<MerchantUiState>((set) => ({
  selectedEstablishmentId: null,
  setSelectedEstablishmentId: (id) => set({ selectedEstablishmentId: id }),
}));
