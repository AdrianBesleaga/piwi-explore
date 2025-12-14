import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import db from '../../services/storage/indexedDB.service';

// Async thunks for IndexedDB operations
export const fetchClients = createAsyncThunk(
  'clients/fetchAll',
  async () => {
    const clients = await db.clients.toArray();
    return clients;
  }
);

export const createClient = createAsyncThunk(
  'clients/create',
  async (clientData) => {
    const client = {
      id: uuidv4(),
      ...clientData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: clientData.metadata || {}
    };
    await db.clients.add(client);
    return client;
  }
);

export const updateClient = createAsyncThunk(
  'clients/update',
  async ({ id, updates }) => {
    const updatedData = {
      ...updates,
      updatedAt: Date.now()
    };
    await db.clients.update(id, updatedData);
    return { id, updates: updatedData };
  }
);

export const deleteClient = createAsyncThunk(
  'clients/delete',
  async (id) => {
    // Also delete associated documents
    const documents = await db.documents.where('clientId').equals(id).toArray();
    const documentIds = documents.map(doc => doc.id);
    await db.documents.bulkDelete(documentIds);

    // Delete client
    await db.clients.delete(id);
    return id;
  }
);

const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    items: [],
    selectedClient: null,
    loading: false,
    error: null
  },
  reducers: {
    selectClient: (state, action) => {
      state.selectedClient = action.payload;
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch clients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create client
      .addCase(createClient.pending, (state) => {
        state.loading = true;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Update client
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload.updates };
        }
      })
      // Delete client
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c.id !== action.payload);
        if (state.selectedClient?.id === action.payload) {
          state.selectedClient = null;
        }
      });
  }
});

export const { selectClient, clearSelectedClient } = clientSlice.actions;
export default clientSlice.reducer;
