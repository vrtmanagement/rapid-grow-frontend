import { create } from 'zustand';

type PollDraft = {
  question: string;
  options: string[];
  allowsMultipleAnswers: boolean;
  anonymous: boolean;
  expiresAt: string;
};

const defaultDraft = (): PollDraft => ({
  question: '',
  options: ['', ''],
  allowsMultipleAnswers: false,
  anonymous: false,
  expiresAt: '',
});

type PollStoreState = {
  createPollOpen: boolean;
  creatingPoll: boolean;
  pendingVotePollIds: Record<string, true>;
  draft: PollDraft;
  setCreatePollOpen: (open: boolean) => void;
  setCreatingPoll: (creating: boolean) => void;
  updateDraft: (patch: Partial<PollDraft>) => void;
  setOptionValue: (index: number, value: string) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
  resetDraft: () => void;
  setPendingVote: (pollId: string, pending: boolean) => void;
};

export const usePollStore = create<PollStoreState>((set) => ({
  createPollOpen: false,
  creatingPoll: false,
  pendingVotePollIds: {},
  draft: defaultDraft(),
  setCreatePollOpen: (open) => set({ createPollOpen: open }),
  setCreatingPoll: (creating) => set({ creatingPoll: creating }),
  updateDraft: (patch) =>
    set((state) => ({
      draft: {
        ...state.draft,
        ...patch,
      },
    })),
  setOptionValue: (index, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        options: state.draft.options.map((option, optionIndex) =>
          optionIndex === index ? value : option
        ),
      },
    })),
  addOption: () =>
    set((state) => {
      if (state.draft.options.length >= 12) return state;
      return {
        draft: {
          ...state.draft,
          options: [...state.draft.options, ''],
        },
      };
    }),
  removeOption: (index) =>
    set((state) => {
      if (state.draft.options.length <= 2) return state;
      return {
        draft: {
          ...state.draft,
          options: state.draft.options.filter((_, optionIndex) => optionIndex !== index),
        },
      };
    }),
  resetDraft: () => set({ draft: defaultDraft() }),
  setPendingVote: (pollId, pending) =>
    set((state) => {
      const nextPending = { ...state.pendingVotePollIds };
      if (pending) nextPending[pollId] = true;
      else delete nextPending[pollId];
      return { pendingVotePollIds: nextPending };
    }),
}));
