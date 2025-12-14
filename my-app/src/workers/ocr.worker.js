import { createWorker } from 'tesseract.js';

// Tesseract.js Worker Implementation
// We spawn a Tesseract worker (which might be a child worker) 
// to handle the heavy OCR operations.

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    if (type === 'EXTRACT_TEXT') {
        let worker = null;
        try {
            const { fileBlob, language = 'eng' } = payload;

            // Initialize Tesseract Worker
            worker = await createWorker(language, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        self.postMessage({
                            type: 'PROGRESS',
                            id,
                            payload: {
                                status: m.status,
                                progress: m.progress,
                                percent: Math.round(m.progress * 100)
                            }
                        });
                    }
                }
            });

            // helper to convert blob to base64 or url, but tesseract accepts blob/file directly usually.
            // However, sometimes passing a URL is safer across worker boundaries if blob support is flaky.
            // But let's try passing the blob.

            const ret = await worker.recognize(fileBlob);
            const text = ret.data.text;

            self.postMessage({
                type: 'SUCCESS',
                id,
                payload: {
                    text: text,
                    confidence: ret.data.confidence,
                    // We could return more detailed blocks/lines if needed
                }
            });

            await worker.terminate();

        } catch (error) {
            console.error('OCR Worker Error:', error);
            self.postMessage({
                type: 'ERROR',
                id,
                payload: error.message
            });
            if (worker) {
                try { await worker.terminate(); } catch (e) { /* ignore */ }
            }
        }
    }
};
