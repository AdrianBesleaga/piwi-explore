import React from 'react';
import { ModelManager } from '../components/ai/ModelManager';
import { AIChat } from '../components/ai/AIChat';

export default function AIPlayground() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">AI Playground</h1>
                <p className="text-muted-foreground">
                    Manage local AI models and test them directly in your browser.
                    These models run entirely on your device for maximum privacy.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <ModelManager />
                </div>
                <div className="lg:col-span-2">
                    <AIChat />
                </div>
            </div>
        </div>
    );
}
