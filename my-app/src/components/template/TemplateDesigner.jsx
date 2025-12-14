
import React, { useRef, useEffect, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Scan, Loader2 } from "lucide-react";
import db from '@/services/storage/indexedDB.service';
import { pdfMeService } from '@/services/pdf/pdfme.service';
import Worker from '@/workers/onnx.worker?worker';

const TemplateDesigner = ({ templateId, onBack }) => {
    const designerRef = useRef(null);
    const designerInstance = useRef(null);
    const [saving, setSaving] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [template, setTemplate] = useState(null);
    const workerRef = useRef(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker();
        workerRef.current.onmessage = (e) => {
            const { type, results, error } = e.data;
            if (type === 'DETECT_COMPLETE') {
                console.log('Detection results:', results);
                applyDetections(results);
                setDetecting(false);
            } else if (type === 'ERROR') {
                console.error('Detection error:', error);
                setDetecting(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const applyDetections = (results) => {
        if (!designerInstance.current) return;

        // Convert detections to schema fields
        // Mocking page/image dimensions for now since we haven't implemented full rendering here yet
        // Assuming standard A4 roughly (210mm x 297mm) and 640x640 detection image
        const newFields = pdfMeService.convertDetectionsToSchema(
            results,
            210, 297, // A4 dimensions in mm
            640, 640  // Source image dims (mocked)
        );

        // Get current template
        const currentTemplate = designerInstance.current.getTemplate();
        const currentSchemas = currentTemplate.schemas;

        // Merge new fields into the first page (index 0)
        // We avoid overwriting existing fields by checking names or just appending
        const page0 = currentSchemas[0] || {};

        newFields.forEach(field => {
            // Avoid duplicate names if possible
            if (!page0[field.name]) {
                page0[field.name] = field;
            }
        });

        currentSchemas[0] = page0;

        designerInstance.current.updateTemplate({
            ...currentTemplate,
            schemas: currentSchemas
        });
    };

    const handleAutoDetect = () => {
        setDetecting(true);
        // Mock sending data to worker
        // In real impl, we render the PDF page to an image first
        workerRef.current.postMessage({
            type: 'DETECT',
            payload: { /* tensor or image data */ },
            id: Date.now()
        });
    };

    useEffect(() => {
        const loadTemplate = async () => {
            if (!templateId) return;

            const tmpl = await db.templates.get(templateId);
            if (!tmpl) {
                console.error("Template not found");
                return;
            }
            setTemplate(tmpl);
        };
        loadTemplate();
    }, [templateId]);

    useEffect(() => {
        if (designerRef.current && template && !designerInstance.current) {
            // pdfme Designer initialization
            // We need to convert our stored format to pdfme format
            const pdfmeTemplate = pdfMeService.prepareTemplateForDesigner(template);

            designerInstance.current = new Designer({
                domContainer: designerRef.current,
                template: pdfmeTemplate,
                plugins: pdfMeService.plugins, // text, image, checkboxes
                options: {
                    // Adjust options if needed
                }
            });
        }

        return () => {
            if (designerInstance.current) {
                // Cleanup if necessary (pdfme designer usually handles its own lifecycle within the DOM)
                designerInstance.current = null;
            }
        };
    }, [template]);

    const handleSave = async () => {
        if (!designerInstance.current || !templateId) return;

        setSaving(true);
        try {
            const newTemplateSchema = designerInstance.current.getTemplate();

            // Save updated schemas to DB
            // We keep the basePdf as is, only updating the schemas (field definitions)
            await db.templates.update(templateId, {
                schemas: newTemplateSchema.schemas,
                updatedAt: new Date().toISOString()
            });

            console.log("Template saved:", newTemplateSchema);
            // Optional: User feedback toast here
        } catch (error) {
            console.error("Failed to save template:", error);
        } finally {
            setSaving(false);
        }
    };

    if (!template) {
        return <div className="p-8 text-center">Loading template...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-semibold">{template.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleAutoDetect} disabled={detecting || saving}>
                        {detecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Scan className="h-4 w-4 mr-2" />}
                        {detecting ? "Detecting..." : "Auto-Detect Fields"}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || detecting}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Template"}
                    </Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden border-2 border-stone-200">
                {/* Designer Container */}
                <div ref={designerRef} className="w-full h-full" style={{ minHeight: '600px' }} />
            </Card>
        </div>
    );
};

export default TemplateDesigner;
