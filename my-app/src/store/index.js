import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

// Import slices
import clientReducer from './slices/clientSlice';
import documentReducer from './slices/documentSlice';
import modelReducer from './slices/modelSlice';
import templateReducer from './slices/templateSlice';
import uiReducer from './slices/uiSlice';
import aiReducer from './slices/aiSlice';

// Combine reducers
const rootReducer = combineReducers({
  clients: clientReducer,
  documents: documentReducer,
  models: modelReducer,
  templates: templateReducer,
  templates: templateReducer,
  ui: uiReducer,
  ai: aiReducer
});

// Redux persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui'], // Only persist UI state (theme, sidebar state, etc.)
  // Don't persist clients, documents, models, templates as they're in IndexedDB
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'documents/create/pending', 'documents/create/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.file', 'payload.fileBlob', 'payload.pdfBlob', 'meta.arg.file'],
        // Ignore these paths in the state
        ignoredPaths: ['documents.items', 'templates.items'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// Export types for TypeScript (if we migrate later)
export const RootState = store.getState;
export const AppDispatch = store.dispatch;
