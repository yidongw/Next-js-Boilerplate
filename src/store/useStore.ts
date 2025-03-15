import { del, get, set } from 'idb-keyval';
import superjson from 'superjson';
import { create } from 'zustand';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Register custom serialization for Uint8Array
superjson.registerCustom<Uint8Array, number[]>(
  {
    isApplicable: (v): v is Uint8Array => v instanceof Uint8Array,
    serialize: v => Array.from(v),
    deserialize: v => new Uint8Array(v),
  },
  'Uint8Array',
);

// Custom storage with IndexedDB
const storage: PersistStorage<State> = {
  getItem: async (name: string): Promise<StorageValue<State> | null> => {
    const value = await get(name);
    return value ? { state: superjson.parse(value) } : null;
  },
  setItem: async (name: string, value: StorageValue<State>): Promise<void> => {
    await set(name, superjson.stringify(value.state));
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export type FHEKey = {
  id: string;
  name: string;
  clientKey: Uint8Array;
  createdAt: string;
  status: 'loading' | 'ready' | 'error';
};

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  isEncrypted: boolean;
  timestamp: string;
  encryptedContent?: string;
  isDecrypted?: boolean;
};

type FHEData = {
  id: string;
  keyId: string; // Reference to the FHE key used
  name: string;
  data: Uint8Array[]; // Encrypted data
  size: number; // Add size field
  encryptedBy: string; // Add encryptedBy field
  createdAt: string;
  messages: Message[]; // Add messages array
};

type State = {
  fheKeys: FHEKey[];
  fheData: FHEData[]; // Add data storage
};

// Create a type without the messages field for adding new data
type FHEDataInput = Omit<FHEData, 'messages'>;

type Actions = {
  addFheKey: (key: FHEKey) => void;
  removeFheKey: (id: string) => void;
  // Add data actions
  addFheData: (data: FHEDataInput) => void;
  removeFheData: (id: string) => void;
  getFheDataByKeyId: (keyId: string) => FHEData[];
  addMessageToData: (dataId: string, message: Message) => void;
  getMessagesForData: (dataId: string) => Message[];
  updateMessageDecryptedContent: (dataId: string, messageId: string, decryptedContent: string) => void;
  updateFheKeyStatus: (id: string, status: 'loading' | 'ready' | 'error') => void;
  updateMessage: (dataId: string, messageId: string, updatedMessage: Message) => void;
};

export const useStore = create<State & Actions>()(
  persist(
    immer((set, get) => ({
      fheKeys: [],
      fheData: [], // Initialize data array
      addFheKey: key =>
        set((state) => {
          state.fheKeys.push(key);
        }),
      removeFheKey: id =>
        set((state) => {
          state.fheKeys = state.fheKeys.filter(key => key.id !== id);
          // Optionally remove associated data
          state.fheData = state.fheData.filter(data => data.keyId !== id);
        }),
      // Add data management functions
      addFheData: data =>
        set((state) => {
          state.fheData.push({
            ...data,
            messages: [], // Initialize empty messages array
          });
        }),
      removeFheData: id =>
        set((state) => {
          state.fheData = state.fheData.filter(data => data.id !== id);
        }),
      getFheDataByKeyId: (keyId: string) =>
        get().fheData.filter(data => data.keyId === keyId),
      addMessageToData: (dataId: string, message: Message) =>
        set((state) => {
          const data = state.fheData.find(d => d.id === dataId);
          if (data) {
            data.messages.push(message);
          }
        }),
      getMessagesForData: (dataId: string) => {
        const data = get().fheData.find(d => d.id === dataId);
        return data?.messages || [];
      },
      updateMessageDecryptedContent: (dataId: string, messageId: string, decryptedContent: string) =>
        set((state) => {
          const data = state.fheData.find(d => d.id === dataId);
          if (data) {
            const message = data.messages.find(m => m.id === messageId);
            if (message) {
              message.content = decryptedContent;
              message.isDecrypted = true;
              message.encryptedContent = '';
            }
          }
        }),
      updateFheKeyStatus: (id, status) =>
        set((state) => {
          const key = state.fheKeys.find(k => k.id === id);
          if (key) {
            key.status = status;
          }
        }),
      updateMessage: (dataId: string, messageId: string, updatedMessage: Message) =>
        set(state => ({
          fheData: state.fheData.map(data =>
            data.id === dataId
              ? {
                  ...data,
                  messages: data.messages.map(msg =>
                    msg.id === messageId ? updatedMessage : msg,
                  ),
                }
              : data,
          ),
        })),
    })),
    {
      name: 'fhe-storage',
      storage,
      partialize: (state: State & Actions): State => ({
        fheKeys: state.fheKeys,
        fheData: state.fheData,
      }),
    },
  ),
);
