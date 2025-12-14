
import { onnxService } from '../services/ai/onnx.service';

// Basic message handler
self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    try {
        switch (type) {
            case 'INIT':
                await onnxService.initialize(payload.modelUrl || payload.modelBuffer);
                self.postMessage({ type: 'INIT_COMPLETE', id });
                break;

            case 'DETECT':
                // Payload should contain preprocessed tensor data or we preprocess here.
                // For simplicity, let's assume we pass raw image data and preprocess here, 
                // BUT transferring large buffers is expensive. 
                // Ideally, we use OffscreenCanvas in worker to resize/preprocess.
                // For this MVP, let's assume the main thread sends specific data or we implement basic preprocessing here.

                // Placeholder: actually running the session
                // In a real YOLO implementation, we need:
                // 1. Resize image to 640x640 (or model dim)
                // 2. Normalize pixel values
                // 3. Create Tensor
                // 4. Run session
                // 5. Post-process (NMS)

                // Just mocking the "success" for the skeleton until we integrate the full preprocessing logic
                // or if onnxService does it.

                // const results = await onnxService.detect(payload.tensor, payload.dims);
                // self.postMessage({ type: 'DETECT_COMPLETE', id, results });

                // Mock return for now since we don't have the actual model loaded in this step
                // and complex preprocessing is needed.
                self.postMessage({
                    type: 'DETECT_COMPLETE',
                    id,
                    results: [
                        { label: 'text_field', box: [100, 100, 200, 50], score: 0.95 },
                        { label: 'checkbox', box: [50, 50, 20, 20], score: 0.88 }
                    ]
                });
                break;

            default:
                console.warn('Unknown message type:', type);
        }
    } catch (error) {
        self.postMessage({ type: 'ERROR', id, error: error.message });
    }
};
