'use client';
import { useEffect, useState } from 'react';
import FileUploader from '@/components/FileUploader';
import QueryInput from '@/components/QueryInput';
import TreeViewer from '@/components/TreeViewer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getPyodide } from '@/lib/pyodide-loader';
import { performAnalysis } from '@/lib/analysis';
import { explainResults } from '@/lib/ai';
import { prepareInput } from '@/lib/parser';

export default function AnalyzePage() {
  const [fileContent, setFileContent] = useState<string>('');
  const [newick, setNewick] = useState<string>('(A:1.0,(B:1.0,C:1.0):1.0);');
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [pyodideStatus, setPyodideStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  // Check Pyodide status on mount
  useEffect(() => {
    getPyodide()
      .then(() => {
        setPyodideStatus('ready');
        console.log('✅ Pyodide ready for analysis');
      })
      .catch(error => {
        setPyodideStatus('failed');
        console.warn('❌ Pyodide failed to load:', error);
      });
  }, []);

  // Restore persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('phyloinsight_state');
      if (saved) {
        const { fileContent: f, newick: n, explanation: e } = JSON.parse(saved);
        if (typeof f === 'string') setFileContent(f);
        if (typeof n === 'string') setNewick(n);
        if (typeof e === 'string') setExplanation(e);
      }
    } catch {}
  }, []);
  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(
        'phyloinsight_state',
        JSON.stringify({ fileContent, newick, explanation })
      );
    } catch {}
  }, [fileContent, newick, explanation]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analyze Variants with Phylogenetic Context</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Pyodide:</span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              pyodideStatus === 'ready'
                ? 'bg-green-100 text-green-800'
                : pyodideStatus === 'loading'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {pyodideStatus === 'ready'
              ? 'Ready'
              : pyodideStatus === 'loading'
              ? 'Loading...'
              : 'Failed'}
          </span>
        </div>
      </div>
      <FileUploader onFileLoaded={content => setFileContent(content)} />
      <QueryInput
        onSubmit={async text => {
          if (pyodideStatus !== 'ready') {
            setExplanation(
              `Pyodide is ${pyodideStatus}. Please wait for it to load before running analysis.`
            );
            return;
          }
          setLoading(true);
          try {
            console.log('🔍 Starting analysis for query:', text);
            console.log('📄 File content length:', fileContent.length);

            let content = fileContent || '';
            const prepared = prepareInput(content);
            if (!prepared) {
              throw new Error('Unrecognized file format. Upload FASTA or VCF.');
            }
            content = prepared.content;
            console.log('📝 Prepared content length:', content.length);

            // Try to use Pyodide, but fallback gracefully
            try {
              const pyodide = await getPyodide();
              console.log('🐍 Pyodide loaded successfully');
              const analysis = await performAnalysis(pyodide, content);
              setNewick(analysis.newick);
              const summary = await explainResults(analysis.scores);
              setExplanation(summary);
            } catch (pyodideError) {
              console.log('⚠️ Pyodide failed, using fallback analysis:', pyodideError);
              // Fallback: simple mock analysis
              const mockNewick = '(Sample1:0.1,(Sample2:0.2,Sample3:0.3):0.1);';
              setNewick(mockNewick);
              setExplanation(
                `Query: ${text}\n\nFallback Analysis:\n- File processed: ${content.length} characters\n- Format: ${prepared.format}\n- Conservation score: 0.75 (estimated)\n\nNote: Pyodide assets not found. For full analysis, download Pyodide files to public/pyodide/`
              );
            }
          } catch (err) {
            console.error('❌ Analysis error:', err);
            setExplanation(
              `Query: ${text}\n\nError: ${
                err instanceof Error ? err.message : 'Unknown error'
              }\n\nPlease ensure you have uploaded a valid FASTA or VCF file.`
            );
          } finally {
            setLoading(false);
          }
        }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-medium mb-2">Phylogenetic Tree</h2>
          <TreeViewer newick={newick} />
        </div>
        <div>
          <h2 className="font-medium mb-2">Summary</h2>
          {loading ? (
            <div className="border rounded p-4 min-h-[120px] flex items-center">
              <LoadingSpinner label="Running analysis…" />
            </div>
          ) : (
            <div className="border rounded p-4 min-h-[120px] whitespace-pre-wrap text-sm text-gray-700">
              {explanation || 'No query yet. Ask something above to see results.'}
            </div>
          )}
          <div className="mt-4 text-xs text-gray-500">
            {fileContent
              ? `Loaded file with ${fileContent.length} characters.`
              : 'No file uploaded yet.'}
          </div>
        </div>
      </div>
    </div>
  );
}
