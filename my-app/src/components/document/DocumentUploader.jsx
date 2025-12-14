import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { createDocument } from '../../store/slices/documentSlice';
import { Upload, X, File as FileIcon, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { formatFileSize } from '../../utils/fileHelpers';
import { Progress } from '../ui/progress';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const DocumentUploader = ({ clientId, onUploadComplete }) => {
    const dispatch = useDispatch();
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const processFiles = useCallback(async (files) => {
        setValidating(true);
        setError(null);
        const newQueue = [];

        for (const file of files) {
            if (file.size > MAX_SIZE_BYTES) {
                setError(`File ${file.name} is too large (max 50MB)`);
                continue;
            }

            const queueItem = {
                id: Math.random().toString(36).substr(2, 9),
                file,
                status: 'pending', // pending, uploading, success, error
                progress: 0
            };
            newQueue.push(queueItem);
        }

        setUploadQueue(prev => [...prev, ...newQueue]);
        setValidating(false);

        // Process upload queue automatically
        if (newQueue.length > 0) {
            uploadFiles(newQueue);
        }
    }, []); // eslint-disable-line

    const uploadFiles = async (items) => {
        for (const item of items) {
            setUploadQueue(prev => prev.map(i =>
                i.id === item.id ? { ...i, status: 'uploading' } : i
            ));

            try {
                // Simulate progress for better UX since indexedDB write is instant
                updateItemStatus(item.id, 'uploading', 50);

                await dispatch(createDocument({ clientId, file: item.file })).unwrap();

                updateItemStatus(item.id, 'success', 100);
                if (onUploadComplete) onUploadComplete();

                // Remove from list after short delay if success
                setTimeout(() => {
                    setUploadQueue(prev => prev.filter(i => i.id !== item.id));
                }, 3000);

            } catch (err) {
                console.error("Upload failed", err);
                updateItemStatus(item.id, 'error', 0, err.message);
            }
        }
    };

    const updateItemStatus = (id, status, progress, errorMsg = null) => {
        setUploadQueue(prev => prev.map(i =>
            i.id === id ? { ...i, status, progress, error: errorMsg } : i
        ));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
        // Reset input
        e.target.value = '';
    };

    return (
        <div className="space-y-4">
            <Card
                className={`border-2 border-dashed transition-colors ${isDragOver ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                    <div className="p-3 bg-gray-100 rounded-full">
                        <Upload className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">PDF, JPG, PNG or TXT (max 50MB)</p>
                    </div>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        id="file-upload"
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png,.txt"
                    />
                    <Button variant="outline" onClick={() => document.getElementById('file-upload').click()}>
                        Select Files
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
                <div className="space-y-2">
                    {uploadQueue.map(item => (
                        <div key={item.id} className="bg-white border rounded-lg p-3 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded">
                                <FileIcon className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium truncate">{item.file.name}</span>
                                    <span className="text-xs text-gray-500">{formatFileSize(item.file.size)}</span>
                                </div>
                                {item.status === 'uploading' && <Progress value={item.progress} className="h-1" />}
                                {item.status === 'error' && <span className="text-xs text-red-500">{item.error || 'Upload failed'}</span>}
                                {item.status === 'success' && <span className="text-xs text-green-600">Complete</span>}
                            </div>
                            {item.status !== 'uploading' && (
                                <button
                                    onClick={() => setUploadQueue(prev => prev.filter(i => i.id !== item.id))}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                            {item.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentUploader;
