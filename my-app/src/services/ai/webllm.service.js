import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import Worker from '../../workers/llm.worker?worker';

class WebLLMService {
    constructor() {
        this.engine = null;
        this.worker = null;
    }

    /**
     * Initialize the engine with a worker
     */
    async initialize() {
        if (this.engine) return;

        // Create a new worker instance
        this.worker = new Worker();

        // Create the engine interface that communicates with the worker
        // We use the class constructor directly to avoid auto-loading a model immediately
        this.engine = new WebWorkerMLCEngine(this.worker, {
            initProgressCallback: (report) => {
                // We'll attach a listener for this in the UI/Slice later
                // For now, we rely on the custom callback we pass to reload/load
                console.log('Init Progress:', report);
                if (this.onProgress) {
                    this.onProgress(report);
                }
            }
        });
    }

    /**
     * Load a specific model with enhanced error handling
     * @param {string} modelId
     * @param {Function} onProgress
     */
    async loadModel(modelId, onProgress) {
        console.log('[WebLLMService] loadModel called with:', modelId);

        if (!this.engine) {
            console.log('[WebLLMService] Engine not initialized, initializing...');
            await this.initialize();
        }

        this.onProgress = onProgress;
        console.log('[WebLLMService] Checking if vision model...');

        // Check if this is a vision model
        const isVision = this.isVisionModel(modelId);
        console.log('[WebLLMService] isVision:', isVision);

        // If vision model, check WebGPU capabilities
        if (isVision) {
            console.log('[WebLLMService] Vision model detected, checking WebGPU support...');
            const gpuCheck = await this.checkWebGPUSupport();
            console.log('[WebLLMService] WebGPU check:', gpuCheck);

            if (!gpuCheck.supported) {
                throw new Error(`Cannot load vision model: ${gpuCheck.error}`);
            }

            if (!gpuCheck.hasShaderF16) {
                console.warn('[WebLLMService] Warning: shader-f16 not supported. Vision model may fail to load.');
                // Continue anyway but warn user
                if (onProgress) {
                    onProgress({
                        text: 'Warning: Your GPU may not support this model',
                        progress: 0
                    });
                }
            }
        }

        // Reload/Load the model
        // This downloads weights if not cached
        // We limit context_window_size to 2048 to reduce RAM usage (KV cache)
        const chatOpts = {
            context_window_size: 2048
        };

        console.log('[WebLLMService] Starting model reload with options:', chatOpts);

        try {
            await this.engine.reload(modelId, chatOpts);
            console.log('[WebLLMService] Model loaded successfully!');
            this.onProgress = null;
            return { success: true, modelId };

        } catch (error) {
            console.error('[WebLLMService] Error loading model:', error);
            this.onProgress = null;

            const errorMessage = error.message || String(error) || 'Unknown error';

            // Detect Storage Quota / Cache errors
            if (errorMessage.includes('Cache') ||
                errorMessage.includes('Quota') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('Failed to execute \'add\' on \'Cache\'')) {
                throw new Error(
                    `Browser Storage Full (Quota Exceeded).\n\n` +
                    `You have downloaded too many models (Phi-3.5 is ~4.2GB).\n` +
                    `Please click the "🗑️ Clear Cache" button to free up space, then try again.`
                );
            }

            // Detect specific shader/WebGPU errors
            if (errorMessage.includes('WGSL') ||
                errorMessage.includes('shader') ||
                errorMessage.includes('chromium_experimental') ||
                errorMessage.includes('u8')) {

                const alternative = this.getAlternativeModel(modelId);
                const altText = alternative ? `\n\nTry alternative: ${alternative}` : '';

                throw new Error(
                    `WebGPU Shader Error: This model requires experimental browser features that are not available.\n\n` +
                    `Error details: ${errorMessage}\n\n` +
                    `Suggestions:\n` +
                    `1. Try Florence-2-base (340MB, excellent for documents)\n` +
                    `2. Use a text-only model like Qwen2.5 or Phi-3-mini\n` +
                    `3. Update to the latest Chrome/Edge browser${altText}`
                );
            }

            // Detect missing parameter errors (Phi-3.5-vision specific issue)
            if (error.message.includes('Cannot find parameter in cache') ||
                error.message.includes('vision_embed_tokens')) {

                throw new Error(
                    `Model Loading Error: The Phi-3.5-vision model has known compatibility issues.\n\n` +
                    `Error: ${error.message}\n\n` +
                    `Recommendations:\n` +
                    `• Use Llama-3.2-11B-Vision-Instruct-q4f16_1-MLC (better WebLLM support)\n` +
                    `• Try Florence-2-base via Transformers.js (340MB, faster, excellent OCR)\n` +
                    `• Use SmolVLM-500M for browser-optimized VQA`
                );
            }

            // Generic error passthrough
            throw error;
        }
    }

    /**
     * Generate text from a prompt (Streaming)
     * @param {Array<{role: string, content: string}>} messages 
     * @param {Function} onUpdate - Streaming callback
     */
    async chat(messages, onUpdate) {
        if (!this.engine) throw new Error("Engine not initialized");

        const completion = await this.engine.chat.completions.create({
            messages,
            stream: true,
        });

        let fullText = "";
        for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content || "";
            fullText += delta;
            if (onUpdate) onUpdate(fullText);
        }

        return fullText;
    }

    /**
     * Internal helper for non-streaming JSON completion
     */
    async _jsonCompletion(messages) {
        if (!this.engine) throw new Error("Engine not initialized");

        const completion = await this.engine.chat.completions.create({
            messages,
            stream: false,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse JSON response:", content);
            throw new Error("AI response was not valid JSON");
        }
    }

    /**
     * Classify a document based on its text
     * @param {string} text 
     * @returns {Promise<{type: string, confidence: number}>}
     */
    async classifyDocument(text) {
        if (!this.engine) {
            console.log("AI Model not loaded, skipping classification.");
            return null;
        }

        const { getClassificationPrompt } = await import('../../utils/schemas');
        const systemPrompt = getClassificationPrompt();

        // Truncate text to avoid token limits (e.g. first 2000 chars)
        const truncatedText = text.slice(0, 2000);

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: truncatedText }
        ];

        return this._jsonCompletion(messages);
    }

    async extractData(text, type) {
        if (!this.engine) {
            console.log("AI Model not loaded, skipping extraction.");
            return null;
        }

        const { getExtractionPrompt } = await import('../../utils/schemas');
        const systemPrompt = getExtractionPrompt(type);

        if (!systemPrompt) {
            throw new Error(`Unknown document type: ${type}`);
        }

        // We might need more text for extraction, but still be mindful of limits
        // 4000 chars ~ 1000 tokens. 
        const truncatedText = text.slice(0, 6000);

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: truncatedText }
        ];

        return this._jsonCompletion(messages);
    }

    /**
     * Clear all cached models to free up space
     */
    async deleteModelCache() {
        if ('caches' in window) {
            const keys = await caches.keys();
            const webllmKeys = keys.filter(k => k.startsWith('webllm/'));
            for (const key of webllmKeys) {
                await caches.delete(key);
            }
            console.log(`Deleted ${webllmKeys.length} cache entries.`);
            return webllmKeys.length;
        }
        return 0;
    }

    /**
     * Check if WebGPU supports required features for vision models
     * @returns {Promise<{supported: boolean, features: string[], hasShaderF16: boolean, error: string|null}>}
     */
    async checkWebGPUSupport() {
        if (!navigator.gpu) {
            return {
                supported: false,
                features: [],
                hasShaderF16: false,
                error: 'WebGPU is not supported in this browser'
            };
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                return {
                    supported: false,
                    features: [],
                    hasShaderF16: false,
                    error: 'No WebGPU adapter available'
                };
            }

            const features = Array.from(adapter.features);

            // Check for shader-f16 support (required for vision models)
            const hasShaderF16 = features.includes('shader-f16');

            // Log available features for debugging
            console.log('WebGPU Features:', features);

            return {
                supported: true,
                features: features,
                hasShaderF16: hasShaderF16,
                error: null
            };
        } catch (error) {
            return {
                supported: false,
                features: [],
                hasShaderF16: false,
                error: error.message
            };
        }
    }

    /**
     * Check if a model is a vision model
     * @param {string} modelId
     * @returns {boolean}
     */
    isVisionModel(modelId) {
        if (!modelId) return false;
        return modelId.includes('Vision') ||
            modelId.includes('vision') ||
            modelId.includes('Llava');
    }

    /**
     * Get recommended alternative for a failed model
     * @param {string} failedModelId
     * @returns {string|null}
     */
    getAlternativeModel(failedModelId) {
        const alternatives = {
            'Phi-3.5-vision-instruct-q4f16_1-MLC': 'Llama-3.2-11B-Vision-Instruct-q4f16_1-MLC',
            'Llama-3.2-11B-Vision-Instruct-q4f16_1-MLC': 'Phi-3-mini-4k-instruct-q4f16_1-MLC', // Fallback to text
        };

        return alternatives[failedModelId] || null;
    }
}

export const webLLMService = new WebLLMService();
