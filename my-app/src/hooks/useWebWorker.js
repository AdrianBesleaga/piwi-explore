import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook to manage Web Worker execution and state
 * @param {Worker | Function} workerInstanceOrFactory - A Worker instance or a factory function that returns one
 * @returns {Object} - { execute, status, result, error, terminate }
 */
export const useWebWorker = (workerInstanceOrFactory) => {
    const [status, setStatus] = useState('idle'); // idle, running, success, error
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const workerRef = useRef(null);

    useEffect(() => {
        // If a factory function is passed, we could instantiate here, but 
        // usually we want to control instantiation.
        // If a static worker instance is passed (like from a singleton service), use it.
        if (workerInstanceOrFactory instanceof Worker) {
            workerRef.current = workerInstanceOrFactory;
        }

        return () => {
            // If we own the worker (created it), we might want to terminate.
            // But if it's a shared worker from a service, we shouldn't.
            // For now, assume this hook manages a worker for a specific component's lifecycle 
            // primarily if it creates it.
        };
    }, [workerInstanceOrFactory]);

    const execute = useCallback(async (action, payload) => {
        setStatus('running');
        setResult(null);
        setError(null);

        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                // If passed a factory, create it now
                if (typeof workerInstanceOrFactory === 'function') {
                    workerRef.current = workerInstanceOrFactory();
                }
            }

            if (!workerRef.current) {
                const err = new Error('Worker not initialized');
                setError(err);
                setStatus('error');
                reject(err);
                return;
            }

            const id = crypto.randomUUID();

            const handleMessage = (e) => {
                const { type, id: msgId, payload: responsePayload } = e.data;

                if (msgId !== id) return;

                if (type === 'SUCCESS') {
                    setResult(responsePayload);
                    setStatus('success');
                    cleanup();
                    resolve(responsePayload);
                } else if (type === 'ERROR') {
                    setError(new Error(responsePayload));
                    setStatus('error');
                    cleanup();
                    reject(new Error(responsePayload));
                } else if (type === 'PROGRESS') {
                    // Optional: expose progress via another state if needed
                }
            };

            const cleanup = () => {
                workerRef.current.removeEventListener('message', handleMessage);
            };

            workerRef.current.addEventListener('message', handleMessage);
            workerRef.current.postMessage({ type: action, payload, id });

        });
    }, [workerInstanceOrFactory]);

    const terminate = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            setStatus('idle');
        }
    }, []);

    return { execute, status, result, error, terminate };
};
