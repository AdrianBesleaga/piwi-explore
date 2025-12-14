import Dexie from 'dexie';

// Database name and version
const DB_NAME = 'piwi_document_extraction';
const DB_VERSION = 1;

class PiwiDatabase extends Dexie {
  constructor() {
    super(DB_NAME);

    // Define database schema
    this.version(DB_VERSION).stores({
      // 1. clients - Store client information
      clients: 'id, name, createdAt, updatedAt',

      // 2. documents - Store uploaded documents and extracted data
      documents: 'id, clientId, status, uploadedAt, documentType',

      // 3. templates - Store PDF templates
      templates: 'id, name, createdAt, updatedAt',

      // 4. field_mappings - Store field mapping configurations
      field_mappings: 'id, templateId, clientId, createdAt, updatedAt',

      // 5. ai_models - Store AI model metadata
      ai_models: 'modelId, type, status',

      // 6. processing_jobs - Store processing job queue
      processing_jobs: 'id, documentId, status, createdAt',

      // 7. app_settings - Store application settings
      app_settings: 'key, updatedAt'
    });

    // Define table references
    this.clients = this.table('clients');
    this.documents = this.table('documents');
    this.templates = this.table('templates');
    this.field_mappings = this.table('field_mappings');
    this.ai_models = this.table('ai_models');
    this.processing_jobs = this.table('processing_jobs');
    this.app_settings = this.table('app_settings');
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats = {
      clients: await this.clients.count(),
      documents: await this.documents.count(),
      templates: await this.templates.count(),
      field_mappings: await this.field_mappings.count(),
      ai_models: await this.ai_models.count(),
      processing_jobs: await this.processing_jobs.count(),
      app_settings: await this.app_settings.count(),
    };
    return stats;
  }

  /**
   * Clear all data (for testing or data reset)
   */
  async clearAllData() {
    await this.clients.clear();
    await this.documents.clear();
    await this.templates.clear();
    await this.field_mappings.clear();
    await this.ai_models.clear();
    await this.processing_jobs.clear();
    // Don't clear app_settings to preserve user preferences
  }

  /**
   * Export all data to JSON
   */
  async exportAllData() {
    const data = {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      clients: await this.clients.toArray(),
      documents: await this.documents.toArray(),
      templates: await this.templates.toArray(),
      field_mappings: await this.field_mappings.toArray(),
      ai_models: await this.ai_models.toArray(),
      processing_jobs: await this.processing_jobs.toArray(),
      app_settings: await this.app_settings.toArray(),
    };
    return data;
  }

  /**
   * Import data from JSON export
   */
  async importData(data) {
    if (!data || data.version !== DB_VERSION) {
      throw new Error('Invalid or incompatible data format');
    }

    // Clear existing data first
    await this.clearAllData();

    // Import data
    if (data.clients) await this.clients.bulkAdd(data.clients);
    if (data.documents) await this.documents.bulkAdd(data.documents);
    if (data.templates) await this.templates.bulkAdd(data.templates);
    if (data.field_mappings) await this.field_mappings.bulkAdd(data.field_mappings);
    if (data.ai_models) await this.ai_models.bulkAdd(data.ai_models);
    if (data.processing_jobs) await this.processing_jobs.bulkAdd(data.processing_jobs);
    if (data.app_settings) await this.app_settings.bulkAdd(data.app_settings);
  }
}

// Create single instance
const db = new PiwiDatabase();

// Open the database and handle errors
db.open().catch((error) => {
  console.error('Failed to open IndexedDB:', error);
});

export default db;
