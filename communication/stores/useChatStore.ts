import { create } from 'zustand';

type ChatStoreState = {
  forwardSelectionMode: boolean;
  selectedMessageIds: string[];
  forwardModalMessageIds: string[];
  setForwardSelectionMode: (visible: boolean) => void;
  setSelectedMessageIds: (messageIds: string[]) => void;
  toggleSelectedMessage: (messageId: string) => void;
  setForwardModalMessageIds: (messageIds: string[]) => void;
  resetSelection: () => void;
};

export const useChatStore = create<ChatStoreState>((set) => ({
  forwardSelectionMode: false,
  selectedMessageIds: [],
  forwardModalMessageIds: [],
  setForwardSelectionMode: (visible) => set({ forwardSelectionMode: visible }),
  setSelectedMessageIds: (messageIds) =>
    set({
      selectedMessageIds: Array.from(new Set(messageIds.filter(Boolean))),
    }),
  toggleSelectedMessage: (messageId) =>
    set((state) => ({
      selectedMessageIds: state.selectedMessageIds.includes(messageId)
        ? state.selectedMessageIds.filter((currentId) => currentId !== messageId)
        : [...state.selectedMessageIds, messageId],
    })),
  setForwardModalMessageIds: (messageIds) =>
    set({
      forwardModalMessageIds: Array.from(new Set(messageIds.filter(Boolean))),
    }),
  resetSelection: () =>
    set({
      forwardSelectionMode: false,
      selectedMessageIds: [],
      forwardModalMessageIds: [],
    }),
}));
