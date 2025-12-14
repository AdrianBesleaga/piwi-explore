import { CreateMLCEngine } from "@mlc-ai/web-llm";
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
        // CreateMLCEngine handles the handshake and proxying
        this.engine = await CreateMLCEngine(this.worker, {
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
        await this.engine.reload(modelId);

        this.onProgress = null;
        return true;
    }

    /**
     * Generate text from a prompt
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
}

export const webLLMService = new WebLLMService();
