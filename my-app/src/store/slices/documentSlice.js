import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import db from '../../services/storage/indexedDB.service';

// Async thunks
export const fetchDocumentsByClient = createAsyncThunk(
  'documents/fetchByClient',
  async (clientId) => {
    const documents = await db.documents
      .where('clientId')
      .equals(clientId)
      .toArray();
    return documents;
  }
);

export const createDocument = createAsyncThunk(
  'documents/create',
  async ({ clientId, file }) => {
    const document = {
      id: uuidv4(),
      clientId,
      fileName: file.name,
      fileType: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'text',
      fileSize: file.size,
      fileBlob: file,
      uploadedAt: Date.now(),
      status: 'pending',
      documentType: null,
      extractedText: null,
      extractedData: null,
      jsonSchema: null,
      processingError: null,
      metadata: {}
    };
    await db.documents.add(document);
    return document;
  }
);

export const updateDocument = createAsyncThunk(
  'documents/update',
  async ({ id, updates }) => {
    await db.documents.update(id, updates);
    return { id, updates };
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/delete',
  async (id) => {
    await db.documents.delete(id);
    return id;
  }
);

const documentSlice = createSlice({
  name: 'documents',
  initialState: {
    items: [],
    selectedDocument: null,
    loading: false,
    error: null,
    uploadProgress: {}
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
      });
  }
});

export const { selectDocument, clearSelectedDocument, setUploadProgress } = documentSlice.actions;
export default documentSlice.reducer;
