import { v4 as uuidv4 } from 'uuid';
import db from './indexedDB.service';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

class DocumentStorageService {
    /**
     * Create a new document
     * @param {string} clientId
     * @param {File} file
     * @param {string} type - 'pdf' | 'image' | 'text'
     * @returns {Promise<Object>} Created document metadata
     */
    async createDocument(clientId, file, type) {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        const docId = uuidv4();
        const document = {
            id: docId,
            clientId,
            fileName: file.name,
            fileType: type,
            fileSize: file.size,
            fileBlob: file, // Store the blob directly
            uploadedAt: Date.now(),
            status: 'pending', // pending -> processing -> completed/failed
            documentType: 'other', // classification result
            extractedText: '',
            extractedData: {},
            metadata: {}
        };

        await db.documents.add(document);

        // Return document without the heavy blob for UI lists
        const { fileBlob, ...docMetadata } = document;
        return docMetadata;
    }

    /**
     * Get all documents for a client
     * @param {string} clientId
     * @returns {Promise<Array>} List of documents
     */
    async getDocumentsByClientId(clientId) {
        const docs = await db.documents
            .where('clientId')
            .equals(clientId)
            .reverse()
            .sortBy('uploadedAt');

        // Remove fileBlob from list results to avoid Redux serialization issues and reduce memory usage
        return docs.map(({ fileBlob, ...rest }) => rest);
    }

    /**
     * Get a single document by ID (including Blob)
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async getDocumentById(id) {
        return await db.documents.get(id);
    }

    /**
     * Delete a document
     * @param {string} id
     * @returns {Promise<string>} Deleted ID
     */
    async deleteDocument(id) {
        // Also delete associated processing jobs
        const jobs = await db.processing_jobs.where('documentId').equals(id).toArray();
        if (jobs.length > 0) {
            await db.processing_jobs.bulkDelete(jobs.map(j => j.id));
        }

        await db.documents.delete(id);
        return id;
    }

    /**
     * Update document status or data
     * @param {string} id
     * @param {Object} updates
     */
    async updateDocument(id, updates) {
        await db.documents.update(id, updates);
        return { id, ...updates };
    }

    /**
     * Create a new processing job
     * @param {string} documentId
     * @returns {Promise<Object>} Job metadata
     */
    async createProcessingJob(documentId) {
        const job = {
            id: uuidv4(),
            documentId,
            status: 'pending',
            progress: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await db.processing_jobs.add(job);
        return job;
    }

    /**
     * Update a processing job
     * @param {string} documentId
     * @param {Object} updates
     */
    async updateProcessingJob(documentId, updates) {
        // Find job by documentId (assuming one active job per doc for simplicity, or find latest)
        const job = await db.processing_jobs
            .where('documentId')
            .equals(documentId)
            .reverse() // Get latest
            .first();

        if (job) {
            await db.processing_jobs.update(job.id, { ...updates, updatedAt: Date.now() });
            return { id: job.id, ...updates };
        }
        return null;
    }
}

export const documentStorageService = new DocumentStorageService();
export default documentStorageService;
