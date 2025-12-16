import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { loadModel } from '@/store/slices/aiSlice';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function ModelManager() {
    const dispatch = useDispatch();
    const { availableModels, activeModel, modelStatus, downloadProgress, error } = useSelector(state => state.ai);
    const hasAutoLoaded = useRef(false);

    useEffect(() => {
        // Auto-load the first model if none is active and we haven't tried yet
        if (!activeModel && modelStatus === 'idle' && availableModels.length > 0 && !hasAutoLoaded.current) {
            console.log('[ModelManager] Auto-loading default model:', availableModels[0].name);
            hasAutoLoaded.current = true;
            dispatch(loadModel({
                modelId: availableModels[0].id,
                provider: availableModels[0].provider
            }));
        }
    }, [activeModel, modelStatus, availableModels, dispatch]);

    const handleLoad = (model) => {
        console.log('[ModelManager] handleLoad called with:', model);
        console.log('[ModelManager] model.id:', model?.id, 'model.provider:', model?.provider);
        dispatch(loadModel({ modelId: model.id, provider: model.provider }));
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>AI Models</CardTitle>
                <CardDescription>
                    Download and load local Large Language Models (LLMs) to run directly in your browser.
                    Note: These models are large (GBs) and require a GPU-capable device.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <div className="grid gap-4">
                    {availableModels.map(model => (
                        <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{model.name}</h3>
                                    {activeModel === model.id && (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">Size: {model.size}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {modelStatus === 'loading' && activeModel === model.id ? (
                                    <div className="flex flex-col items-end gap-1 w-48">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {downloadProgress.text || 'Loading...'}
                                        </div>
                                        <Progress value={downloadProgress.progress * 100} className="h-2" />
                                    </div>
                                ) : (
                                    <Button
                                        variant={activeModel === model.id ? "outline" : "default"}
                                        disabled={modelStatus === 'loading'}
                                        onClick={() => handleLoad(model)}
                                    >
                                        {activeModel === model.id ? (
                                            <>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Loaded
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                Load
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
