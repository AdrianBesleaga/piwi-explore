import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClients, updateClient, deleteClient } from '../store/slices/clientSlice';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import ClientForm from '../components/client/ClientForm';
import DocumentUploader from '../components/document/DocumentUploader';
import DocumentList from '../components/document/DocumentList';
import { ArrowLeft, Trash2, Edit, FileText } from 'lucide-react';

const ClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { items: clients, loading } = useSelector((state) => state.clients);
    const client = clients.find(c => c.id === id);

    const [isEditing, setIsEditing] = useState(false);

    // Ensure clients are loaded (e.g. on direct page access)
    useEffect(() => {
        if (clients.length === 0 && !loading) {
            dispatch(fetchClients());
        }
    }, [dispatch, clients.length, loading]);

    if (loading && !client) {
        return <div className="flex justify-center p-8">Loading client details...</div>;
    }

    if (!client && !loading) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold mb-4">Client not found</h2>
                <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
            </div>
        );
    }

    const handleUpdate = async (data) => {
        try {
            await dispatch(updateClient({ id: client.id, updates: data })).unwrap();
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update client:", error);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this client and all their documents? This action cannot be undone.')) {
            try {
                await dispatch(deleteClient(client.id)).unwrap();
                navigate('/clients');
            } catch (error) {
                console.error("Failed to delete client:", error);
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Navigation & Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                    <p className="text-sm text-gray-500">Created {new Date(client.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Client Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                                    <p className="text-base">{client.name}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                                    <p className="text-base text-gray-700 whitespace-pre-wrap">
                                        {client.description || 'No description provided.'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Documents */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <DocumentUploader
                                clientId={client.id}
                                onUploadComplete={() => dispatch(fetchClients())} // Optional refresh if counts depend on docs
                            />

                            <Separator />

                            <div>
                                <h3 className="text-sm font-medium mb-4 text-gray-500">Uploaded Documents</h3>
                                <DocumentList clientId={client.id} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg bg-white rounded-lg shadow-xl relative">
                        <ClientForm
                            initialData={client}
                            onSubmit={handleUpdate}
                            onCancel={() => setIsEditing(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetail;
