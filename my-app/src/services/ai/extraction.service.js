import documentStorageService from '../storage/documentStorage.service';
import { pdfService } from '../pdf/pdfjs.service';
import { ocrService } from '../ocr/tesseract.service';
import { webLLMService } from './webllm.service';

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
                extractionResult = await ocrService.extractTextFromImage(doc.fileBlob, 'eng+ita', updateProgress);
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
            // 4. Update progress
            updateProgress({
                status: 'saving',
                progress: 0.9,
                percent: 90
            });

            // 5. Run AI Classification & Extraction (if available)
            let aiResult = {};
            try {
                // Check if we can run AI (naive check, usually service throws if not ready)
                updateProgress({ status: 'classifying', progress: 0.92, percent: 92 });

                const classification = await webLLMService.classifyDocument(extractionResult.text);
                console.log('Document Classification:', classification);

                if (classification && classification.type) {
                    let typeToExtract = classification.type;

                    // Fallback to generic if 'other' or unknown
                    if (typeToExtract === 'other' || !classification.type) {
                        console.log("Type is 'other', falling back to 'generic' extraction.");
                        typeToExtract = 'generic';
                    }

                    aiResult.documentType = typeToExtract;

                    updateProgress({ status: 'extracting_data', progress: 0.95, percent: 95 });
                    const structuredData = await webLLMService.extractData(extractionResult.text, typeToExtract);
                    console.log('Structured Data:', structuredData);
                    aiResult.extractedData = structuredData;
                }
            } catch (error) {
                console.warn('AI Processing skipped or failed:', error.message);
                // We proceed with just text if AI fails (e.g. model not loaded)
            }

            // 6. Save results
            await documentStorageService.updateDocument(documentId, {
                status: 'completed',
                extractedText: extractionResult.text,
                metadata: {
                    ...extractionResult.metadata,
                    ocrConfidence: extractionResult.confidence
                },
                processingError: null,
                // Add AI results if any
                ...(aiResult.documentType ? { documentType: aiResult.documentType } : {}),
                ...(aiResult.extractedData ? { extractedData: aiResult.extractedData } : {})
            });

            // 7. Complete job
            await documentStorageService.updateProcessingJob(jobId, {
                status: 'completed',
                progress: 1,
                completedAt: new Date().toISOString()
            });

            console.log(`Document ${documentId} processed successfully`);
            return {
                status: 'completed',
                extractedText: extractionResult.text,
                documentType: aiResult.documentType,
                extractedData: aiResult.extractedData
            };

        } catch (error) {
            console.error('Processing failed:', error);

            // Update status to failed
            await documentStorageService.updateDocument(documentId, {
                status: 'failed',
                processingError: error.message
            });

            if (jobId) {
                await documentStorageService.updateProcessingJob(jobId, {
                    status: 'failed',
                    error: error.message,
                    completedAt: new Date().toISOString()
                });
            }

            if (error.message === 'Cancelled') {
                // Already handled in cancelDocument, but just in case
                return { status: 'cancelled' };
            }

            throw error;
        } finally {
            this.activeJobs.delete(documentId);
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
