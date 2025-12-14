import { WebWorkerMLCEngineHandler, MLCEngine } from "@mlc-ai/web-llm";

// Connect the worker handler to the engine
const engine = new MLCEngine();
const handler = new WebWorkerMLCEngineHandler(engine);

self.onmessage = (msg) => {
    handler.onmessage(msg);
};
