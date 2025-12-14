import React from 'react';

const UnsupportedBrowser = ({ capabilities }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browser Not Supported</h1>
          <p className="text-gray-600">This application requires WebGPU support to run AI models locally in your browser.</p>
        </div>

        {capabilities && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold text-gray-900 mb-3">Compatibility Check Results:</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Browser:</span>
                <span className="font-mono">{capabilities.browser?.name} {capabilities.browser?.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>WebGPU:</span>
                <span className={capabilities.features?.webgpu?.supported ? 'text-green-600' : 'text-red-600'}>
                  {capabilities.features?.webgpu?.supported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>IndexedDB:</span>
                <span className={capabilities.features?.indexedDB?.supported ? 'text-green-600' : 'text-red-600'}>
                  {capabilities.features?.indexedDB?.supported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Web Workers:</span>
                <span className={capabilities.features?.webWorkers?.supported ? 'text-green-600' : 'text-red-600'}>
                  {capabilities.features?.webWorkers?.supported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Recommended Browsers:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Google Chrome</h3>
                <p className="text-sm text-gray-600">Version 113 or higher</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href="https://www.microsoft.com/edge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Microsoft Edge</h3>
                <p className="text-sm text-gray-600">Version 113 or higher</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Why WebGPU?</h3>
          <p className="text-sm text-blue-800">
            This application runs AI models entirely in your browser for privacy and security.
            WebGPU enables fast AI inference using your computer's GPU, keeping all your data local and private.
          </p>
        </div>

        {capabilities?.recommendations && capabilities.recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-2">Recommendations:</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              {capabilities.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnsupportedBrowser;
