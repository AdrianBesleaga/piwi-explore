import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    modals: {
      createClient: false,
      uploadDocument: false,
      modelDownloader: false,
      confirmDelete: false
    },
    toasts: [],
    sidebarOpen: true,
    theme: 'light',
    loading: {
      global: false,
      sections: {}
    }
  },
  reducers: {
    openModal: (state, action) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action) => {
      state.modals[action.payload] = false;
    },
    addToast: (state, action) => {
      state.toasts.push({
        id: Date.now(),
        ...action.payload
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setSectionLoading: (state, action) => {
      const { section, loading } = action.payload;
      state.loading.sections[section] = loading;
    }
  }
});

export const {
  openModal,
  closeModal,
  addToast,
  removeToast,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setGlobalLoading,
  setSectionLoading
} = uiSlice.actions;

export default uiSlice.reducer;
