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
     * Load a specific model
     * @param {string} modelId 
     * @param {Function} onProgress 
     */
    async loadModel(modelId, onProgress) {
        if (!this.engine) await this.initialize();

        this.onProgress = onProgress;

        // Reload/Load the model
        // This downloads weights if not cached
        // We limit context_window_size to 2048 to reduce RAM usage (KV cache)
        const chatOpts = {
            context_window_size: 2048
        };

        await this.engine.reload(modelId, chatOpts);

        this.onProgress = null;
        return true;
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
}

export const webLLMService = new WebLLMService();
