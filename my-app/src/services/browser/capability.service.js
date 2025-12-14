/**
 * Browser Capability Detection Service
 * Checks for WebGPU, IndexedDB, and Web Workers support
 */

/**
 * Check if WebGPU is supported and available
 * @returns {Promise<Object>} { supported: boolean, reason: string }
 */
export const checkWebGPUSupport = async () => {
  // Check if navigator.gpu exists
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU is not available in this browser. Please use Chrome 113+ or Edge 113+.'
    };
  }

  try {
    // Try to request a WebGPU adapter
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      return {
        supported: false,
        reason: 'No WebGPU adapter found. Your GPU may not support WebGPU, or it may be disabled.'
      };
    }

    // Check for required features
    const requiredFeatures = ['shader-f16']; // Add more if needed
    const missingFeatures = requiredFeatures.filter(
      feature => !adapter.features.has(feature)
    );

    if (missingFeatures.length > 0) {
      console.warn('Missing WebGPU features:', missingFeatures);
      // Continue anyway - not all features are critical
    }

    return {
      supported: true,
      reason: 'WebGPU is fully supported',
      adapter: {
        vendor: adapter.vendor || 'Unknown',
        architecture: adapter.architecture || 'Unknown',
        features: Array.from(adapter.features)
      }
    };
  } catch (error) {
    return {
      supported: false,
      reason: `WebGPU error: ${error.message}`
    };
  }
};

/**
 * Check if IndexedDB is supported
 * @returns {boolean}
 */
export const checkIndexedDBSupport = () => {
  if (!('indexedDB' in window)) {
    return {
      supported: false,
      reason: 'IndexedDB is not supported in this browser'
    };
  }

  // Test if IndexedDB is actually working (some browsers have it disabled)
  try {
    const testDB = window.indexedDB.open('test');
    testDB.onerror = () => {
      return {
        supported: false,
        reason: 'IndexedDB is disabled or blocked'
      };
    };
    return {
      supported: true,
      reason: 'IndexedDB is available'
    };
  } catch (error) {
    return {
      supported: false,
      reason: `IndexedDB error: ${error.message}`
    };
  }
};

/**
 * Check if Web Workers are supported
 * @returns {Object}
 */
export const checkWebWorkersSupport = () => {
  if (typeof Worker === 'undefined') {
    return {
      supported: false,
      reason: 'Web Workers are not supported in this browser'
    };
  }

  return {
    supported: true,
    reason: 'Web Workers are available'
  };
};

/**
 * Check if the browser supports the Storage API for quota estimation
 * @returns {Object}
 */
export const checkStorageAPISupport = () => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {
      supported: false,
      reason: 'Storage API is not supported'
    };
  }

  return {
    supported: true,
    reason: 'Storage API is available'
  };
};

/**
 * Get browser information
 * @returns {Object}
 */
export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  // Detect Chrome
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    browserName = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Detect Edge
  else if (ua.indexOf('Edg') > -1) {
    browserName = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Detect Safari
  else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Detect Firefox
  else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }

  return {
    name: browserName,
    version: browserVersion,
    userAgent: ua
  };
};

/**
 * Check all requirements and return compatibility status
 * @returns {Promise<Object>}
 */
export const checkRequirements = async () => {
  const browserInfo = getBrowserInfo();
  const webgpu = await checkWebGPUSupport();
  const indexedDB = checkIndexedDBSupport();
  const webWorkers = checkWebWorkersSupport();
  const storageAPI = checkStorageAPISupport();

  // Determine if browser is compatible
  const isCompatible = webgpu.supported && indexedDB.supported && webWorkers.supported;

  // Generate detailed compatibility message
  let compatibilityMessage = '';
  if (!isCompatible) {
    const issues = [];
    if (!webgpu.supported) issues.push(`WebGPU: ${webgpu.reason}`);
    if (!indexedDB.supported) issues.push(`IndexedDB: ${indexedDB.reason}`);
    if (!webWorkers.supported) issues.push(`Web Workers: ${webWorkers.reason}`);

    compatibilityMessage = `Your browser is not compatible. Issues:\n${issues.join('\n')}`;
  } else {
    compatibilityMessage = 'Your browser is fully compatible!';
  }

  // Check if browser version is new enough
  const isRecommendedBrowser =
    (browserInfo.name === 'Chrome' && parseInt(browserInfo.version) >= 113) ||
    (browserInfo.name === 'Edge' && parseInt(browserInfo.version) >= 113);

  return {
    isCompatible,
    isRecommendedBrowser,
    compatibilityMessage,
    browser: browserInfo,
    features: {
      webgpu,
      indexedDB,
      webWorkers,
      storageAPI
    },
    recommendations: !isRecommendedBrowser ? [
      'For the best experience, please use Chrome 113+ or Edge 113+',
      'WebGPU support is required for AI model inference',
      'Safari and Firefox do not currently support WebGPU'
    ] : []
  };
};

/**
 * Get estimated storage quota
 * @returns {Promise<Object>}
 */
export const getStorageQuota = async () => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {
      supported: false,
      quota: 0,
      usage: 0,
      percentUsed: 0
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      supported: true,
      quota,
      usage,
      percentUsed,
      quotaMB: (quota / 1024 / 1024).toFixed(2),
      usageMB: (usage / 1024 / 1024).toFixed(2)
    };
  } catch (error) {
    return {
      supported: false,
      error: error.message,
      quota: 0,
      usage: 0,
      percentUsed: 0
    };
  }
};

export default {
  checkWebGPUSupport,
  checkIndexedDBSupport,
  checkWebWorkersSupport,
  checkStorageAPISupport,
  getBrowserInfo,
  checkRequirements,
  getStorageQuota
};
