
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import db from '@/services/storage/indexedDB.service';
import TemplateUploader from '@/components/template/TemplateUploader';
import TemplateDesigner from '@/components/template/TemplateDesigner';
import MappingWizard from '@/components/template/MappingWizard';

const TemplateManagement = () => {
    const [templates, setTemplates] = useState([]);
    const [view, setView] = useState('list'); // 'list', 'design'
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);

    // Clients for Mapping Wizard (could fetch in the component, but here we can manage it)
    const [clients, setClients] = useState([]);

    useEffect(() => {
        loadTemplates();
        loadClients();
    }, []);

    const loadTemplates = async () => {
        const tmpls = await db.templates.toArray();
        setTemplates(tmpls);
    };

    const loadClients = async () => {
        const cls = await db.clients.toArray();
        setClients(cls);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this template?")) {
            await db.templates.delete(id);
            loadTemplates();
        }
    };

    const handleDesign = (id) => {
        setSelectedTemplateId(id);
        setView('design');
    };

    return (
        <div className="h-full flex flex-col space-y-6 container mx-auto p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Template Workflow</h1>
            </div>

            {view === 'design' && (
                <TemplateDesigner
                    templateId={selectedTemplateId}
                    onBack={() => {
                        setView('list');
                        setSelectedTemplateId(null);
                        loadTemplates();
                    }}
                />
            )}

            {view === 'list' && (
                <Tabs defaultValue="manage" className="flex-1 flex flex-col">
                    <TabsList>
                        <TabsTrigger value="manage">Manage Templates</TabsTrigger>
                        <TabsTrigger value="generate">Generate Documents</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manage" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Upload Column */}
                            <div>
                                <TemplateUploader onUploadSuccess={loadTemplates} />
                            </div>

                            {/* Template List Column */}
                            <div className="md:col-span-2 grid grid-cols-1 gap-4">
                                {templates.length === 0 && (
                                    <div className="text-center text-muted-foreground p-8 border rounded-lg border-dashed">
                                        No templates uploaded yet.
                                    </div>
                                )}
                                {templates.map(t => (
                                    <Card key={t.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleDesign(t.id)}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded text-primary">
                                                    <Edit className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{t.name}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Edited: {new Date(t.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(t.id, e)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="generate" className="flex-1 h-full mt-4">
                        <MappingWizard clients={clients} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default TemplateManagement;
