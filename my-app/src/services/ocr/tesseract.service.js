import Worker from '../../workers/ocr.worker?worker';

class OcrService {
    constructor() {
        this.worker = null;
        this.jobs = new Map();
    }

    getWorker() {
        // For OCR, we might want to keep the worker alive? 
        // But the worker implementation currently terminates the inner tesseract worker after each job.
        // However, OUR worker (this file's instance) can stay valid.
        if (!this.worker) {
            this.worker = new Worker();
            this.worker.onmessage = this.handleMessage.bind(this);
        }
        return this.worker;
    }

    handleMessage(e) {
        const { type, id, payload } = e.data;
        const job = this.jobs.get(id);

        if (!job) return;

        if (type === 'SUCCESS') {
            job.resolve(payload);
            this.jobs.delete(id);
        } else if (type === 'ERROR') {
            job.reject(new Error(payload));
            this.jobs.delete(id);
        } else if (type === 'PROGRESS') {
            if (job.onProgress) {
                job.onProgress(payload);
            }
        }
    }

    /**
     * Extract text from an image using a Cloud/Local OCR Web Worker
     * @param {Blob} imageBlob - The Image file blob
     * @param {string} [language='eng'] - Language code (e.g. 'eng', 'eng+ita')
     * @param {Function} [onProgress] - Optional callback for progress updates
     * @returns {Promise<{text: string, confidence: number}>}
     */
    extractTextFromImage(imageBlob, language = 'eng', onProgress) {
        if (typeof language === 'function') {
            onProgress = language;
            language = 'eng';
        }

        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            this.jobs.set(id, { resolve, reject, onProgress });

            const worker = this.getWorker();
            worker.postMessage({
                type: 'EXTRACT_TEXT',
                id,
                payload: { fileBlob: imageBlob, language }
            });
        });
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.jobs.clear();
        }
    }
}

export const ocrService = new OcrService();
