import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import documentStorageService from '../../services/storage/documentStorage.service';
import { extractionService } from '../../services/ai/extraction.service';
import { detectFileType } from '../../utils/fileHelpers';

// Async thunks
export const fetchDocumentsByClient = createAsyncThunk(
  'documents/fetchByClient',
  async (clientId) => {
    return await documentStorageService.getDocumentsByClientId(clientId);
  }
);

export const createDocument = createAsyncThunk(
  'documents/create',
  async ({ clientId, file }) => {
    const type = detectFileType(file) || 'other';
    return await documentStorageService.createDocument(clientId, file, type);
  }
);

export const updateDocument = createAsyncThunk(
  'documents/update',
  async ({ id, updates }) => {
    return await documentStorageService.updateDocument(id, updates);
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/delete',
  async (id) => {
    await documentStorageService.deleteDocument(id);
    return id;
  }
);

export const cancelDocument = createAsyncThunk(
  'documents/cancel',
  async (id) => {
    await extractionService.cancelDocument(id);
    return id;
  }
);

export const processDocument = createAsyncThunk(
  'documents/process',
  async (id, { dispatch }) => {
    // 1. Update status to processing immediately in store and DB
    // We can do this via updateDocument thunk but that might be circular or slow.
    // Better to let extraReducers handle pending?
    // But we also want DB to update.
    // extractionService updates DB status to processing.
    // So we just call service.
    // Pass a callback to update progress in Redux
    const updates = await extractionService.processDocument(id, (progress) => {
      dispatch(documentSlice.actions.setProcessingProgress({ documentId: id, progress }));
    });
    return { id, updates };
  }
);

const documentSlice = createSlice({
  name: 'documents',
  initialState: {
    items: [],
    selectedDocument: null,
    loading: false,
    error: null,
    error: null,
    uploadProgress: {},
    processingProgress: {} // documentId -> number (0-100)
  },
  reducers: {
    selectDocument: (state, action) => {
      state.selectedDocument = action.payload;
    },
    clearSelectedDocument: (state) => {
      state.selectedDocument = null;
    },
    setUploadProgress: (state, action) => {
      const { documentId, progress } = action.payload;
      state.uploadProgress[documentId] = progress;
    },
    setProcessingProgress: (state, action) => {
      const { documentId, progress } = action.payload;
      state.processingProgress[documentId] = progress;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch documents
      .addCase(fetchDocumentsByClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocumentsByClient.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchDocumentsByClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create document
      .addCase(createDocument.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update document
      .addCase(updateDocument.fulfilled, (state, action) => {
        const index = state.items.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload.updates };
        }
        if (state.selectedDocument?.id === action.payload.id) {
          state.selectedDocument = { ...state.selectedDocument, ...action.payload.updates };
        }
      })
      // Delete document
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.items = state.items.filter(d => d.id !== action.payload);
        if (state.selectedDocument?.id === action.payload) {
          state.selectedDocument = null;
        }
        if (state.selectedDocument?.id === action.payload) {
          state.selectedDocument = null;
        }
      })
      // Cancel document
      .addCase(cancelDocument.fulfilled, (state, action) => {
        const id = action.payload;
        const index = state.items.findIndex(d => d.id === id);
        if (index !== -1) {
          state.items[index].status = 'cancelled';
          state.items[index].error = 'Cancelled by user';
          if (state.processingProgress) delete state.processingProgress[id];
        }
        if (state.selectedDocument?.id === id) {
          state.selectedDocument.status = 'cancelled';
          state.selectedDocument.error = 'Cancelled by user';
        }
      })
      // Process document
      .addCase(processDocument.pending, (state, action) => {
        const id = action.meta.arg;
        const index = state.items.findIndex(d => d.id === id);
        if (index !== -1) {
          state.items[index].status = 'processing';
        }
        if (state.selectedDocument?.id === id) {
          state.selectedDocument.status = 'processing';
        }
      })
      .addCase(processDocument.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.items.findIndex(d => d.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
        if (state.selectedDocument?.id === id) {
          state.selectedDocument = { ...state.selectedDocument, ...updates };
        }
      })
      .addCase(processDocument.rejected, (state, action) => {
        const id = action.meta.arg;
        const index = state.items.findIndex(d => d.id === id);
        if (index !== -1) {
          state.items[index].status = 'failed';
          state.items[index].error = action.error.message;
        }
      });
  }
});

const itemsActions = documentSlice.actions; // access actions inside thunk if needed, but thunk is outside. 
// actually dispatching actions from thunk requires importing or using generic dispatch
// Correction: we can use documentSlice.actions.setProcessingProgress

export const { selectDocument, clearSelectedDocument, setUploadProgress, setProcessingProgress } = documentSlice.actions;
// Thunk needs reference to action creator. 
// We can't use itemsActions inside processDocument definition before documentSlice is defined?
// Yes we can if we move processDocument below, OR we just use the string type 'documents/setProcessingProgress' 
// OR better: define slice first then export thunks? 
// Circular dependency if thunk uses slice actions and slice uses thunk.
// Standard Redux Toolkit pattern: define thunks first, but they can't dispatch slice actions directly if defined before.
// Solution: Move thunks to after slice? No, createSlice needs thunks for extraReducers.
// Solution: Use a separate actions file or just accept that we dispatch the action object manually or move thunk definition.
// Actually, thunks are usually defined before. 
// We can dispatch { type: 'documents/setProcessingProgress', payload: ... } 
// or simply extractionService takes an onProgress callback, and we define the callback inside the component? 
// No, the thunk is called from component.
// Let's modify processDocument to dispatch the action creator *after* it's defined? No.
// We will just dispatch the action object directly or fix the order.
// Easiest: dispatch({ type: 'documents/setProcessingProgress', payload: { documentId: id, progress } })
// But type is auto-generated.
// Let's just export the thunk AFTER the slice? No, createSlice needs it.

// WAIT. The thunk function body is executed LATER. By the time it runs, documentSlice.actions WILL be defined.
// So we can reference the exported action.
// We just need to move "export const processDocument..." to the bottom or fix the reference.
// Actually, standard JS hoisting for const? No.
// We can import the action from the file itself if we want, or just rely on the variable being available at runtime.
// But `itemsActions` is not defined yet.
// `setProcessingProgress` is not defined yet.

// Let's rely on runtime availability.
// I will change the thunk to use `documentSlice.actions.setProcessingProgress` inside the body.
// And I will move the thunk definition logic? No, easier:
// I will invoke the action creator from the slice object which is defined in the same file.
// But `documentSlice` is const.
// Function body runs later. accessing `documentSlice` inside async function is fine.

export default documentSlice.reducer;
