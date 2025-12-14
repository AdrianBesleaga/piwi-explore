
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import documentStorageService from '@/services/storage/documentStorage.service'; // We should probably move template logic here or separate service
import db from '@/services/storage/indexedDB.service';

const TemplateUploader = ({ onUploadSuccess }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [name, setName] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
            setFile(droppedFile);
            setName(droppedFile.name.replace('.pdf', ''));
        } else {
            setError("Please upload a valid PDF file.");
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            setName(selectedFile.name.replace('.pdf', ''));
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !name) return;

        setUploading(true);
        setError(null);

        try {
            // Convert file to Base64 or ArrayBuffer for storage
            // pdfme works well with Base64 data URIs
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async () => {
                const basePdf = reader.result; // Data URI

                // Create template entry in DB
                const template = {
                    name,
                    basePdf, // Storing the PDF content directly
                    schemas: [[]], // Empty schema initially
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await db.templates.add(template);

                setUploading(false);
                setFile(null);
                setName("");
                if (onUploadSuccess) onUploadSuccess();
            };

            reader.onerror = () => {
                throw new Error("Failed to read file");
            };

        } catch (err) {
            console.error("Upload failed:", err);
            setError("Failed to save template. Please try again.");
            setUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                        ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary'}
                        ${file ? 'bg-muted/10' : ''}
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('template-upload').click()}
                >
                    <input
                        id="template-upload"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {file ? (
                        <div className="flex flex-col items-center gap-2">
                            <FileText className="h-10 w-10 text-primary" />
                            <span className="font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-10 w-10" />
                            <span>Drag & drop PDF here, or click to select</span>
                        </div>
                    )}
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {file && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Template Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Service Agreement 2024"
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleUpload}
                            disabled={uploading || !name}
                        >
                            {uploading ? "Saving..." : "Save Template"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TemplateUploader;
