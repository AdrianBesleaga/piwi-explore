import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchClients, createClient } from '../store/slices/clientSlice';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import ClientForm from '../components/client/ClientForm';
import { Plus, Search, Users, FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ClientList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: clients, loading } = useSelector((state) => state.clients);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const handleCreateClient = async (clientData) => {
    try {
      await dispatch(createClient(clientData)).unwrap();
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create client:', error);
      // Error handling is managed in the form component via try/catch wrapper if passed down, 
      // or we can show a toast here. ClientForm handles its own error state for display.
      throw error; // Re-throw to let ClientForm handle the error state
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.description && client.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage your clients and their documents</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* Creation Mode (Simple Overlay/Inline for now if Dialog missing) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <ClientForm
              onSubmit={handleCreateClient}
              onCancel={() => setIsCreating(false)}
            />
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Client Grid */}
      {loading && clients.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No clients found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating your first client'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreating(true)} variant="outline">
              Create Client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex justify-between items-start">
                  <span className="truncate">{client.name}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {client.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center text-sm text-gray-500 gap-4">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>0 Docs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDistanceToNow(client.updatedAt, { addSuffix: true })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientList;
