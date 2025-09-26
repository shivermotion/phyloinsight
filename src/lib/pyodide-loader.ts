import type { PyodideInterface } from 'pyodide';

let pyodideInstance: Promise<PyodideInterface> | null = null;

export function getPyodide(): Promise<PyodideInterface> {
  if (typeof window === 'undefined') {
    throw new Error('Pyodide can only be used in the browser');
  }

  if (!pyodideInstance) {
    pyodideInstance = (async () => {
      // Dynamic import to avoid bundler issues
      const { loadPyodide } = await import('pyodide');

      // Use CDN by default to avoid local asset issues
      const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
      console.log('🧩 Using Pyodide CDN:', indexURL);

      try {
        return await loadPyodide({ indexURL });
      } catch (loadError) {
        console.error('❌ Pyodide CDN load failed:', loadError);
        throw loadError;
      }
    })();
  }
  return pyodideInstance;
}


