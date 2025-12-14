import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processDocument } from '@/store/slices/documentSlice';
import ExtractionResults from './ExtractionResults';

export function DocumentViewer({ documentId }) {
    const dispatch = useDispatch();
    const doc = useSelector(state =>
        state.documents.items.find(d => d.id === documentId)
    );
    const { modelStatus } = useSelector(state => state.ai);

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
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg">{doc.fileName}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="capitalize">{doc.fileType}</span>
                        {doc.documentType && (
                            <>
                                <span>•</span>
                                <span className="font-semibold text-primary capitalize">{doc.documentType}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Model Status Indicator */}
                    <div className="flex items-center gap-1.5 mr-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${modelStatus === 'ready' ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-muted-foreground">
                            {modelStatus === 'ready' ? 'AI Ready' : 'AI Offline'}
                        </span>
                    </div>

                    <Badge variant={
                        doc.status === 'completed' ? 'secondary' :
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
                <Tabs defaultValue="extracted" className="h-full flex flex-col">
                    <div className="border-b px-4 bg-muted/5">
                        <TabsList className="w-full justify-start h-10 bg-transparent p-0">
                            <TabsTrigger value="extracted" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-4">
                                Raw Text
                            </TabsTrigger>
                            <TabsTrigger value="ai_data" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-4">
                                AI Analysis
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="extracted" className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden">
                        {doc.extractedText ? (
                            <div className="font-mono text-sm whitespace-pre-wrap">
                                {doc.extractedText}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                {doc.status === 'processing' ? 'Extracting text...' : 'No text extracted'}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="ai_data" className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden">
                        {doc.extractedData ? (
                            <ExtractionResults
                                data={doc.extractedData}
                                type={doc.documentType}
                                confidence={doc.metadata?.confidence}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                {doc.status === 'processing' ? (
                                    <p>Analyzing document...</p>
                                ) : (
                                    <>
                                        <p>No AI analysis results available.</p>
                                        <p className="text-xs">Load an AI Model to enable classification.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
