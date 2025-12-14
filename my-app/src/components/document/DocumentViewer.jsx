import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { processDocument } from '@/store/slices/documentSlice';

export function DocumentViewer({ documentId }) {
    const dispatch = useDispatch();
    const doc = useSelector(state =>
        state.documents.items.find(d => d.id === documentId)
    );

    if (!documentId) {
        return <div className="p-4 text-muted-foreground">Select a document to view</div>;
    }

    if (!doc) {
        return <div className="p-4">Document not found</div>;
    }

    const handleReprocess = () => {
        dispatch(processDocument(documentId));
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg">{doc.fileName}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="capitalize">{doc.fileType}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={
                        doc.status === 'completed' ? 'secondary' : // success/green? Shadcn badge usually secondary/default/destructive/outline
                            doc.status === 'processing' ? 'outline' :
                                doc.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                        {doc.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={handleReprocess} disabled={doc.status === 'processing'}>
                        {doc.status === 'processing' ? 'Processing...' : 'Reprocess'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                {doc.extractedText ? (
                    <div className="h-full overflow-auto p-4 bg-muted/20 font-mono text-sm whitespace-pre-wrap">
                        {doc.extractedText}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        {doc.status === 'processing' ? 'Extracting text...' : 'No text extracted'}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
