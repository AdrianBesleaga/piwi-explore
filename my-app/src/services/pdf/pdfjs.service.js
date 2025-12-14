import Worker from '../../workers/pdf.worker?worker';

class PdfService {
    constructor() {
        this.worker = null;
        this.jobs = new Map();
    }

    getWorker() {
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
     * Extract text from a PDF file using a Web Worker
     * @param {Blob} pdfBlob - The PDF file blob 
     * @param {Function} onProgress - Optional callback for progress updates
     * @returns {Promise<{text: string, pages: string[], metadata: object}>}
     */
    extractTextFromPDF(pdfBlob, onProgress) {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            this.jobs.set(id, { resolve, reject, onProgress });

            const worker = this.getWorker();
            worker.postMessage({
                type: 'EXTRACT_TEXT',
                id,
                payload: { fileBlob: pdfBlob }
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

export const pdfService = new PdfService();
