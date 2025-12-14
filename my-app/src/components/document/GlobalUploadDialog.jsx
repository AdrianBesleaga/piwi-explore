import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchClients } from '../../store/slices/clientSlice';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'; // Assuming these exist or we use raw div if not
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'; // Assuming these exist
import { Button } from '../ui/button';
import DocumentUploader from './DocumentUploader';
import { Upload } from 'lucide-react';

// Simplified version if UI components aren't fully available, using standard HTML for select/dialog logic where needed
// But checking the file list, we don't have Select/Dialog in components/ui yet (only card, button, etc were listed).
// So I will build a custom modal implementation for now to be safe and fast.

const GlobalUploadDialog = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items: clients, loading } = useSelector((state) => state.clients);
    const [selectedClientId, setSelectedClientId] = useState('');

    useEffect(() => {
        dispatch(fetchClients());
    }, [dispatch]);

    // Auto-select if only one client
    useEffect(() => {
        if (clients.length === 1 && !selectedClientId) {
            setSelectedClientId(clients[0].id);
        }
    }, [clients, selectedClientId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Upload Documents</h2>
                    <p className="text-sm text-gray-500 mt-1">Select a client to upload documents to.</p>
                </div>

                <div className="p-6 overflow-y-auto">
                    {loading && clients.length === 0 ? (
                        <div className="text-center py-4">Loading clients...</div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-6 space-y-4">
                            <p className="text-gray-500">You need to create a client before uploading documents.</p>
                            <Button onClick={() => navigate('/clients')}>Create Client</Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Client</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                >
                                    <option value="" disabled>Select a client...</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedClientId && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-medium mb-2 block">Upload Files</label>
                                    <DocumentUploader
                                        clientId={selectedClientId}
                                        onUploadComplete={() => { }}
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Files will be added to the selected client's folder.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default GlobalUploadDialog;
