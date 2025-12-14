export const DocumentSchemas = {
    passport: {
        description: "Passport or Travel Document",
        schema: {
            fullName: "string (The full name of the passport holder)",
            passportNumber: "string (The distinct passport number)",
            nationality: "string (Country code or name)",
            dateOfBirth: "string (DD/MM/YYYY format)",
            expiryDate: "string (DD/MM/YYYY format)",
            issuingAuthority: "string"
        }
    },
    identity_document: {
        description: "National ID Card, Driver's License, or Residence Permit",
        schema: {
            fullName: "string (The full name of the holder)",
            documentNumber: "string (ID card number, License number)",
            dateOfBirth: "string (DD/MM/YYYY format)",
            expiryDate: "string (DD/MM/YYYY format)",
            nationality: "string",
            address: "string"
        }
    },
    carta_identita: {
        description: "Italian Identity Card (Carta d'Identità Elettronica or Paper)",
        schema: {
            cognome: "string (Surname/Family Name)",
            nome: "string (Given Name)",
            nato_il: "string (Date of Birth DD/MM/YYYY)",
            nato_a: "string (Place of Birth)",
            numero_documento: "string (Document Number e.g. CA00000AA)",
            scadenza: "string (Expiry Date DD/MM/YYYY)",
            residenza: "string (Full Residence Address)",
            codice_fiscale: "string (Fiscal Code)"
        }
    },
    property_deed: {
        description: "Property Title Deed or Ownership Document",
        schema: {
            ownerName: "string (Name of the property owner)",
            propertyAddress: "string (Full address of the property)",
            propertyType: "string (e.g., Apartment, Villa, Land)",
            registrationNumber: "string (Title deed or registration number)",
            plotSize: "string (Size of the property/plot)",
            city: "string"
        }
    },
    contact_info: {
        description: "Contact Information or Business Card",
        schema: {
            name: "string",
            email: "string",
            phone: "string",
            company: "string",
            jobTitle: "string",
            address: "string"
        }
    },
    invoice: {
        description: "Invoice or Bill",
        schema: {
            invoiceNumber: "string",
            date: "string",
            vendorName: "string",
            totalAmount: "string",
            currency: "string",
            items: "array of objects { description, quantity, price }"
        }
    },
    contract: {
        description: "Legal Agreement or Contract",
        schema: {
            parties: "array of strings (Names of parties involved)",
            agreementDate: "string",
            effectiveDate: "string",
            contractType: "string (e.g., Lease, Sale, NDA)",
            duration: "string"
        }
    },
    generic: {
        description: "General Document (Fallback)",
        schema: {
            summary: "string (Brief summary of the content)",
            key_entities: "array of strings (Important names, orgs, or locations)",
            dates: "array of strings (Relevant dates found)",
            action_items: "array of strings (Tasks or requirements mentioned)",
            raw_text: "string (The full extracted text)"
        }
    }
};

export const DocumentTypes = Object.keys(DocumentSchemas);

/**
 * Returns a classification prompt for the AI
 * @param {string[]} types 
 */
export const getClassificationPrompt = (types = DocumentTypes) => {
    return `Classify the provided document text into one of the following types: ${types.join(', ')}. 
    Return a JSON object with the format: { "type": "string", "confidence": number }. 
    If unsure, set type to "other".`;
};

/**
 * Returns an extraction prompt for a specific type
 * @param {string} type 
 */
export const getExtractionPrompt = (type) => {
    const schemaDef = DocumentSchemas[type];
    if (!schemaDef) return null;
    return `Extract the following fields from the text based on this schema: ${JSON.stringify(schemaDef.schema)}. 
    Return a JSON object matching the keys exactly. If a field is not found, set it to null.`;
};
