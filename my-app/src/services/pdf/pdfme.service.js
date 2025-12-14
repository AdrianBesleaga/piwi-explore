
import { generate } from '@pdfme/generator';
import { text, image } from '@pdfme/schemas';
import documentStorageService from '../storage/documentStorage.service'; // We might need a separate templateStorageService later

class PdfMeService {
    constructor() {
        this.plugins = { text, image };
    }

    /**
     * Generate a PDF from a template and inputs
     * @param {Object} template - The pdfme template object { basePdf, schemas }
     * @param {Object} inputs - Key-value pairs matching schema fields
     * @returns {Promise<Uint8Array>} - The generated PDF buffer
     */
    async generatePDF(template, inputs) {
        if (!template || !template.basePdf || !template.schemas) {
            throw new Error("Invalid template format");
        }

        const pdf = await generate({
            template,
            inputs: [inputs], // pdfme expects an array of inputs for batch generation
            plugins: this.plugins,
        });

        return pdf;
    }

    /**
     * Parse a specialized template format if we use one, 
     * or helpful utilities to convert from our DB format to pdfme format.
     */
    prepareTemplateForDesigner(dbTemplate) {
        return {
            basePdf: dbTemplate.basePdf, // Base64 or ArrayBuffer
            schemas: dbTemplate.schemas || [[]], // pdfme schemas are array of arrays (pages -> fields)
        };
    }

    /**
     * Map ONNX detections to pdfme schema fields
     * @param {Array} detections - [{ label, box: [x, y, w, h], score }] (box in pixels or normalized?)
     * @param {number} pageWidth - Page width in mm (pdfme uses mm)
     * @param {number} pageHeight - Page height in mm
     * @param {number} imageWidth - Source image width in pixels
     * @param {number} imageHeight - Source image height in pixels
     * @returns {Array} - Array of pdfme fields
     */
    convertDetectionsToSchema(detections, pageWidth, pageHeight, imageWidth, imageHeight) {
        return detections.map((det, index) => {
            // Assuming box is [x, y, w, h] in PIL/image coordinates (pixels)
            // Need to scalar to mm
            const scaleX = pageWidth / imageWidth;
            const scaleY = pageHeight / imageHeight;

            // Simplified: detection box is usually [x1, y1, x2, y2] or [x, y, w, h]
            // Let's assume [x, y, w, h] in pixels for now based on worker mock
            const [x, y, w, h] = det.box;

            return {
                name: `field_${index}_${det.label}`,
                type: det.label === 'checkbox' ? 'checkbox' : 'text',
                position: {
                    x: x * scaleX,
                    y: y * scaleY
                },
                width: w * scaleX,
                height: h * scaleY,
                content: '' // default content
            };
        });
    }
}

export const pdfMeService = new PdfMeService();
