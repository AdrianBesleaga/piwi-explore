
import * as ort from 'onnxruntime-web';

class OnnxService {
    constructor() {
        this.session = null;
    }

    /**
     * Initialize the ONNX session with the model
     * @param {string|ArrayBuffer} modelPathOrBuffer 
     */
    async initialize(modelPathOrBuffer) {
        if (this.session) return;

        try {
            // Set wasm paths if needed (usually handled by vite/webpack copy, but sometimes explicit path needed)
            // ort.env.wasm.wasmPaths = "/"; 

            this.session = await ort.InferenceSession.create(modelPathOrBuffer, {
                executionProviders: ['wasm'] // Force WASM for broad compatibility
            });
            console.log('ONNX Session initialized');
        } catch (e) {
            console.error('Failed to init ONNX session:', e);
            throw e;
        }
    }

    /**
     * Run detection on an image
     * @param {Float32Array} tensorData - Preprocessed image data
     * @param {number[]} dims - Dimensions [1, 3, 640, 640] typically for YOLO
     * @returns {Promise<any>}
     */
    async detect(tensorData, dims) {
        if (!this.session) throw new Error("Session not initialized");

        const feeds = {};
        const inputName = this.session.inputNames[0];
        feeds[inputName] = new ort.Tensor('float32', tensorData, dims);

        const results = await this.session.run(feeds);
        return results;
    }
}

export const onnxService = new OnnxService();
