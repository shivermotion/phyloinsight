import { describe, it, expect } from '@jest/globals';
import { performAnalysis } from '@/lib/analysis';

// Mock a minimal Pyodide interface that just echoes the Python output
class MockPyodide {
  async runPythonAsync(code: string): Promise<[string, number]> {
    // crude extraction to simulate outputs from our python code
    // Fallback to a static result for test determinism
    return ['(A:0.0,B:0.0);', 0.5];
  }
}

describe('analysis', () => {
  it('returns AnalysisResult with newick and scores', async () => {
    const pyodide = new MockPyodide() as any;
    const res = await performAnalysis(pyodide, '>A\nAC\n>B\nAG');
    expect(typeof res.newick).toBe('string');
    expect(res.newick.endsWith(';')).toBe(true);
    expect(typeof res.scores.conservation).toBe('number');
  });
});


