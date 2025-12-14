import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, FileText, FileStack, Upload, Plus, Settings, FilePlus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const clients = useSelector((state) => state.clients.items);
  const documents = useSelector((state) => state.documents.items);
  const templates = useSelector((state) => state.templates.items);

  const stats = [
    {
      title: 'Total Clients',
      value: clients.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Documents',
      value: documents.length,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Templates',
      value: templates.length,
      icon: FileStack,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const quickActions = [
    {
      title: 'Create Client',
      description: 'Add a new client folder',
      icon: Plus,
      onClick: () => navigate('/clients'),
      color: 'border-blue-200 hover:border-blue-500 hover:bg-blue-50',
    },
    {
      title: 'Upload Documents',
      description: 'Upload files for extraction',
      icon: Upload,
      onClick: () => navigate('/clients'),
      color: 'border-green-200 hover:border-green-500 hover:bg-green-50',
    },
    {
      title: 'Create Template',
      description: 'Design a new PDF template',
      icon: FilePlus,
      onClick: () => navigate('/clients'),
      color: 'border-purple-200 hover:border-purple-500 hover:bg-purple-50',
    },
    {
      title: 'Settings',
      description: 'Configure AI models',
      icon: Settings,
      onClick: () => navigate('/settings'),
      color: 'border-orange-200 hover:border-orange-500 hover:bg-orange-50',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to PIWI Document Extraction</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.title}
                  variant="outline"
                  className={`h-auto p-4 flex flex-col items-center gap-2 border-2 border-dashed ${action.color} transition-all`}
                  onClick={action.onClick}
                >
                  <Icon className="w-8 h-8 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">{action.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      {clients.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Getting Started</CardTitle>
            <CardDescription className="text-blue-700">
              Welcome to PIWI! Follow these steps to process your first documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Create a new client folder</li>
              <li>Upload documents (PDFs, images, or text files)</li>
              <li>Let AI extract structured data automatically</li>
              <li>Create or upload PDF templates</li>
              <li>Map extracted data to template fields</li>
              <li>Generate filled PDFs instantly</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
