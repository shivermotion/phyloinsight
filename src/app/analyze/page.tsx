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
  const [newick, setNewick] = useState<string>('(A,(B,C));');
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
      <h1 className="text-2xl font-semibold">Analyze Variants with Phylogenetic Context</h1>
      <FileUploader onFileLoaded={content => setFileContent(content)} />
      <QueryInput
        onSubmit={async text => {
          setLoading(true);
          try {
            const pyodide = await getPyodide();
            let content = fileContent || '';
            const prepared = prepareInput(content);
            if (!prepared) {
              throw new Error('Unrecognized file format. Upload FASTA or VCF.');
            }
            content = prepared.content;
            const analysis = await performAnalysis(pyodide, content);
            setNewick(analysis.newick);
            const summary = await explainResults(analysis.scores);
            setExplanation(summary);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            setExplanation(
              `Query: ${text}\nUnable to run analysis. Ensure Pyodide assets are present and upload FASTA/VCF.`
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
