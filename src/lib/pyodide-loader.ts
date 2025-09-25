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

      // Prefer local assets if available
      let indexURL = '/pyodide/';
      try {
        const head = await fetch('/pyodide/pyodide.js', { method: 'HEAD', cache: 'no-store' });
        if (!head.ok) throw new Error(`HEAD /pyodide/pyodide.js -> ${head.status}`);
        console.log('🧩 Using local Pyodide assets at /pyodide/');
      } catch (e) {
        indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
        console.warn('⚠️ Local Pyodide not found, using CDN:', e);
      }

      return await loadPyodide({ indexURL });
    })();
  }
  return pyodideInstance;
}


