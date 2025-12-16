import { pipeline, env, Florence2ForConditionalGeneration, Qwen2VLForConditionalGeneration, AutoProcessor, RawImage } from '@huggingface/transformers';

// Configure Transformers.js environment
// Use local models cache instead of remote CDN for better performance
env.allowLocalModels = false; // We want to download from HuggingFace
env.allowRemoteModels = true;

class TransformersService {
    constructor() {
        this.model = null;
        this.processor = null; // For Florence-2 models
        this.modelId = null;
        this.modelType = null; // 'florence', 'moondream', etc.
    }

    /**
     * Load a Transformers.js model
     * @param {string} modelId - HuggingFace model ID (e.g., 'Xenova/moondream2')
     * @param {Function} onProgress - Progress callback
     */
    async loadModel(modelId, onProgress) {
        try {
            console.log('[TransformersService] Starting to load model:', modelId);

            // Determine model type based on model ID (case-insensitive)
            const modelIdLower = modelId.toLowerCase();
            if (modelIdLower.includes('florence')) {
                // Florence-2 requires a different loading approach
                this.modelType = 'florence';
                console.log('[TransformersService] Loading Florence-2 model...');

                // Report progress
                if (onProgress) {
                    onProgress({
                        text: 'Downloading Florence-2 model from HuggingFace...',
                        progress: 0
                    });
                }

                // Load Florence-2 model and processor
                console.log('[TransformersService] Loading Florence2ForConditionalGeneration...');
                this.model = await Florence2ForConditionalGeneration.from_pretrained(modelId, {
                    dtype: 'fp32',
                    device: navigator.gpu ? 'webgpu' : 'wasm',
                    progress_callback: (progress) => {
                        if (onProgress && progress.status === 'progress') {
                            const percent = progress.progress / 100;
                            onProgress({
                                text: `Downloading: ${progress.file || 'model files'}`,
                                progress: percent
                            });
                        }
                    }
                });
                console.log('[TransformersService] Model loaded:', !!this.model);

                console.log('[TransformersService] Loading AutoProcessor...');
                this.processor = await AutoProcessor.from_pretrained(modelId);
                console.log('[TransformersService] Processor loaded:', !!this.processor);
            } else if (modelIdLower.includes('qwen2-vl')) {
                // Qwen2-VL - advanced vision-language model
                this.modelType = 'qwen2-vl';
                console.log('[TransformersService] Loading Qwen2-VL model...');

                if (onProgress) {
                    onProgress({
                        text: 'Downloading Qwen2-VL model from HuggingFace...',
                        progress: 0
                    });
                }

                // Load Qwen2-VL model - uses similar approach to Florence-2
                this.model = await Qwen2VLForConditionalGeneration.from_pretrained(modelId, {
                    dtype: 'fp32',
                    device: navigator.gpu ? 'webgpu' : 'wasm',
                    progress_callback: (progress) => {
                        if (onProgress && progress.status === 'progress') {
                            const percent = progress.progress / 100;
                            onProgress({
                                text: `Downloading: ${progress.file || 'model files'}`,
                                progress: percent
                            });
                        }
                    }
                });
                console.log('[TransformersService] Qwen2-VL model loaded:', !!this.model);

                this.processor = await AutoProcessor.from_pretrained(modelId);
                console.log('[TransformersService] Qwen2-VL processor loaded:', !!this.processor);
            } else if (modelIdLower.includes('moondream') || modelIdLower.includes('fastvlm') || modelIdLower.includes('granite')) {
                // Moondream, FastVLM, and Granite use standard pipeline
                this.modelType = 'moondream';
                let task = 'image-to-text';
                console.log('[TransformersService] Loading Vision Pipeline model:', modelId);

                // Report progress
                if (onProgress) {
                    onProgress({
                        text: 'Downloading model from HuggingFace...',
                        progress: 0
                    });
                } else if (modelIdLower.includes('ministral') || modelIdLower.includes('mistral')) {
                    // Text generation models
                    this.modelType = 'text-generation';
                    let task = 'text-generation';
                    console.log('[TransformersService] Loading Text Generation model:', modelId);

                    if (onProgress) {
                        onProgress({
                            text: 'Downloading text model...',
                            progress: 0
                        });
                    }

                    this.pipe = await pipeline(task, modelId, {
                        dtype: 'q4', // Quantized for text models usually
                        device: navigator.gpu ? 'webgpu' : 'wasm',
                        progress_callback: (progress) => {
                            if (onProgress && progress.status === 'progress') {
                                const percent = progress.progress / 100;
                                onProgress({
                                    text: `Downloading: ${progress.file}`,
                                    progress: percent
                                });
                            }
                        }
                    });
                    console.log('[TransformersService] Text pipeline loaded');
                    return;
                }


                // Load the model with WebGPU if available
                this.model = await pipeline(task, modelId, {
                    device: navigator.gpu ? 'webgpu' : 'wasm',
                    progress_callback: (progress) => {
                        if (onProgress && progress.status === 'progress') {
                            const percent = progress.progress / 100;
                            onProgress({
                                text: `Downloading: ${progress.file || 'model files'}`,
                                progress: percent
                            });
                        }
                    }
                });
                console.log('[TransformersService] Model loaded:', !!this.model);
            }

            this.modelId = modelId;
            console.log('[TransformersService] Model loading complete. Type:', this.modelType, 'ID:', this.modelId);

            if (onProgress) {
                onProgress({
                    text: 'Model loaded successfully!',
                    progress: 1
                });
            }

            return { success: true, modelId };

        } catch (error) {
            console.error('[TransformersService] Failed to load model:', error);
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }

    /**
     * Generate a caption or answer for an image
     * @param {string|Blob|File} image - Image data (URL, Blob, or File)
     * @param {string} prompt - Optional prompt/question for the image
     * @returns {Promise<string>}
     */
    async generateFromImage(image, prompt = null) {
        if (!this.model) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }

        try {
            let result;

            if (this.modelType === 'florence') {
                // Florence-2 requires using the processor and model directly
                // User can provide Florence-2 task tokens directly: <OCR>, <CAPTION>, etc.
                // Default to OCR for document text extraction
                let task;

                if (prompt && prompt.startsWith('<') && prompt.endsWith('>')) {
                    // User provided a Florence-2 task token directly
                    task = prompt;
                    console.log('[TransformersService] Using provided Florence-2 task:', task);
                } else {
                    // Default to OCR for text extraction (main use case)
                    task = '<OCR>';
                    console.log('[TransformersService] Using default OCR task. Prompt:', prompt);
                }

                // Load image as RawImage if it's not already
                let rawImage;
                if (typeof image === 'string') {
                    // It's a URL or data URL
                    rawImage = await RawImage.fromURL(image);
                } else if (image instanceof Blob || image instanceof File) {
                    // Convert Blob/File to data URL first
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(image);
                    });
                    rawImage = await RawImage.fromURL(dataUrl);
                } else {
                    rawImage = image; // Assume it's already a RawImage
                }

                // Construct prompts using the processor
                const prompts = this.processor.construct_prompts(task);

                // Pre-process the image and text inputs
                const inputs = await this.processor(rawImage, prompts);

                // Generate text
                const generated_ids = await this.model.generate({
                    ...inputs,
                    max_new_tokens: 100,
                });

                // Decode generated text
                const generated_text = this.processor.batch_decode(generated_ids, {
                    skip_special_tokens: false
                })[0];

                // Post-process the generated text
                const postProcessed = this.processor.post_process_generation(
                    generated_text,
                    task,
                    rawImage.size
                );

                // Extract the result for the task
                result = postProcessed[task];
                return result || JSON.stringify(postProcessed);

            } else if (this.modelType === 'moondream') {
                // Moondream for VQA (uses pipeline API)
                const question = prompt || 'Describe this image.';
                result = await this.model(image, {
                    prompt: question
                });
            } else {
                // Generic image-to-text
                result = await this.model(image);
            }

            // Extract text from result (for non-Florence models)
            if (Array.isArray(result) && result.length > 0) {
                return result[0].generated_text || result[0].text || '';
            } else if (result.generated_text) {
                return result.generated_text;
            } else if (result.text) {
                return result.text;
            }

            return JSON.stringify(result); // Fallback

        } catch (error) {
            console.error('Error generating from image:', error);
            throw error;
        }
    }

    /**
     * Perform OCR with context understanding on an image (Florence-2 specific)
     * Extracts text while understanding document structure and layout
     * @param {string|Blob|File} image
     * @returns {Promise<string>}
     */
    async performOCR(image) {
        if (this.modelType !== 'florence') {
            throw new Error('OCR is only supported with Florence-2 models');
        }

        return this.generateFromImage(image, '<OCR>');
    }

    /**
     * Perform OCR with bounding boxes (Florence-2 specific)
     * Returns text with spatial information for layout understanding
     * @param {string|Blob|File} image
     * @returns {Promise<string>}
     */
    async performOCRWithRegion(image) {
        if (this.modelType !== 'florence') {
            throw new Error('OCR with region is only supported with Florence-2 models');
        }

        return this.generateFromImage(image, '<OCR_WITH_REGION>');
    }

    /**
     * Generate a detailed caption (Florence-2 specific)
     * @param {string|Blob|File} image
     * @returns {Promise<string>}
     */
    async detailedCaption(image) {
        if (this.modelType !== 'florence') {
            throw new Error('Detailed caption is only supported with Florence-2 models');
        }

        return this.generateFromImage(image, '<DETAILED_CAPTION>');
    }

    /**
     * Answer a question about an image (VQA)
     * @param {string|Blob|File} image
     * @param {string} question
     * @returns {Promise<string>}
     */
    async answerQuestion(image, question) {
        return this.generateFromImage(image, question);
    }

    /**
     * Chat interface similar to webLLMService
     * @param {Array<{role: string, content: string|Array}>} messages
     * @param {Function} onUpdate - Streaming callback (not truly streaming, but for API compatibility)
     * @returns {Promise<string>}
     */
    async chat(messages, onUpdate) {
        console.log('[TransformersService] chat() called with', messages.length, 'messages');

        // Check if model is loaded (Florence-2 requires both model and processor)
        if (!this.model) {
            throw new Error(`Model not loaded. Model type: ${this.modelType}, Model ID: ${this.modelId}`);
        }

        if (this.modelType === 'florence' && !this.processor) {
            throw new Error('Florence-2 processor not loaded. Model may not have loaded correctly.');
        }

        // Extract the last user message
        const lastMessage = messages[messages.length - 1];
        console.log('[TransformersService] Last message:', lastMessage);

        if (!lastMessage || lastMessage.role !== 'user') {
            throw new Error('Last message must be from user');
        }

        // Handle multimodal content (text + image)
        let imageData = null;
        let userText = '';

        if (Array.isArray(lastMessage.content)) {
            console.log('[TransformersService] Processing multimodal message with', lastMessage.content.length, 'items');
            // Multimodal message with image
            for (const item of lastMessage.content) {
                if (item.type === 'text') {
                    userText = item.text;
                    console.log('[TransformersService] Found text:', userText);
                } else if (item.type === 'image_url') {
                    imageData = item.image_url.url;
                    console.log('[TransformersService] Found image URL (length):', imageData?.length);
                }
            }
        } else {
            // Text-only message
            userText = lastMessage.content;
            console.log('[TransformersService] Text-only message:', userText);
        }

        if (!imageData) {
            console.error('[TransformersService] No image data found in message!');
            throw new Error('Vision models require an image. No image found in message.');
        }

        console.log('[TransformersService] Generating response for text:', userText);
        // Generate response
        const response = await this.generateFromImage(imageData, userText);
        console.log('[TransformersService] Response generated:', response?.substring(0, 100));

        // Call onUpdate callback for API compatibility (not streaming, just final result)
        if (onUpdate) {
            onUpdate(response);
        }

        return response;
    }

    /**
     * Check if a model is loaded
     * @returns {boolean}
     */
    isLoaded() {
        return this.model !== null;
    }

    /**
     * Get current model info
     * @returns {Object|null}
     */
    getModelInfo() {
        if (!this.model) return null;

        return {
            id: this.modelId,
            type: this.modelType,
            loaded: true
        };
    }
}

export const transformersService = new TransformersService();
