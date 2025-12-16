
const REMOTE_MODEL_ID = "pdufour/Qwen2-VL-2B-Instruct-ONNX-Q4-F16";
const BASE_MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct";
const LOCAL_BASE_PATH = "/models/qwen2-vl-2b";

// Map local files (in public/models/...) to their Remote HuggingFace URLs
// Transformers.js constructs URLs like: https://huggingface.co/{model_id}/resolve/main/{file}
const FILES_TO_SEED = [
    { local: "config.json", remote: "config.json" },
    { local: "tokenizer.json", remote: "tokenizer.json" },
    { local: "tokenizer_config.json", remote: "tokenizer_config.json" },
    { local: "preprocessor_config.json", remote: "preprocessor_config.json" },
    { local: "generation_config.json", remote: "generation_config.json" },
    { local: "merges.txt", remote: "merges.txt" },
    { local: "vocab.json", remote: "vocab.json" },
    // ONNX files (Manual Loading A-E)
    { local: "onnx/QwenVL_A_q4f16.onnx", remote: "onnx/QwenVL_A_q4f16.onnx" },
    { local: "onnx/QwenVL_B_q4f16.onnx", remote: "onnx/QwenVL_B_q4f16.onnx" },
    { local: "onnx/QwenVL_C_q4f16.onnx", remote: "onnx/QwenVL_C_q4f16.onnx" },
    { local: "onnx/QwenVL_D_q4f16.onnx", remote: "onnx/QwenVL_D_q4f16.onnx" },
    { local: "onnx/QwenVL_E_q4f16.onnx", remote: "onnx/QwenVL_E_q4f16.onnx" },
];

export const seedQwen2VLCache = async (onProgress) => {
    try {
        console.log("[CacheSeeder] Starting Qwen2-VL cache seeding...");

        // Open the cache transformers.js uses
        // Default is usually 'transformers-cache'
        const cache = await caches.open('transformers-cache');

        let completed = 0;
        const total = FILES_TO_SEED.length;

        for (const file of FILES_TO_SEED) {
            const localUrl = `${LOCAL_BASE_PATH}/${file.local}`;
            let remoteUrl;
            if (file.remote.endsWith('.onnx')) {
                remoteUrl = `https://huggingface.co/${REMOTE_MODEL_ID}/resolve/main/${file.remote}`;
            } else {
                // Config/Tokenizer files come from Base Repo
                remoteUrl = `https://huggingface.co/${BASE_MODEL_ID}/resolve/main/${file.remote}`;
            }

            // Check if already cached?
            const existing = await cache.match(remoteUrl);

            // FORCE UPDATE for preprocessor_config.json to ensure 'size' param is picked up
            if (file.remote === 'preprocessor_config.json') {
                console.log(`[CacheSeeder] Forcing update for: ${file.remote} (Try #9)`);
                // Try deleting specific cache first
                // Note: we can't easily force-delete just one item from Cache API without matching request. 
                // We will just fetch it fresh.
                await cache.delete(remoteUrl);
            } else if (existing) {
                console.log(`[CacheSeeder] HIT: ${file.remote}`);
                completed++;
                continue;
            }

            console.log(`[CacheSeeder] FISHING (Fetching & Caching): ${localUrl} -> ${remoteUrl}`);

            // Fetch local file
            const response = await fetch(localUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch local file: ${localUrl} (${response.status})`);
            }

            // Create a clone of the response to store in cache
            // Important: We might need to ensure headers are correct for transformers.js validation (e.g. Content-Length)
            // But usually just body is enough.

            // Note: response.blob() might be safer to ensure full read before cache put
            const blob = await response.blob();

            const cacheResponse = new Response(blob, {
                status: 200,
                statusText: "OK",
                headers: new Headers({
                    "Content-Type": "application/octet-stream",
                    "Content-Length": blob.size.toString()
                })
            });

            await cache.put(remoteUrl, cacheResponse);

            completed++;
            if (onProgress) {
                onProgress(`Seeding cache: ${file.remote} (${Math.round(completed / total * 100)}%)`);
            }
        }

        console.log("[CacheSeeder] Cache seeding complete!");
        return true;
    } catch (error) {
        console.error("[CacheSeeder] Error seeding cache:", error);
        return false;
    }
};
