import type { PyodideInterface } from 'pyodide';

let pyodideInstance: Promise<PyodideInterface> | null = null;

interface WindowWithPyodide {
  loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
}

// Load Pyodide via script tag to avoid bundler issues
function loadPyodideScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Pyodide can only be used in the browser'));
      return;
    }

    const w = window as unknown as Window & WindowWithPyodide;

    // Check if already loaded
    if (w.loadPyodide) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js';
    script.onload = () => {
      console.log('🧩 Pyodide script loaded from CDN');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Failed to load Pyodide script');
      reject(new Error('Failed to load Pyodide script'));
    };
    document.head.appendChild(script);
  });
}

export function getPyodide(): Promise<PyodideInterface> {
  if (typeof window === 'undefined') {
    throw new Error('Pyodide can only be used in the browser');
  }

  if (!pyodideInstance) {
    pyodideInstance = (async () => {
      // Load Pyodide script first
      await loadPyodideScript();

      // Now use the global loadPyodide function
      const w = window as unknown as Window & WindowWithPyodide;
      const loadPyodide = w.loadPyodide;
      if (!loadPyodide) {
        throw new Error('loadPyodide not available after script load');
      }

      const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
      console.log('🧩 Initializing Pyodide with CDN:', indexURL);

      try {
        return await loadPyodide({ indexURL });
      } catch (loadError) {
        console.error('❌ Pyodide initialization failed:', loadError);
        throw loadError as Error;
      }
    })();
  }
  return pyodideInstance;
}


