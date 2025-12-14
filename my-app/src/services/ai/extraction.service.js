import documentStorageService from '../storage/documentStorage.service';
import { pdfService } from '../pdf/pdfjs.service';
import { ocrService } from '../ocr/tesseract.service';

class ExtractionService {
    constructor() {
        this.activeJobs = new Map(); // documentId -> { cancel: () => void }
    }

    /**
     * Cancel an ongoing extraction process
     * @param {string} documentId
     * @returns {Promise<boolean>} true if cancelled
     */
    async cancelDocument(documentId) {
        if (this.activeJobs.has(documentId)) {
            const job = this.activeJobs.get(documentId);
            job.cancel();
            this.activeJobs.delete(documentId);

            // Update DB status
            await documentStorageService.updateDocument(documentId, {
                status: 'cancelled',
                processingError: 'Cancelled by user'
            });

            // Also update the job status if it exists
            await documentStorageService.updateProcessingJob(documentId, {
                status: 'cancelled',
                error: 'Cancelled by user'
            });

            console.log(`Document ${documentId} processing cancelled`);
            return true;
        }
        return false;
    }

    /**
     * Process a document to extract text
     * @param {string} documentId 
     * @returns {Promise<void>}
     */
    async processDocument(documentId, onProgress) {
        let jobId = null;
        try {
            // 1. Get document from storage
            const doc = await documentStorageService.getDocumentById(documentId);
            if (!doc) {
                throw new Error(`Document ${documentId} not found`);
            }

            // Update status to processing
            await documentStorageService.updateDocument(documentId, { status: 'processing' });

            // Create cancellation token
            let isCancelled = false;
            this.activeJobs.set(documentId, {
                cancel: () => { isCancelled = true; }
            });

            // Create processing job in DB
            const job = await documentStorageService.createProcessingJob(documentId);
            jobId = job.id;

            const updateProgress = async (progress) => {
                if (isCancelled) throw new Error('Cancelled');

                // Update DB job
                await documentStorageService.updateProcessingJob(documentId, { progress, status: 'processing' });
                // Call Redux callback
                if (onProgress) onProgress(progress);
                console.log(`Processing Progress ${documentId}:`, progress);
            };

            let extractionResult;

            // 2. Identify type and route to appropriate service
            if (doc.fileType === 'pdf') {
                extractionResult = await pdfService.extractTextFromPDF(doc.fileBlob, updateProgress);
            } else if (doc.fileType === 'image') {
                extractionResult = await ocrService.extractTextFromImage(doc.fileBlob, updateProgress);
            } else if (doc.fileType === 'text') {
                // Simple text file reading
                updateProgress(10);
                const text = await doc.fileBlob.text();
                updateProgress(100);
                extractionResult = { text, pages: [text], metadata: {} };
            } else {
                throw new Error(`Unsupported file type: ${doc.fileType}`);
            }

            if (isCancelled) throw new Error('Cancelled');

            // 3. Update document with results
            const updates = {
                extractedText: extractionResult.text,
                status: 'completed',
                metadata: {
                    ...doc.metadata,
                    extractionMetadata: extractionResult.metadata,
                    confidence: extractionResult.confidence
                }
            };

            await documentStorageService.updateDocument(documentId, updates);
            await documentStorageService.updateProcessingJob(documentId, { status: 'completed', progress: 100 });

            console.log(`Document ${documentId} processed successfully`);
            this.activeJobs.delete(documentId);
            return updates;



        } catch (error) {
            this.activeJobs.delete(documentId);
            if (error.message === 'Cancelled') {
                // Already handled in cancelDocument, but just in case
                return { status: 'cancelled' };
            }
            console.error(`Error processing document ${documentId}:`, error);

            // Update status to failed
            await documentStorageService.updateDocument(documentId, {
                status: 'failed',
                processingError: error.message
            });

            if (jobId) {
                await documentStorageService.updateProcessingJob(documentId, { status: 'failed', error: error.message });
            }

            throw error;
        }
    }

    /**
     * Queue multiple documents for processing
     * @param {string[]} documentIds 
     */
    async processBatch(documentIds) {
        // Process sequentially or with limited concurrency if needed
        // For now, just parallel
        return Promise.allSettled(documentIds.map(id => this.processDocument(id)));
    }
}

export const extractionService = new ExtractionService();
