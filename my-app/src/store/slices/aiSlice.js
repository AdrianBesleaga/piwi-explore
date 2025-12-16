import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { webLLMService } from '../../services/ai/webllm.service';
import { transformersService } from '../../services/ai/transformers.service';

export const loadModel = createAsyncThunk(
    'ai/loadModel',
    async ({ modelId, provider }, { dispatch, getState }) => {
        console.log('[aiSlice] loadModel called with:', { modelId, provider });

        // Validate that modelId is provided
        if (!modelId) {
            console.error('[aiSlice] modelId is missing!');
            throw new Error('modelId is required to load a model');
        }

        console.log('[aiSlice] modelId validated:', modelId);

        // Determine which service to use based on provider
        const modelProvider = provider || (modelId && modelId.includes('-MLC') ? 'mlc' : 'transformers');

        if (modelProvider === 'transformers') {
            // Use Transformers.js service for Florence-2, Moondream2, etc.
            await transformersService.loadModel(modelId, (report) => {
                dispatch(setDownloadProgress({
                    text: report.text,
                    progress: report.progress
                }));
            });
        } else {
            // Use MLC WebLLM service for MLC models
            await webLLMService.loadModel(modelId, (report) => {
                dispatch(setDownloadProgress({
                    text: report.text,
                    progress: report.progress
                }));
            });
        }

        return { modelId, provider: modelProvider };
    }
);

export const generateResponse = createAsyncThunk(
    'ai/generate',
    async (messages, { dispatch, getState }) => {
        const { activeModel, modelProvider } = getState().ai;
        if (!activeModel) throw new Error("No model loaded");

        // Route to appropriate service based on provider
        if (modelProvider === 'transformers') {
            // Use Transformers.js service
            await transformersService.chat(messages, (text) => {
                dispatch(setStreamingResponse(text));
            });
        } else {
            // Use MLC WebLLM service
            await webLLMService.chat(messages, (text) => {
                dispatch(setStreamingResponse(text));
            });
        }

        return; // fulfilled
    }
);

const aiSlice = createSlice({
    name: 'ai',
    initialState: {
        activeModel: null,
        modelProvider: null, // 'mlc' or 'transformers'
        modelStatus: 'idle', // idle, loading, ready, error
        downloadProgress: { text: '', progress: 0 },
        streamingResponse: '',
        error: null,
        availableModels: [
            // === VISION MODELS (Step 1: Extract Text from Images) ===
            // All models support Italian language OCR - WORKING & TESTED

            // BEST AVAILABLE - Proven to work in browser
            {
                id: "onnx-community/Florence-2-base-ft",
                name: "Florence-2 Base (230M) ⭐ RECOMMENDED",
                size: "340MB",
                provider: "transformers",
                capabilities: "Italian OCR, layout understanding, fast extraction",
                experimental: false,
                description: "🇮🇹 Microsoft's document model. Fast Italian text extraction (<1s). PROVEN to work in browser. Best for most use cases."
            },
            {
                id: "HuggingFaceTB/SmolVLM-500M",
                name: "SmolVLM 500M ⭐ BEST CONTEXT",
                size: "400MB",
                provider: "transformers",
                capabilities: "Italian document understanding, contextual extraction, streaming",
                experimental: false,
                description: "🇮🇹 Better context understanding than Florence-2. Real-time streaming. Good for complex Italian documents."
            },
            {
                id: "Xenova/moondream2",
                name: "Moondream2 (500M) - Conversational",
                size: "800MB",
                provider: "transformers",
                capabilities: "Italian VQA, detailed analysis",
                experimental: false,
                description: "🇮🇹 Best for Q&A about Italian documents. Good visual understanding. Slower but thorough."
            },

            // === TEXT MODELS (Step 2: Structure to JSON) ===
            // Use these AFTER vision model extracts text

            // HIGH QUALITY - Qwen2.5 (Best for structured extraction)
            {
                id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
                name: "Qwen2.5 1.5B ⭐⭐ BEST FOR JSON",
                size: "~1.6GB",
                provider: "mlc",
                capabilities: "Italian OCR → JSON, superior structured extraction",
                description: "🔄 Alibaba's latest. BEST quality for Italian text → JSON. Better than Phi-3 for structured data."
            },
            {
                id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
                name: "Qwen2.5 7B ⭐⭐⭐ HIGHEST QUALITY JSON",
                size: "~4.5GB",
                provider: "mlc",
                capabilities: "Complex Italian → JSON, advanced schema validation",
                description: "🔄 TOP quality for complex Italian documents. Best field mapping & validation. Slower but most accurate."
            },
            {
                id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
                name: "Phi 3 Mini (3.8B) - Fast JSON",
                size: "2.3GB",
                provider: "mlc",
                capabilities: "Convert Italian OCR → JSON, schema validation",
                description: "🔄 Fast & efficient. Good for simple Italian text → JSON conversion."
            },
            {
                id: "Llama-3-8B-Instruct-q4f16_1-MLC",
                name: "Llama 3 (8B) - Balanced",
                size: "4.6GB",
                provider: "mlc",
                capabilities: "Italian text → JSON with validation",
                description: "🔄 Good balance of speed/quality for Italian document structuring."
            },
            {
                id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",
                name: "TinyLlama (1.1B) - Fastest",
                size: "698MB",
                provider: "mlc",
                capabilities: "Basic Italian text reformatting",
                description: "🔄 Fastest option. Good for simple Italian text → JSON."
            },

            // === EXPERIMENTAL / SPECIALIZED ===
            {
                id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
                name: "Phi-3.5 Vision (4.2GB) ⚠️ EXPERIMENTAL",
                size: "4.2GB",
                provider: "mlc",
                capabilities: "Integrated VLM (Text + Vision in one)",
                experimental: true,
                description: "⚠️ Microsoft's VLM. May have shader/browser compatibility issues. If it works, it's very powerful."
            },
            {
                id: "Titan-Embed-Image-v1",
                name: "Titan Image Embedding",
                size: "Unknown",
                provider: "mlc",
                capabilities: "Image embeddings for search",
                experimental: true,
                description: "Experimental image embedding model."
            },
            {
                id: "onnx-community/TexTeller-ONNX",
                name: "TexTeller (Math/LaTeX) 🧮",
                size: "~200MB",
                provider: "transformers",
                capabilities: "Extracts Math Formulas → LaTeX",
                description: "Specialized model for converting images of math formulas into LaTeX code."
            },
            {
                id: "mistralai/Ministral-3-3B-Instruct-2512-ONNX",
                name: "Ministral 3B (ONNX) 🇫🇷",
                size: "~3GB",
                provider: "transformers",
                capabilities: "Text Generation (Slow via ONNX)",
                experimental: true,
                description: "⚠️ Experimental. 3B parameter text model running via Transformers.js pipeline. May be significantly slower than WebLLM models."
            },
            {
                id: "onnx-community/FastVLM-0.5B-ONNX",
                name: "FastVLM 0.5B ⚡",
                size: "~600MB",
                provider: "transformers",
                capabilities: "Fast Vision-Language (Apple)",
                description: "Ultra-fast, efficient vision model. ideal for quick image analysis."
            },
            {
                id: "onnx-community/granite-docling-258M-ONNX",
                name: "Granite Docling 📄",
                size: "~258MB",
                provider: "transformers",
                capabilities: "Document Layout & Structure Analysis",
                description: "IBM's compact model for preserving document layout/tables/markdown."
            },
            {
                id: "onnx-community/Qwen2-VL-7B-Instruct",
                name: "Qwen2-VL 7B (ONNX) ⚠️ HIGH RAM",
                size: "~4.5GB",
                provider: "transformers",
                capabilities: "Vision-Language, Video Understanding",
                experimental: true,
                description: "⚠️ Requires 8GB+ RAM. May crash browser. Powerful vision understanding."
            },
            {
                id: "pdufour/Qwen2-VL-2B-Instruct-ONNX-Q4-F16",
                name: "Qwen2-VL 2B (Local Cache) 🚀",
                size: "~1.5GB",
                provider: "transformers",
                capabilities: "Fast Vision-Language (Cached)",
                description: "Optimized local loading via cache. Offline capable."
            }
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
                state.activeModel = action.payload.modelId;
                state.modelProvider = action.payload.provider;
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
