import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, FileText, Eye } from 'lucide-react';
import { formatFileSize } from '../../utils/fileHelpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentViewer } from './DocumentViewer';

const DocumentPreviewDialog = ({ document, url, isOpen, onClose }) => {
    if (!document || !url) return null;

    const isImage = document.fileType === 'image' || document.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = document.fileType === 'pdf' || document.fileName.match(/\.pdf$/i);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0 text-left">
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

                <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 border-b bg-gray-50">
                        <TabsList>
                            <TabsTrigger value="preview" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Preview
                            </TabsTrigger>
                            <TabsTrigger value="extracted" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Extracted Data
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="preview" className="flex-1 overflow-hidden m-0 p-4 bg-gray-100 flex items-center justify-center">
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
                    </TabsContent>

                    <TabsContent value="extracted" className="flex-1 overflow-hidden m-0 p-0">
                        <div className="h-full w-full">
                            {/* DocumentViewer handles its own fetching if ID provided, but here we might pass doc directly if we refactored it. 
                                However, DocumentViewer currently takes documentId and fetches from store.
                                The store should already have it.
                            */}
                            <DocumentViewer documentId={document.id} />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default DocumentPreviewDialog;
