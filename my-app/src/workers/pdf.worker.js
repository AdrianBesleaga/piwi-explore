/* eslint-disable no-restricted-globals */
import * as pdfjs from 'pdfjs-dist';

// Configure worker - in a web worker environment, we might need to point to the worker script
// explicitely if not handled by the bundler magically, but Vite usually handles this.
// However, pdfjs-dist often requires setting the workerSrc.
// For now, let's try standard import.

// Initialize PDF.js worker
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url
// ).toString();
// Note: In a dedicated worker file that imports pdfjs-dist, we generally don't need to set GlobalWorkerOptions.workerSrc 
// if we are doing the processing IN this worker. 
// BUT, pdfjs-dist itself uses a "worker" for its heavy lifting. 
// If we are strictly running this code in a worker, we might be main thread for PDF.js's internal logic?
// Actually best practice for heavy PDF extraction is:
// Main Thread -> Our Custom Worker -> PDF.js API (which might use its own internal worker or run on this thread).
// If we run on this thread (forceDisableWorker = true), we block this worker thread, which is fine, as it keeps Main Thread free.

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    if (type === 'EXTRACT_TEXT') {
        try {
            const { fileBlob } = payload;
            const arrayBuffer = await fileBlob.arrayBuffer();

            // Load document
            const loadingTask = pdfjs.getDocument({
                data: arrayBuffer,
                // Disable internal worker to run in this thread (which is already a worker)
                // or let it spawn another worker if environment supports it.
                // Simpler to run in this thread since we are already off-main-thread.
                disableWorker: true,
            });

            const doc = await loadingTask.promise;
            const numPages = doc.numPages;
            let fullText = '';
            const pageTexts = [];

            for (let i = 1; i <= numPages; i++) {
                // Report progress
                self.postMessage({
                    type: 'PROGRESS',
                    id,
                    payload: {
                        current: i,
                        total: numPages,
                        percent: Math.round((i / numPages) * 100)
                    }
                });

                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item) => item.str).join(' ');

                pageTexts.push(pageText);
                fullText += pageText + '\n\n';
            }

            self.postMessage({
                type: 'SUCCESS',
                id,
                payload: {
                    text: fullText,
                    pages: pageTexts,
                    metadata: {
                        numPages: doc.numPages,
                        info: await doc.getMetadata()
                    }
                }
            });

        } catch (error) {
            console.error('PDF Worker Error:', error);
            self.postMessage({
                type: 'ERROR',
                id,
                payload: error.message
            });
        }
    }
};
