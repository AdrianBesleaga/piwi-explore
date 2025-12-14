import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { webLLMService } from '../../services/ai/webllm.service';

export const loadModel = createAsyncThunk(
    'ai/loadModel',
    async (modelId, { dispatch }) => {
        await webLLMService.loadModel(modelId, (report) => {
            dispatch(setDownloadProgress({
                text: report.text,
                progress: report.progress
            }));
        });
        return modelId;
    }
);

export const generateResponse = createAsyncThunk(
    'ai/generate',
    async (messages, { dispatch, getState }) => {
        const { activeModel } = getState().ai;
        if (!activeModel) throw new Error("No model loaded");

        // Optimistic update for user message is handled by component usually, 
        // but we can add 'assistant' placeholder here if we want deep integration.
        // For now, we assume component handles "User" display, and we handle "Assistant" streaming.

        await webLLMService.chat(messages, (text) => {
            dispatch(setStreamingResponse(text));
        });

        return; // fulfilled
    }
);

const aiSlice = createSlice({
    name: 'ai',
    initialState: {
        activeModel: null,
        modelStatus: 'idle', // idle, loading, ready, error
        downloadProgress: { text: '', progress: 0 },
        streamingResponse: '',
        error: null,
        availableModels: [
            // Efficient Models (Low VRAM/RAM)
            { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi 3 Mini (3.8B) - Efficient", size: "2.3GB" },
            { id: "Llama-3-8B-Instruct-q4f16_1-MLC", name: "Llama 3 (8B) - Efficient", size: "4.6GB" },
            { id: "Gemma-2b-it-q4f16_1-MLC", name: "Gemma 2B - Efficient", size: "1.3GB" },
            { id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", name: "TinyLlama (1.1B) - Fast", size: "698MB" },

            // Standard Models (Higher Quality, High VRAM/RAM)
            { id: "Llama-3-8B-Instruct-q4f32_1-MLC", name: "Llama 3 (8B) - Standard", size: "5.2GB" },
            { id: "Phi-3-mini-4k-instruct-q4f32_1-MLC", name: "Phi 3 Mini (3.8B) - Standard", size: "3.2GB" }, // Corrected size reflection if needed, usually slightly larger than f16
            { id: "Qwen2-7B-Instruct-q4f32_1-MLC", name: "Qwen2 (7B) - Standard", size: "4.1GB" },
            { id: "Gemma-2b-it-q4f32_1-MLC", name: "Gemma 2B - Standard", size: "1.8GB" },

            // Multimodal (Vision) Models
            // Note: These require high VRAM/RAM (approx 8GB+)
            { id: "Llama-3.2-11B-Vision-Instruct-q4f16_1-MLC", name: "Llama 3.2 Vision (11B)", size: "6.3GB" },
            { id: "Phi-3.5-vision-instruct-q4f16_1-MLC", name: "Phi 3.5 Vision (4.2B)", size: "2.4GB" }
        ]
    },
    reducers: {
        setDownloadProgress: (state, action) => {
            state.downloadProgress = action.payload;
        },
        setStreamingResponse: (state, action) => {
            state.streamingResponse = action.payload;
        },
        clearStreamingResponse: (state) => {
            state.streamingResponse = '';
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadModel.pending, (state) => {
                state.modelStatus = 'loading';
                state.error = null;
                state.downloadProgress = { text: 'Initializing...', progress: 0 };
            })
            .addCase(loadModel.fulfilled, (state, action) => {
                state.modelStatus = 'ready';
                state.activeModel = action.payload;
                state.downloadProgress = { text: 'Done', progress: 1 };
            })
            .addCase(loadModel.rejected, (state, action) => {
                state.modelStatus = 'error';
                state.error = action.error.message;
            })
            .addCase(generateResponse.pending, (state) => {
                state.streamingResponse = '';
            })
            .addCase(generateResponse.rejected, (state, action) => {
                state.error = action.error.message;
            });
    }
});

export const { setDownloadProgress, setStreamingResponse, clearStreamingResponse } = aiSlice.actions;
export default aiSlice.reducer;
