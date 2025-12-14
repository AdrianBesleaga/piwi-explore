import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocumentsByClient, deleteDocument } from '../../store/slices/documentSlice';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Image as ImageIcon, Trash2, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize } from '../../utils/fileHelpers';
import documentStorageService from '../../services/storage/documentStorage.service';
import DocumentPreviewDialog from './DocumentPreviewDialog';

const DocumentList = ({ clientId }) => {
    const dispatch = useDispatch();
    const { items: documents, loading } = useSelector((state) => state.documents);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (clientId) {
            dispatch(fetchDocumentsByClient(clientId));
        }
    }, [dispatch, clientId]);

    const handleViewDocument = async (doc) => {
        try {
            // Fetch the full document with blob
            const fullDoc = await documentStorageService.getDocumentById(doc.id);
            if (fullDoc && fullDoc.fileBlob) {
                const url = URL.createObjectURL(fullDoc.fileBlob);
                setPreviewDoc(fullDoc);
                setPreviewUrl(url);
            } else {
                alert('Document content not found');
            }
        } catch (error) {
            console.error("Failed to view document:", error);
            alert('Error opening document');
        }
    };

    const handleClosePreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewDoc(null);
        setPreviewUrl(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation(); // Prevent opening the document when clicking delete
        if (window.confirm('Are you sure you want to delete this document?')) {
            dispatch(deleteDocument(id));
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
            case 'image': return <ImageIcon className="h-8 w-8 text-blue-500" />;
            default: return <FileText className="h-8 w-8 text-gray-400" />;
        }
    };

    if (loading && documents.length === 0) {
        return <div className="text-center py-8">Loading documents...</div>;
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No documents uploaded yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {documents.map((doc) => (
                <Card
                    key={doc.id}
                    className="overflow-hidden hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewDocument(doc)}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                            {getFileIcon(doc.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate hover:underline text-blue-600">{doc.fileName}</h4>
                                {getStatusIcon(doc.status)}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span>{formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}</span>
                                <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">{doc.documentType || 'Unknown Type'}</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500 z-10"
                            onClick={(e) => handleDelete(e, doc.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            ))}

            <DocumentPreviewDialog
                isOpen={!!previewDoc}
                onClose={handleClosePreview}
                document={previewDoc}
                url={previewUrl}
            />
        </div>
    );
};

export default DocumentList;
