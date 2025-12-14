import { createWorker } from 'tesseract.js';

// Tesseract.js Worker Implementation
// We spawn a Tesseract worker (which might be a child worker) 
// to handle the heavy OCR operations.

const preprocessImage = async (fileBlob) => {
    // Check for OffscreenCanvas support (available in workers)
    if (typeof OffscreenCanvas === 'undefined') {
        console.warn('OffscreenCanvas not supported, skipping preprocessing');
        return fileBlob;
    }

    try {
        const bitmap = await createImageBitmap(fileBlob);
        const width = bitmap.width;
        const height = bitmap.height;

        // Scale up 2x for better small text recognition
        const scale = 2;
        const canvas = new OffscreenCanvas(width * scale, height * scale);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(bitmap, 0, 0, width * scale, height * scale);

        const imageData = ctx.getImageData(0, 0, width * scale, height * scale);
        const data = imageData.data;

        // Convert to grayscale and binarize
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Grayscale (weighted average)
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Binarize (simple threshold)
            // Adjust threshold as needed, 128 is standard mid-point
            const threshold = 160; // Slightly higher to wash out light backgrounds
            const val = gray > threshold ? 255 : 0;

            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert back to blob
        const processedBlob = await canvas.convertToBlob({ type: 'image/png' });
        return processedBlob;

    } catch (err) {
        console.error('Preprocessing failed:', err);
        return fileBlob; // Fallback to original
    }
};

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    if (type === 'EXTRACT_TEXT') {
        let worker = null;
        try {
            const { fileBlob, language = 'eng' } = payload;

            // Preprocess Image
            const processedBlob = await preprocessImage(fileBlob);

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

            const ret = await worker.recognize(processedBlob);
            const text = ret.data.text;

            self.postMessage({
                type: 'SUCCESS',
                id,
                payload: {
                    text: text,
                    confidence: ret.data.confidence,
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
