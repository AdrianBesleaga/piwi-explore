
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Sparkles } from "lucide-react";
import db from '@/services/storage/indexedDB.service';
import { pdfMeService } from '@/services/pdf/pdfme.service';

const MappingWizard = ({ clients, selectedClientId }) => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState(null);
    const [documents, setDocuments] = useState([]);

    // Mappings: { [templateField]: documentField || "manual_value" }
    const [mappings, setMappings] = useState({});

    // Extracted data from the selected document
    const [sourceData, setSourceData] = useState(null);

    const [generating, setGenerating] = useState(false);

    // Initial Data Load
    useEffect(() => {
        const loadInitialData = async () => {
            const tmpls = await db.templates.toArray();
            setTemplates(tmpls);

            if (selectedClientId) {
                const docs = await db.documents.where('clientId').equals(selectedClientId).toArray();
                const processedDocs = docs.filter(d => d.status === 'completed' && (d.extractedData || d.extractedText));
                setDocuments(processedDocs);
            }
        };
        loadInitialData();
    }, [selectedClientId]);

    // Load Template & Document Details
    useEffect(() => {
        const prepareMapping = async () => {
            if (!selectedTemplateId || !selectedDocumentId) return;

            const template = await db.templates.get(selectedTemplateId);
            const document = await db.documents.get(selectedDocumentId);

            if (!template || !document) return;

            // Flatten source data for easier mapping (handling nested objects if any)
            // For now assuming extractedData is flat or 1-level deep
            const flatSource = {
                ...document.extractedData,
                // We can also expose raw text or metadata
                fileName: document.fileName,
                uploadDate: new Date(document.uploadedAt).toLocaleDateString()
            };
            setSourceData(flatSource);

            // Auto-Map Logic (Fuzzy Match / Exact Match)
            // Get fields from the first page of schemas (pdfme structure: schemas[0] = { fieldName: {...} })
            const templateFields = Object.keys(template.schemas[0] || {});

            const newMappings = {};
            templateFields.forEach(field => {
                // simple exact match (case insensitive)
                const match = Object.keys(flatSource).find(key =>
                    key.toLowerCase() === field.toLowerCase() ||
                    key.toLowerCase().includes(field.toLowerCase()) ||
                    field.toLowerCase().includes(key.toLowerCase())
                );

                if (match) {
                    newMappings[field] = flatSource[match];
                } else {
                    newMappings[field] = ""; // default empty
                }
            });

            setMappings(newMappings);
        };

        prepareMapping();
    }, [selectedTemplateId, selectedDocumentId]);

    const handleMappingChange = (field, value) => {
        setMappings(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        if (!selectedTemplateId) return;
        setGenerating(true);

        try {
            const template = await db.templates.get(selectedTemplateId);

            // Generate PDF
            const inputs = mappings;
            const pdfBuffer = await pdfMeService.generatePDF(
                pdfMeService.prepareTemplateForDesigner(template),
                inputs
            );

            // Trigger Download
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.name}_filled.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate PDF");
        } finally {
            setGenerating(false);
        }
    };

    const templateFields = useMemo(() => {
        const tmpl = templates.find(t => t.id === selectedTemplateId);
        if (!tmpl || !tmpl.schemas || !tmpl.schemas[0]) return [];
        return Object.keys(tmpl.schemas[0]);
    }, [selectedTemplateId, templates]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Left: Configuration */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Setup Generation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Template</Label>
                        <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Source Document</Label>
                        <Select onValueChange={setSelectedDocumentId} value={selectedDocumentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a client document..." />
                            </SelectTrigger>
                            <SelectContent>
                                {documents.map(d => (
                                    <SelectItem key={d.id} value={d.id}>
                                        {d.fileName} ({d.documentType || 'Unknown'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {sourceData && (
                        <div className="bg-muted p-4 rounded-md mt-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                Available Data Source
                            </h4>
                            <ScrollArea className="h-[200px]">
                                <pre className="text-xs text-muted-foreground">
                                    {JSON.stringify(sourceData, null, 2)}
                                </pre>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={handleGenerate}
                        disabled={!selectedTemplateId || generating}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {generating ? "Generating..." : "Generate PDF"}
                    </Button>
                </CardFooter>
            </Card>

            {/* Right: Mapping Editor */}
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle>Field Mapping</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                    {!selectedTemplateId ? (
                        <div className="text-center text-muted-foreground p-8">
                            Select a template to view fields
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {templateFields.map(field => (
                                <div key={field} className="grid grid-cols-1 gap-1">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                        {field}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={mappings[field] || ''}
                                            onChange={(e) => handleMappingChange(field, e.target.value)}
                                            className={sourceData && mappings[field] === sourceData[field] ? "border-green-200 bg-green-50" : ""}
                                        />
                                        {/* Optional: Add a dropdown here to pick from sourceData keys */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MappingWizard;
