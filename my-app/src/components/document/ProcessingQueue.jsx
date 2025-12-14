import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { processDocument, fetchDocumentsByClient, cancelDocument } from '@/store/slices/documentSlice';
import { X, RefreshCw, Play } from 'lucide-react';

export function ProcessingQueue() {
    const dispatch = useDispatch();
    const documents = useSelector(state => state.documents.items);
    const processingProgress = useSelector(state => state.documents.processingProgress || {});

    const processingDocs = documents.filter(d =>
        d.status === 'processing' ||
        d.status === 'pending' ||
        d.status === 'failed' ||
        d.status === 'cancelled'
    );
    const hasPending = processingDocs.some(d => d.status === 'pending');

    // Show only active or recently failed/cancelled jobs for relevance?
    // For now, custom filter to show queue + interesting states
    const visibleDocs = documents.filter(d =>
        ['processing', 'pending', 'failed', 'cancelled'].includes(d.status)
    );

    const handleProcessAll = () => {
        const pendingIds = documents.filter(d => d.status === 'pending').map(d => d.id);
        pendingIds.forEach(id => dispatch(processDocument(id)));
    };

    if (visibleDocs.length === 0) {
        return <div className="text-sm text-muted-foreground p-2">No documents in queue</div>;
    }

    return (
        <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
                {processingDocs.some(d => d.status === 'pending') && (
                    <Button size="sm" onClick={handleProcessAll} variant="secondary">Process All</Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                {visibleDocs.map(doc => {
                    const progress = processingProgress[doc.id] || 0;
                    return (
                        <div key={doc.id} className="flex flex-col gap-2 border-b last:border-0 pb-2 last:pb-0">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium truncate max-w-[150px]">{doc.fileName}</span>
                                <Badge variant="outline" className="text-xs">{doc.status}</Badge>
                            </div>
                            {doc.status === 'processing' && (
                                <div className="space-y-1">
                                    <Progress value={progress} className="h-1" />
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-muted-foreground">{Math.round(progress)}%</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => dispatch(cancelDocument(doc.id))}
                                            title="Stop Processing"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {(doc.status === 'failed' || doc.status === 'cancelled') && (
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs gap-1"
                                        onClick={() => dispatch(processDocument(doc.id))}
                                    >
                                        <RefreshCw className="h-3 w-3" /> Retry
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
