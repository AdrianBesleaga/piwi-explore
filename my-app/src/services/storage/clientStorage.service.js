import { v4 as uuidv4 } from 'uuid';
import db from './indexedDB.service';

class ClientStorageService {
    /**
     * Create a new client
     * @param {Object} clientData
     * @returns {Promise<Object>} Created client
     */
    async createClient(clientData) {
        const client = {
            id: uuidv4(),
            ...clientData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: clientData.metadata || {}
        };

        await db.clients.add(client);
        return client;
    }

    /**
     * Get all clients
     * @returns {Promise<Array>} List of clients
     */
    async getAllClients() {
        return await db.clients.toCollection().reverse().sortBy('createdAt');
    }

    /**
     * Get a client by ID
     * @param {string} id
     * @returns {Promise<Object>} Client data
     */
    async getClientById(id) {
        return await db.clients.get(id);
    }

    /**
     * Update a client
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<Object>} Updated fields
     */
    async updateClient(id, updates) {
        const updatedData = {
            ...updates,
            updatedAt: Date.now()
        };

        await db.clients.update(id, updatedData);
        return updatedData;
    }

    /**
     * Delete a client and all associated documents
     * @param {string} id
     * @returns {Promise<string>} Deleted client ID
     */
    async deleteClient(id) {
        // Transaction to ensure atomicity
        await db.transaction('rw', db.clients, db.documents, async () => {
            // Find all documents for this client
            const documentIds = await db.documents
                .where('clientId')
                .equals(id)
                .primaryKeys();

            // Delete documents
            if (documentIds.length > 0) {
                await db.documents.bulkDelete(documentIds);
            }

            // Delete client
            await db.clients.delete(id);
        });

        return id;
    }
}

export const clientStorageService = new ClientStorageService();
export default clientStorageService;
