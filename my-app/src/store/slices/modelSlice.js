import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import db from '../../services/storage/indexedDB.service';

// Async thunks
export const fetchModels = createAsyncThunk(
  'models/fetchAll',
  async () => {
    const models = await db.ai_models.toArray();
    return models;
  }
);

export const updateModelStatus = createAsyncThunk(
  'models/updateStatus',
  async ({ modelId, status, progress, downloadedAt }) => {
    const updates = { status };
    if (progress !== undefined) updates.downloadProgress = progress;
    if (downloadedAt) updates.downloadedAt = downloadedAt;

    await db.ai_models.update(modelId, updates);
    return { modelId, updates };
  }
);

export const addModel = createAsyncThunk(
  'models/add',
  async (model) => {
    await db.ai_models.add(model);
    return model;
  }
);

const modelSlice = createSlice({
  name: 'models',
  initialState: {
    items: [],
    activeModelId: null,
    loading: false,
    error: null,
    downloadProgress: {}
  },
  reducers: {
    setActiveModel: (state, action) => {
      state.activeModelId = action.payload;
    },
    setDownloadProgress: (state, action) => {
      const { modelId, progress } = action.payload;
      state.downloadProgress[modelId] = progress;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch models
      .addCase(fetchModels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Add model
      .addCase(addModel.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update model status
      .addCase(updateModelStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(m => m.modelId === action.payload.modelId);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload.updates };
        }
      });
  }
});

export const { setActiveModel, setDownloadProgress } = modelSlice.actions;
export default modelSlice.reducer;
