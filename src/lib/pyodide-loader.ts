import { loadPyodide, PyodideInterface } from 'pyodide';

let pyodideInstance: Promise<PyodideInterface> | null = null;

export function getPyodide(): Promise<PyodideInterface> {
  if (!pyodideInstance) {
    pyodideInstance = loadPyodide({ indexURL: '/pyodide/' });
  }
  return pyodideInstance;
}


