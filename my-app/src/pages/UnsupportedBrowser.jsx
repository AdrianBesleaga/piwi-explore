import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { AlertTriangle, Chrome, ExternalLink, Check, X, Info, Shield } from 'lucide-react';

const UnsupportedBrowser = ({ capabilities }) => {
  const FeatureStatus = ({ supported, label }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {supported ? (
        <Badge variant="success" className="flex items-center gap-1">
          <Check className="w-3 h-3" />
          Supported
        </Badge>
      ) : (
        <Badge variant="destructive" className="flex items-center gap-1">
          <X className="w-3 h-3" />
          Not Supported
        </Badge>
      )}
    </div>
  );

  const BrowserCard = ({ name, version, href, icon }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <Card className="transition-all hover:border-blue-500 hover:shadow-md cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-600">{version}</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </a>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertTitle className="text-xl">Browser Not Supported</AlertTitle>
          <AlertDescription className="mt-2">
            This application requires WebGPU support to run AI models locally in your browser.
          </AlertDescription>
        </Alert>

        {/* Compatibility Results */}
        {capabilities && (
          <Card>
            <CardHeader>
              <CardTitle>Compatibility Check Results</CardTitle>
              <CardDescription>
                Your browser: {capabilities.browser?.name} {capabilities.browser?.version}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <FeatureStatus
                supported={capabilities.features?.webgpu?.supported}
                label="WebGPU"
              />
              <Separator />
              <FeatureStatus
                supported={capabilities.features?.indexedDB?.supported}
                label="IndexedDB"
              />
              <Separator />
              <FeatureStatus
                supported={capabilities.features?.webWorkers?.supported}
                label="Web Workers"
              />
            </CardContent>
          </Card>
        )}

        {/* Recommended Browsers */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Browsers</CardTitle>
            <CardDescription>
              Use one of these browsers to run PIWI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BrowserCard
              name="Google Chrome"
              version="Version 113 or higher"
              href="https://www.google.com/chrome/"
              icon={<Chrome className="w-8 h-8 text-blue-600" />}
            />
            <BrowserCard
              name="Microsoft Edge"
              version="Version 113 or higher"
              href="https://www.microsoft.com/edge"
              icon={<Chrome className="w-8 h-8 text-blue-500" />}
            />
          </CardContent>
        </Card>

        {/* Why WebGPU */}
        <Alert variant="info">
          <Info className="w-5 h-5" />
          <AlertTitle>Why WebGPU?</AlertTitle>
          <AlertDescription className="mt-2 flex items-start gap-2">
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              This application runs AI models entirely in your browser for privacy and security.
              WebGPU enables fast AI inference using your computer's GPU, keeping all your data local and private.
            </span>
          </AlertDescription>
        </Alert>

        {/* Recommendations */}
        {capabilities?.recommendations && capabilities.recommendations.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="w-5 h-5" />
            <AlertTitle>Recommendations</AlertTitle>
            <AlertDescription className="mt-2">
              <ul className="space-y-1">
                {capabilities.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default UnsupportedBrowser;
