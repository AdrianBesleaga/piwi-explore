import { WebWorkerMLCEngineHandler, MLCEngine } from "@mlc-ai/web-llm";

// Connect the worker handler to the engine with enhanced logging
const engine = new MLCEngine({
    logLevel: "INFO", // Enable detailed logging to debug issues
    initProgressCallback: (report) => {
        // This helps track initialization issues
        console.log('[Worker] Init Progress:', report);
    }
});

const handler = new WebWorkerMLCEngineHandler(engine);

self.onmessage = (msg) => {
    handler.onmessage(msg);
};

// Log WebGPU availability in worker
if (typeof navigator !== 'undefined' && navigator.gpu) {
    console.log('[Worker] WebGPU is available');
    navigator.gpu.requestAdapter().then(adapter => {
        if (adapter) {
            console.log('[Worker] WebGPU adapter:', adapter);
            console.log('[Worker] WebGPU features:', Array.from(adapter.features));
        }
    });
} else {
    console.warn('[Worker] WebGPU is not available in this worker');
}
