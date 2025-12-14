import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateResponse, clearStreamingResponse } from '@/store/slices/aiSlice';
import { Send, Bot, User } from 'lucide-react';

export function AIChat() {
    const dispatch = useDispatch();
    const { activeModel, modelStatus, streamingResponse, error } = useSelector(state => state.ai);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]); // Local history for now
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, streamingResponse]);

    const handleSend = async () => {
        if (!input.trim() || !activeModel || modelStatus !== 'ready') return;

        const userMsg = { role: 'user', content: input };
        setHistory(prev => [...prev, userMsg]);
        setInput('');

        // Dispatch generation
        // We pass the full history to the thunk? 
        // For simple testing, we just pass the last message or construct it here.
        // Let's assume the service/thunk handles state or we pass minimal context.
        // WebLLM needs full history array usually.
        const messages = [...history, userMsg];

        try {
            await dispatch(generateResponse(messages)).unwrap();
            // After generation is done, we technically should move streamingResponse to history
            // But we can do it via the useEffect monitoring streamingResponse?
            // Actually, best to do it after promise resolves.
        } catch (err) {
            console.error(err);
        }
    };

    // Move streaming response to history when done? 
    // Or just render it separately?
    // Let's render active streaming response below history.
    // When generation finishes (we can track loading state of thunk, or add a 'generating' flag), push to history.
    // Simplification: We pushed to history in handleSend (user part). 
    // We only need to "finalize" the assistant response when generation is complete.
    // But we don't know exactly when it completes here easily without local state tracking validation.
    // We'll trust the user triggers next message or we add a "Stop" button later.
    // Actually, let's use a local 'generating' state + thunk promise.

    const [generating, setGenerating] = useState(false);

    const onSend = async () => {
        if (!input.trim()) return;
        setGenerating(true);
        const userText = input;
        setInput('');

        const newHistory = [...history, { role: 'user', content: userText }];
        setHistory(newHistory);

        await dispatch(generateResponse(newHistory));

        setGenerating(false);
        // Move result to history
        // Access latest state? Or just append what we have.
        // We can't easily access store state here inside closure without useSelector ref.
        // But we know streamingResponse holds it.
        // However, React updates might be async. 
        // Correct approach: The 'streamingResponse' is in Redux. 
        // We should add it to 'history' state only when we are sure it's done. 
        // We can copy it from the 'streamingResponse' prop we receive.
    };

    // Better approach:
    // Render [...history, { role: 'assistant', content: streamingResponse }] if generating.

    // Effect to finalize message
    useEffect(() => {
        if (!generating && streamingResponse) {
            setHistory(prev => [...prev, { role: 'assistant', content: streamingResponse }]);
            dispatch(clearStreamingResponse());
        }
    }, [generating]); // runs when generating goes false

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Chat with {activeModel || 'AI'}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                        {history.length === 0 && (
                            <div className="text-center text-muted-foreground mt-20">
                                <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Load a model and say hello!</p>
                            </div>
                        )}

                        {history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted border'
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {generating && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted border animate-pulse">
                                    <p className="text-sm whitespace-pre-wrap">
                                        {streamingResponse || 'Thinking...'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t">
                <div className="flex w-full items-center space-x-2">
                    <Input
                        placeholder={!activeModel ? "Load a model first..." : "Type your message..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                        disabled={!activeModel || modelStatus !== 'ready' || generating}
                    />
                    <Button
                        size="icon"
                        onClick={onSend}
                        disabled={!activeModel || modelStatus !== 'ready' || generating}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
