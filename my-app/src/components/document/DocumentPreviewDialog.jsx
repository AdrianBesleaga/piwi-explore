import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { X, Download, ExternalLink } from 'lucide-react';
import { formatFileSize } from '../../utils/fileHelpers';

const DocumentPreviewDialog = ({ document, url, isOpen, onClose }) => {
    if (!document || !url) return null;

    const isImage = document.fileType === 'image' || document.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = document.fileType === 'pdf' || document.fileName.match(/\.pdf$/i);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col gap-1">
                        <DialogTitle>{document.fileName}</DialogTitle>
                        <p className="text-sm text-gray-500">{formatFileSize(document.fileSize)} • {document.fileType?.toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => window.open(url, '_blank')} title="Open in new tab">
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <a href={url} download={document.fileName}>
                            <Button variant="ghost" size="icon" title="Download">
                                <Download className="h-4 w-4" />
                            </Button>
                        </a>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center p-4">
                    {isImage && (
                        <img
                            src={url}
                            alt={document.fileName}
                            className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                        />
                    )}

                    {isPdf && (
                        <iframe
                            src={url}
                            className="w-full h-full rounded-md bg-white shadow-sm"
                            title={document.fileName}
                        />
                    )}

                    {!isImage && !isPdf && (
                        <div className="text-center">
                            <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
                            <Button onClick={() => window.open(url, '_blank')}>
                                Open in New Tab
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DocumentPreviewDialog;
