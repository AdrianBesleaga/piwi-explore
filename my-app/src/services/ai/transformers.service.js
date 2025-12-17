import { pipeline, env, Florence2ForConditionalGeneration, Qwen2VLForConditionalGeneration, AutoProcessor, AutoTokenizer, RawImage, Tensor } from '@huggingface/transformers';
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/ort.webgpu.mjs';

// Browser-compatible helpers with Cache API support
async function getModelFile(modelId, fileName) {
    const url = `https://huggingface.co/${modelId}/resolve/main/${fileName}`;

    // Try cache first
    if (typeof window !== 'undefined' && 'caches' in window) {
        try {
            const cache = await caches.open('transformers-cache');
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                console.log('[Cache HIT]', fileName);
                const buffer = await cachedResponse.arrayBuffer();
                return new Uint8Array(buffer);
            }
        } catch (e) {
            console.warn('[Cache] Failed to check cache:', e);
        }
    }

    // Fetch from network
    console.log('[Cache MISS] Fetching:', fileName);
    const response = await env.fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

    // Store in cache
    if (typeof window !== 'undefined' && 'caches' in window) {
        try {
            const cache = await caches.open('transformers-cache');
            await cache.put(url, response.clone());
            console.log('[Cache STORED]', fileName);
        } catch (e) {
            console.warn('[Cache] Failed to store:', e);
        }
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}

async function getModelJSON(modelId, fileName) {
    const url = `https://huggingface.co/${modelId}/resolve/main/${fileName}`;

    // Try cache first
    if (typeof window !== 'undefined' && 'caches' in window) {
        try {
            const cache = await caches.open('transformers-cache');
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                console.log('[Cache HIT]', fileName);
                return await cachedResponse.json();
            }
        } catch (e) {
            console.warn('[Cache] Failed to check cache:', e);
        }
    }

    // Fetch from network
    console.log('[Cache MISS] Fetching:', fileName);
    const response = await env.fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);

    // Store in cache
    if (typeof window !== 'undefined' && 'caches' in window) {
        try {
            const cache = await caches.open('transformers-cache');
            await cache.put(url, response.clone());
            console.log('[Cache STORED]', fileName);
        } catch (e) {
            console.warn('[Cache] Failed to store:', e);
        }
    }

    return await response.json();
}

// Configure Transformers.js environment
// We allow remote models because strictly speaking we are requesting "remote" URLs (mocked by cache)
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
// Configure ONNX Runtime
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/";

// Export helpers for testing
export { getModelFile, getModelJSON };

// Qwen2-VL Constants
const QWEN_CONSTANTS = {
    INPUT_IMAGE_SIZE: [960, 960],
    HEIGHT_FACTOR: 10,
    WIDTH_FACTOR: 10,
    GET_IMAGE_EMBED_SIZE: () => 10 * 10, // WIDTH_FACTOR * HEIGHT_FACTOR
    MAX_SEQ_LENGTH: 1024,
    MAX_SINGLE_CHAT_LENGTH: 200, // Increased for better responses
    QUANT: "q4f16"
};

// Start Helper Functions
function int64ToFloat16(int64Value) {
    const float64Value = Number(int64Value);
    if (!isFinite(float64Value)) return float64Value > 0 ? 0x7c00 : 0xfc00;
    if (float64Value === 0) return 0;
    const sign = float64Value < 0 ? 1 : 0;
    const absValue = Math.abs(float64Value);
    const exponent = Math.floor(Math.log2(absValue));
    const mantissa = absValue / Math.pow(2, exponent) - 1;
    const float16Exponent = exponent + 15;
    const float16Mantissa = Math.round(mantissa * 1024);
    if (float16Exponent <= 0) {
        return (sign << 15) | (float16Mantissa >> 1);
    } else if (float16Exponent >= 31) {
        return (sign << 15) | 0x7c00;
    } else {
        return (sign << 15) | (float16Exponent << 10) | (float16Mantissa & 0x3ff);
    }
}

function float16ToInt64(float16Value) {
    const sign = (float16Value & 0x8000) >> 15;
    const exponent = (float16Value & 0x7c00) >> 10;
    const mantissa = float16Value & 0x03ff;
    if (exponent === 0 && mantissa === 0) return BigInt(0);
    if (exponent === 0x1f) return sign ? BigInt("-Infinity") : BigInt("Infinity");
    let value;
    if (exponent === 0) {
        value = Math.pow(2, -14) * (mantissa / 1024);
    } else {
        value = Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
    }
    value = sign ? -value : value;
    return BigInt(Math.round(value));
}

// getModelFile and getModelJSON now imported from transformers.js hub utilities
// End Helper Functions

class TransformersService {
    constructor() {
        this.model = null; // Used for generic models or Session A for Qwen Manual
        this.processor = null;
        this.tokenizer = null;
        this.modelId = null;
        this.modelType = null;

        // Manual Qwen2-VL Sessions
        this.sessions = {
            A: null,
            B: null,
            C: null,
            D: null,
            E: null
        };
        this.qwenConfig = null;

        // Override env.fetch to provide Content-Length for large files where it's missing (GitHub Pages / some CDNs)
        // This prevents "Array buffer allocation failed" by allowing pre-allocation instead of dynamic growth
        const originalFetch = env.fetch || window.fetch.bind(window);
        env.fetch = async (url, options) => {
            const response = await originalFetch(url, options);

            // Check if this is the large Qwen2-VL model file and Content-Length is missing
            if (url.includes('decoder_model_merged_quantized.onnx') && !response.headers.get('content-length')) {
                console.log('[TransformersService] Injecting Content-Length for large ONNX file to prevent OOM');

                // Clone the response to modify headers
                const newHeaders = new Headers(response.headers);
                // 1.55GB = ~1,664,684,544 bytes. We set slightly higher to be safe: 1.7GB = 1,825,361,100
                // Exact size isn't strictly required, just enough to pre-allocate a large enough buffer
                newHeaders.set('content-length', '1825361100');

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders
                });
            }

            return response;
        };
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
                    dtype: 'fp16',
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
            } else if (modelIdLower.includes('fastvlm')) {
                // FastVLM-0.5B-ONNX
                this.modelType = 'fastvlm';
                console.log('[TransformersService] Loading FastVLM model via pipeline...');

                this.model = await pipeline('image-to-text', modelId, {
                    dtype: 'q4f16',
                    device: 'webgpu',
                    progress_callback: onProgress
                });

                console.log('[TransformersService] FastVLM pipeline loaded successfully.');

            } else if (modelIdLower.includes('gemma')) {
                // Gemma 3n (Multimodal)
                this.modelType = 'gemma';
                console.log('[TransformersService] Loading Gemma model via pipeline...');

                this.model = await pipeline('image-to-text', modelId, {
                    dtype: 'q4f16',
                    device: 'webgpu',
                    progress_callback: onProgress
                });

                console.log('[TransformersService] Gemma pipeline loaded successfully.');

            } else if (modelIdLower.includes('qwen2-vl') || modelIdLower.includes('qwen2.5-vl')) {
                // Qwen2-VL - Manual ONNX loading as per fix
                this.modelType = 'qwen2-vl';
                console.log('[TransformersService] Loading Qwen2-VL model (Manual ONNX approach)...');

                // Seed cache - DISABLED because local files are missing, causing 404 HTML to be cached as ONNX
                // if (modelId.includes('pdufour')) {
                //     await seedQwen2VLCache((msg) => {
                //         if (onProgress) onProgress({ status: 'initiate', name: modelId, file: msg });
                //     });
                // }

                const sessionOptions = {
                    executionProviders: ["webgpu"],
                    logSeverityLevel: 2,
                    logVerbosityLevel: 1,
                    enableProfiling: false, // Disabled profiling for prod
                    graphOptimizationLevel: "all",
                    executionMode: "sequential",
                    intraOpNumThreads: 0,
                    interOpNumThreads: 0,
                };

                const quant = QWEN_CONSTANTS.QUANT;

                // Load basic config from ORIGINAL model repo (pdufour repo might lack these)
                const baseModelId = "Qwen/Qwen2-VL-2B-Instruct";
                this.qwenConfig = await getModelJSON(baseModelId, "config.json");
                this.tokenizer = await AutoTokenizer.from_pretrained(baseModelId);
                console.log('[TransformersService] Qwen config and tokenizer loaded from base repo:', baseModelId);

                // Load Sessions A, B, C
                console.log('[TransformersService] Loading Session A...');
                if (onProgress) onProgress({ text: 'Loading Vision Encoder (Part A)...', progress: 0.2 });
                this.sessions.A = await ort.InferenceSession.create(
                    await getModelFile(modelId, `onnx/QwenVL_A_${quant}.onnx`),
                    sessionOptions
                );

                console.log('[TransformersService] Loading Session B...');
                if (onProgress) onProgress({ text: 'Loading Language Model (Part B)...', progress: 0.4 });
                this.sessions.B = await ort.InferenceSession.create(
                    await getModelFile(modelId, `onnx/QwenVL_B_${quant}.onnx`),
                    sessionOptions
                );

                console.log('[TransformersService] Loading Session C...');
                if (onProgress) onProgress({ text: 'Loading Position/Embeddings (Part C)...', progress: 0.6 });
                this.sessions.C = await ort.InferenceSession.create(
                    await getModelFile(modelId, `onnx/QwenVL_C_${quant}.onnx`),
                    sessionOptions
                );

                // We set this.model to true/something to indicate loaded state for isLoaded()
                this.model = true;
                console.log('[TransformersService] Qwen2-VL manual sessions A, B, C loaded');
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

            // Handle memory allocation errors specifically
            if (error.name === 'RangeError' || error.message.includes('allocation failed') || error.message.includes('out of memory')) {
                throw new Error(
                    `Browser Memory Limit Exceeded.\n\n` +
                    `The model "${modelId}" is too large for your browser's memory buffer (requires ~4.5GB contiguous RAM).\n\n` +
                    `👉 Please try the "Qwen2-VL 2B" model instead, which is optimized for browser use (~1.5GB).`
                );
            }

            throw new Error(`Failed to load model: ${error.message}`);
        }
    }

    /**
     * Generate a caption or answer for an image
     * @param {string|Blob|File} image - Image data (URL, Blob, or File)
     * @param {string} prompt - Optional prompt/question for the image
     * @param {Function} onTokenCallback - Optional callback for streaming tokens (text)
     * @returns {Promise<string>}
     */
    async generateFromImage(image = null, prompt = null, onTokenCallback = null) {
        if (!this.model) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }

        try {
            let result;
            const hasImage = image !== null && image !== undefined;

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

                return result || JSON.stringify(postProcessed);

            } else if (this.modelType === 'fastvlm') {
                // FastVLM Pipeline Generation
                console.log('[TransformersService] Generating with FastVLM pipeline...');

                // Construct prompt
                // FastVLM likely expects standard prompt or chat format supported by pipeline
                const messages = [
                    { role: 'user', content: [] }
                ];

                if (image) {
                    messages[0].content.push({ type: 'image', image: image });
                }
                messages[0].content.push({ type: 'text', text: prompt || "Describe this image." });

                // Call pipeline
                const result = await this.model(messages, {
                    max_new_tokens: 200,
                    streamer: onTokenCallback ? {
                        callback_function: (chunk) => {
                            // Extract text from chunk if it's not already string
                            const text = typeof chunk === 'string' ? chunk : (chunk[0]?.generated_text || '');
                            onTokenCallback(text);
                        }
                    } : undefined
                });

                // Pipeline returns array of results
                console.log('[TransformersService] FastVLM Result:', result);
                return result[0]?.generated_text || JSON.stringify(result);

            } else if (this.modelType === 'gemma') {
                // Gemma Pipeline Generation
                console.log('[TransformersService] Generating with Gemma pipeline...');

                const messages = [
                    { role: 'user', content: [] }
                ];

                if (image) {
                    messages[0].content.push({ type: 'image', image: image });
                }
                messages[0].content.push({ type: 'text', text: prompt || "Describe this image." });

                const result = await this.model(messages, {
                    max_new_tokens: 200,
                    streamer: onTokenCallback ? {
                        callback_function: (chunk) => {
                            const text = typeof chunk === 'string' ? chunk : (chunk[0]?.generated_text || '');
                            onTokenCallback(text);
                        }
                    } : undefined
                });

                console.log('[TransformersService] Gemma Result:', result);
                return result[0]?.generated_text || JSON.stringify(result);

            } else if (this.modelType === 'qwen2-vl') {
                // Qwen2-VL Manual Generation Re-implementation
                console.log('[TransformersService] Starting Qwen2-VL manual generation...');

                const { INPUT_IMAGE_SIZE, HEIGHT_FACTOR, WIDTH_FACTOR, GET_IMAGE_EMBED_SIZE, MAX_SEQ_LENGTH, MAX_SINGLE_CHAT_LENGTH, QUANT } = QWEN_CONSTANTS;
                const IMAGE_EMBED_SIZE = GET_IMAGE_EMBED_SIZE();

                const SYSTEM_PROMPT = `You are a specialized AI specifically designed for document data extraction and image-to-text conversion.
    
CRITICAL OUTPUT RULES:
1. Output MUST be valid JSON only.
2. Do NOT include markdown blocks (no \`\`\`json).
3. Do NOT include explanations or conversational text.
4. Extract content precisely as it appears in the image.`;

                // Initialize Tensors
                const prompt_head_len = new ort.Tensor("int64", new BigInt64Array([5n]), [1]);
                let position_ids;
                let num_decode = 0;
                let history_len = new ort.Tensor("int64", new BigInt64Array([0n]), [1]);
                const pos_factor_v = BigInt(1 - IMAGE_EMBED_SIZE + WIDTH_FACTOR);

                let past_key_states = new ort.Tensor(
                    "float16",
                    new Float16Array(
                        this.qwenConfig.num_hidden_layers *
                        this.qwenConfig.num_key_value_heads *
                        MAX_SEQ_LENGTH *
                        (this.qwenConfig.hidden_size / this.qwenConfig.num_attention_heads)
                    ).fill(0),
                    [
                        this.qwenConfig.num_hidden_layers,
                        this.qwenConfig.num_key_value_heads,
                        MAX_SEQ_LENGTH,
                        this.qwenConfig.hidden_size / this.qwenConfig.num_attention_heads,
                    ]
                );

                let past_value_states = past_key_states;
                // Reference uses 0xfbff (-inf) for attention_mask
                let attention_mask = new ort.Tensor("float16", new Float16Array([0xfbff]), [1]);
                let pos_factor = new ort.Tensor("float16", new Float16Array([0]), [1]);

                // ...

                // Prepare Tokenizer Input
                const content = [];
                if (hasImage) {
                    content.push({ type: "image" });
                }
                content.push({ type: "text", text: prompt || "Describe this image." });

                const messages = [
                    {
                        role: "user", content: content
                    }
                ];

                // Conditional Template: Only use vision tags if an image is actually present.
                // For text-only, using vision tags without running Session D (Vision Merger) confuses the model.
                let templatePrompt;
                if (hasImage) {
                    templatePrompt = `\n<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n<|vision_start|><|vision_end|>${prompt || "Describe this image."}<|im_end|>\n<|im_start|>assistant\n`;
                } else {
                    templatePrompt = `\n<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;
                }

                // Prefer simple template construction to avoid issues with specialized templates
                const token = await this.tokenizer(templatePrompt, {
                    return_tensors: "pt",
                    add_generation_prompt: false,
                    tokenize: true,
                }).input_ids;

                const seq_length = token.dims[1];
                let ids_len = new ort.Tensor("int64", new BigInt64Array([BigInt(seq_length)]), [1]);

                let input_ids = new ort.Tensor(
                    "int32",
                    new Int32Array(MAX_SEQ_LENGTH).fill(0),
                    [MAX_SEQ_LENGTH]
                );
                input_ids.data.set(Array.from(token.data.slice(0, seq_length), Number));

                const dummy = new ort.Tensor("int32", new Int32Array([0]), []);

                // Run Session B (Initial Text)
                console.log("[TransformersService] Run Session B (Initial)");
                let { hidden_states } = await this.sessions.B.run({
                    input_ids: input_ids,
                    ids_len: ids_len,
                });

                // Run Session C (Position IDs)
                console.log("[TransformersService] Run Session C");
                ({ position_ids } = await this.sessions.C.run({
                    dummy: dummy,
                }));
                console.log(`[Debug] Session B hidden_states: ${hidden_states.dims}`);
                console.log(`[Debug] Session C position_ids: ${position_ids.dims}`);

                // Process Image (Real)
                let image_embed;

                if (hasImage) {
                    let rawImage;
                    if (typeof image === 'string') {
                        rawImage = await RawImage.fromURL(image);
                    } else if (image instanceof Blob || image instanceof File) {
                        const dataUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(image);
                        });
                        rawImage = await RawImage.fromURL(dataUrl);
                    } else {
                        rawImage = image;
                    }

                    rawImage = await rawImage.resize(INPUT_IMAGE_SIZE[0], INPUT_IMAGE_SIZE[1]);
                    rawImage = rawImage.rgb();
                    rawImage = rawImage.toTensor("CHW");
                    rawImage = rawImage.to("float32");
                    rawImage = rawImage.div_(255.0);
                    const pixel_values = rawImage.unsqueeze(0);

                    // Session A should already be loaded during loadModel
                    if (!this.sessions.A) {
                        throw new Error("Session A (Vision Encoder) not loaded.");
                    }

                    console.log("[TransformersService] Run Session A");
                    const resA = await this.sessions.A.run({
                        pixel_values: pixel_values,
                    });
                    image_embed = resA.image_embed;

                    // Release Session A after use to free memory
                    await this.sessions.A.release();
                    this.sessions.A = null;

                    // Prepare inputs for Session D (Merger)
                    // Update ids_len manually since ort.Tensor doesn't have .add()
                    ids_len = new ort.Tensor(
                        "int64",
                        new BigInt64Array([ids_len.data[0] + BigInt(IMAGE_EMBED_SIZE)]),
                        [1]
                    );

                    const split_factor = new ort.Tensor(
                        "int32",
                        new Int32Array([MAX_SEQ_LENGTH - Number(ids_len.data[0]) - IMAGE_EMBED_SIZE]),
                        [1]
                    );

                    const ids_len_minus = new ort.Tensor(
                        "int32",
                        new Int32Array([Number(ids_len.data[0]) - Number(prompt_head_len.data[0])]),
                        [1]
                    );

                    // Load Session D if needed
                    if (!this.sessions.D) {
                        console.log("[TransformersService] Loading Session D...");
                        this.sessions.D = await ort.InferenceSession.create(
                            await getModelFile(this.modelId, `onnx/QwenVL_D_${QUANT}.onnx`),
                            { executionProviders: ["webgpu"] }
                        );
                        console.log('[TransformersService] Session D loaded. Provider:', this.sessions.D.handler.backendName || 'unknown');
                    }

                    console.log("[TransformersService] Run Session D");
                    ({ hidden_states, position_ids } = await this.sessions.D.run({
                        "hidden_states.1": hidden_states,
                        image_embed,
                        ids_len,
                        ids_len_minus,
                        split_factor,
                    }));

                    // Release D
                    await this.sessions.D.release();
                    this.sessions.D = null;
                }
                // End of Vision/Text Pre-processing


                // Generation Loop
                let outputText = '';

                while (
                    num_decode < MAX_SINGLE_CHAT_LENGTH &&
                    Number(history_len.data[0]) < MAX_SEQ_LENGTH
                ) {
                    let token_id;

                    if (!this.sessions.E) {
                        console.log("[TransformersService] Loading Session E...");
                        this.sessions.E = await ort.InferenceSession.create(
                            await getModelFile(this.modelId, `onnx/QwenVL_E_${QUANT}.onnx`),
                            {
                                executionProviders: ["wasm"], // Keep WASM for Decode (Session E) for stability
                                executionMode: "sequential",
                                intraOpNumThreads: 0
                            }
                        );
                        console.log('[TransformersService] Session E loaded. Provider:', this.sessions.E.handler.backendName || 'unknown');
                    }

                    console.log("[TransformersService] Run Session E (Decode)");
                    console.log(`[Debug] E Inputs: hidden_states=${hidden_states.dims}, position_ids=${position_ids.dims}, ids_len=${ids_len.data}, pos_factor=${pos_factor.data}`);
                    ({
                        max_logit_ids: token_id,
                        past_key_states: past_key_states,
                        past_value_states: past_value_states,
                    } = await this.sessions.E.run({
                        hidden_states,
                        attention_mask,
                        "past_key_states.1": past_key_states,
                        "past_value_states.1": past_value_states,
                        history_len,
                        ids_len,
                        position_ids,
                        pos_factor,
                    }));

                    if (token_id.data[0] === 151643n || token_id.data[0] === 151645n) { // Check BigInt or Number? ort returns BigInt usually for int64
                        break;
                    }
                    // Handle number comparisons safely
                    const tId = Number(token_id.data[0]);
                    if (tId === 151643 || tId === 151645) break;

                    num_decode++;
                    if (num_decode < 2) {
                        // Update history_len manually
                        history_len = new ort.Tensor(
                            "int64",
                            new BigInt64Array([history_len.data[0] + BigInt(ids_len.data[0])]),
                            [1]
                        );
                        ids_len = new ort.Tensor("int64", new BigInt64Array([1n]), [1]);
                        attention_mask = new ort.Tensor("float16", new Float16Array([0]), [1]);

                        // Vision logic assumption (we always do vision here)
                        // If hasImage, use pos_factor_v + ids_len, else use normal linear
                        const current_pos = hasImage ? (pos_factor_v + ids_len.data[0]) : BigInt(ids_len.data[0]);

                        pos_factor = new ort.Tensor(
                            "float16",
                            new Float16Array([int64ToFloat16(current_pos)]),
                            [1]
                        );
                    } else {
                        // Update history_len manually
                        history_len = new ort.Tensor(
                            "int64",
                            new BigInt64Array([history_len.data[0] + 1n]),
                            [1]
                        );
                        // Update pos_factor manually to stay in ort.Tensor type
                        const newPosFactorValue = int64ToFloat16(float16ToInt64(pos_factor.data[0]) + BigInt(1));
                        pos_factor = new ort.Tensor(
                            "float16",
                            new Float16Array([newPosFactorValue]),
                            [1]
                        );
                    }

                    (input_ids.data)[0] = Number(token_id.data[0]);

                    // Run Session B again
                    const result_B = await this.sessions.B.run({
                        input_ids: input_ids,
                        ids_len: ids_len,
                    });
                    hidden_states = result_B.hidden_states;

                    const decoded = this.tokenizer.decode([Number(token_id.data[0])]);
                    outputText += decoded;

                    if (onTokenCallback) {
                        onTokenCallback(outputText);
                    }
                }

                return outputText;

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
            console.log('[TransformersService] No image data found. Proceeding with text-only chat.');
            // Allow text-only for Qwen2-VL (and others if supported)
        }

        console.log('[TransformersService] Generating response for text:', userText);
        // Generate response
        const response = await this.generateFromImage(imageData, userText, onUpdate);
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
