import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Menu, Settings, Database, Brain } from 'lucide-react';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const activeModel = useSelector((state) => state.models.activeModelId);
  const models = useSelector((state) => state.models.items);

  const currentModel = models.find(m => m.modelId === activeModel);
  const modelStatus = currentModel?.status || 'not_loaded';

  const getStatusVariant = (status) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'downloading':
        return 'warning';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ready':
        return 'AI Ready';
      case 'downloading':
        return 'Downloading';
      case 'error':
        return 'AI Error';
      default:
        return 'Not Loaded';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section: Menu & Logo */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(toggleSidebar())}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PIWI</h1>
              <p className="text-xs text-gray-500">Document Extraction</p>
            </div>
          </div>
        </div>

        {/* Right Section: Status Indicators & Actions */}
        <div className="flex items-center gap-3">
          {/* AI Model Status */}
          <Badge variant={getStatusVariant(modelStatus)} className="flex items-center gap-1.5">
            <Brain className="w-3 h-3" />
            {getStatusText(modelStatus)}
          </Badge>

          {/* Storage Usage */}
          <div className="hidden md:block">
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              Storage: 0%
            </Badge>
          </div>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
