import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { generateResponse, clearStreamingResponse } from '@/store/slices/aiSlice';
import { Send, Bot, FileText, ImageIcon, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { documentStorageService } from '@/services/storage/documentStorage.service';
import { webLLMService } from '@/services/ai/webllm.service';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
// We need to point to the worker file. In Vite, we can import it as a URL.
// Ensure pdfjs-dist/build/pdf.worker.min.mjs is available.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export function AIChat() {
    const dispatch = useDispatch();
    const { activeModel, modelStatus, streamingResponse, availableModels } = useSelector(state => state.ai);
    const documents = useSelector(state => state.documents.items);

    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState('none');
    const [imageData, setImageData] = useState(null); // Base64 of attached image (or rendered PDF page)
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [webGPUSupport, setWebGPUSupport] = useState(null); // WebGPU capability check

    const scrollRef = useRef(null);
    const selectedDoc = documents.find(d => d.id === selectedDocId);

    // Get active model metadata
    const activeModelData = availableModels.find(m => m.id === activeModel);

    const isVisionModel = activeModel?.includes('Vision') || activeModel?.includes('Llava') ||
        activeModel?.includes('vision') || activeModel?.includes('Florence') ||
        activeModel?.includes('moondream');

    // Handle Document Selection & Image Conversion
    useEffect(() => {
        const loadAttachment = async () => {
            if (!selectedDoc || selectedDocId === 'none') {
                setImageData(null);
                setHistory([]);
                return;
            }

            // Only load image data if we have a Vision Model active
            if (isVisionModel) {
                try {
                    setIsLoadingImage(true);
                    const doc = await documentStorageService.getDocumentById(selectedDocId);
                    if (!doc || !doc.fileBlob) return;

                    let dataUrl = null;

                    if (doc.fileType === 'pdf') {
                        // Render first page of PDF using direct PDF.js
                        const arrayBuffer = await doc.fileBlob.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        const page = await pdf.getPage(1);

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1.5 });
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        dataUrl = canvas.toDataURL('image/jpeg');

                    } else if (doc.fileType === 'image') {
                        // Convert Blob to DataURL
                        dataUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(doc.fileBlob);
                        });
                    }

                    setImageData(dataUrl);

                    // Add system message about the image
                    setHistory([{
                        role: 'system',
                        content: `User has attached an image of the document "${doc.fileName}". Analyze this image.`
                    }]);

                } catch (e) {
                    console.error("Failed to load image attachment", e);
                } finally {
                    setIsLoadingImage(false);
                }
            } else {
                // Text Mode
                setImageData(null);
                const contextText = selectedDoc.extractedText?.slice(0, 6000) || '';
                setHistory([{
                    role: 'system',
                    content: `You are a helpful AI assistant.
CONTEXT DOCUMENT (${selectedDoc.fileName}):
${contextText}

Answer questions based on the context above.`
                }]);
            }
        };

        loadAttachment();
    }, [selectedDocId, activeModel]);

    // Auto-scroll logic
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ block: 'end' });
    }, [history, streamingResponse]);

    // Effect to finalize message when streaming ends
    useEffect(() => {
        if (!generating && streamingResponse) {
            setHistory(prev => [...prev, { role: 'assistant', content: streamingResponse }]);
            dispatch(clearStreamingResponse());
        }
    }, [generating]);

    // Check WebGPU support on mount
    useEffect(() => {
        const checkGPU = async () => {
            const support = await webLLMService.checkWebGPUSupport();
            setWebGPUSupport(support);
        };
        checkGPU();
    }, []);

    // Get warning for current model
    const getModelWarning = () => {
        if (!activeModelData) return null;

        const warnings = [];

        // Check if model is experimental
        if (activeModelData.experimental) {
            warnings.push(activeModelData.warning || 'This model is experimental and may have compatibility issues.');
        }

        // Check WebGPU compatibility for vision models
        if (isVisionModel && webGPUSupport && !webGPUSupport.hasShaderF16) {
            warnings.push('Your GPU may not fully support this vision model (shader-f16 missing).');
        }

        if (isVisionModel && webGPUSupport && !webGPUSupport.supported) {
            warnings.push('WebGPU is not available. Vision models require WebGPU support.');
        }

        return warnings.length > 0 ? warnings : null;
    };

    const modelWarnings = getModelWarning();

    const handleSend = async () => {
        if (!input.trim() || !activeModel || modelStatus !== 'ready' || generating) return;

        console.log('[AIChat] handleSend called, imageData:', !!imageData, 'history length:', history.length);

        setGenerating(true);
        const userText = input;
        setInput('');

        // Create User Message
        let newUserMsg;
        if (isVisionModel && imageData) {
            // Vision model with image - ALWAYS include image for context
            console.log('[AIChat] Creating multimodal message with image');
            newUserMsg = {
                role: 'user',
                content: [
                    { type: "text", text: userText },
                    { type: "image_url", image_url: { url: imageData } }
                ]
            };
        } else {
            console.log('[AIChat] Creating text-only message');
            newUserMsg = { role: 'user', content: userText };
        }

        const newHistory = [...history, newUserMsg];
        setHistory(newHistory);

        try {
            console.log('[AIChat] Dispatching generateResponse...');
            await dispatch(generateResponse(newHistory)).unwrap();
            console.log('[AIChat] generateResponse completed');
        } catch (err) {
            console.error('[AIChat] Error generating response:', err);
        } finally {
            setGenerating(false);
        }
    };

    // Helper to render message content (which might be array now)
    const renderContent = (content) => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map((c, i) => c.text || '').join(' '); // Just show text part in UI
        }
        return '';
    };

    const handleClearCache = async () => {
        if (confirm("This will delete all downloaded AI models to free up space. Continue?")) {
            const { webLLMService } = await import('@/services/ai/webllm.service');
            await webLLMService.deleteModelCache();
            window.location.reload(); // Reload to reset state
        }
    };

    return (
        <Card className="h-[600px] flex flex-col transition-all duration-300">
            <CardHeader className="py-3 border-b space-y-2">
                <div className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Chat with {activeModel || 'AI'}
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-muted-foreground" onClick={handleClearCache} title="Clear Model Cache">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Attach Document" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Context</SelectItem>
                                {documents.map(doc => (
                                    <SelectItem key={doc.id} value={doc.id} className="text-xs">
                                        <div className="flex items-center gap-2 truncate">
                                            {doc.fileType === 'pdf' ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                                            <span className="truncate max-w-[120px]">{doc.fileName}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Model warnings and info */}
                {activeModelData && (
                    <div className="flex flex-col gap-1">
                        {activeModelData.description && (
                            <p className="text-xs text-muted-foreground">
                                {activeModelData.description}
                            </p>
                        )}
                        {activeModelData.capabilities && (
                            <div className="flex gap-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {activeModelData.capabilities}
                                </Badge>
                            </div>
                        )}
                        {modelWarnings && modelWarnings.map((warning, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                        {isVisionModel && imageData && (
                            <div className="flex justify-center mb-4">
                                <div className="relative group">
                                    <img src={imageData} alt="Context" className="h-32 w-auto border rounded-lg shadow-sm" />
                                    <Badge className="absolute top-1 right-1 px-1 py-0 text-[10px]">Context</Badge>
                                </div>
                            </div>
                        )}

                        {history.length === 0 && !imageData && (
                            <div className="text-center text-muted-foreground mt-20">
                                <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Load a model and say hello!</p>
                            </div>
                        )}

                        {history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{renderContent(msg.content)}</p>
                                </div>
                            </div>
                        ))}

                        {generating && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted border animate-pulse">
                                    <p className="text-sm whitespace-pre-wrap">{streamingResponse || 'Thinking...'}</p>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-3 border-t">
                <div className="flex w-full items-center space-x-2">
                    <Input
                        placeholder={isLoadingImage ? "Processing image..." : (selectedDoc ? `Ask about ${selectedDoc.fileName}...` : "Type a message...")}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        disabled={!activeModel || modelStatus !== 'ready' || generating || isLoadingImage}
                    />
                    <Button size="icon" onClick={handleSend} disabled={!activeModel || modelStatus !== 'ready' || generating || isLoadingImage}>
                        {isLoadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

