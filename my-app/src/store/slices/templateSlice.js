import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import db from '../../services/storage/indexedDB.service';

// Async thunks
export const fetchTemplates = createAsyncThunk(
  'templates/fetchAll',
  async () => {
    const templates = await db.templates.toArray();
    return templates;
  }
);

export const createTemplate = createAsyncThunk(
  'templates/create',
  async (templateData) => {
    const template = {
      id: uuidv4(),
      ...templateData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.templates.add(template);
    return template;
  }
);

export const updateTemplate = createAsyncThunk(
  'templates/update',
  async ({ id, updates }) => {
    const updatedData = {
      ...updates,
      updatedAt: Date.now()
    };
    await db.templates.update(id, updatedData);
    return { id, updates: updatedData };
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/delete',
  async (id) => {
    await db.templates.delete(id);
    return id;
  }
);

const templateSlice = createSlice({
  name: 'templates',
  initialState: {
    items: [],
    selectedTemplate: null,
    loading: false,
    error: null
  },
  reducers: {
    selectTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    clearSelectedTemplate: (state) => {
      state.selectedTemplate = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch templates
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create template
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update template
      .addCase(updateTemplate.fulfilled, (state, action) => {
        const index = state.items.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload.updates };
        }
      })
      // Delete template
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t.id !== action.payload);
        if (state.selectedTemplate?.id === action.payload) {
          state.selectedTemplate = null;
        }
      });
  }
});

export const { selectTemplate, clearSelectedTemplate } = templateSlice.actions;
export default templateSlice.reducer;
