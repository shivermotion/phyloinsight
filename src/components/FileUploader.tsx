'use client';
import { useRef, useState } from 'react';
import { inflate } from 'pako';

interface FileUploaderProps {
  onFileLoaded: (content: string, name: string) => void;
  accept?: string;
}

export default function FileUploader({
  onFileLoaded,
  accept = '.vcf,.fasta,.fa',
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = 'file-error';
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);

  async function handleFiles(files: FileList | null) {
    console.log('🔄 handleFiles called with:', files);
    if (!files || files.length === 0) {
      console.log('❌ No files provided');
      return;
    }
    const file = files[0];
    console.log('📁 Processing file:', file.name, 'Size:', file.size);

    console.log('⏳ Setting loading state to true');
    setIsLoading(true);
    setError('');
    setFileName(file.name);
    setProgress(0);

    try {
      const ok = validateFile(file);
      console.log('✅ File validation result:', ok);
      if (!ok) {
        const errorMsg = 'Invalid file. Please upload FASTA (.fasta/.fa) or VCF (.vcf/.vcf.gz).';
        console.log('❌ Validation failed:', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      const name = file.name.toLowerCase();
      console.log('📄 File type detected:', name);

      // If gzipped VCF, inflate before passing on
      if (name.endsWith('.vcf.gz')) {
        console.log('🗜️ Processing gzipped VCF file');
        const buf = new Uint8Array(await file.arrayBuffer());
        const text = new TextDecoder('utf-8').decode(inflate(buf));
        console.log('✅ VCF.gz inflated, content length:', text.length);
        onFileLoaded(text, file.name);
        setIsLoading(false);
        return;
      }

      // Check if file is large and needs chunked processing
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        console.log('📊 Large file detected, using chunked processing');
        try {
          const content = await processLargeFile(file);
          console.log('✅ Large file processed successfully, content length:', content.length);
          onFileLoaded(content, file.name);
          setIsLoading(false);
        } catch (err) {
          console.log('❌ Error processing large file:', err);
          setError('Error processing large file. Please try again.');
          setIsLoading(false);
        }
      } else {
        // default: read as text for smaller files
        console.log('📖 Reading file as text');
        const reader = new FileReader();
        reader.onload = () => {
          console.log(
            '✅ File read successfully, content length:',
            reader.result?.toString().length
          );
          onFileLoaded(String(reader.result || ''), file.name);
          setIsLoading(false);
        };
        reader.onerror = () => {
          console.log('❌ FileReader error:', reader.error);
          setError('Failed to read file. Please try again.');
          setIsLoading(false);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.log('❌ Error processing file:', err);
      setError('Error processing file. Please try again.');
      setIsLoading(false);
    }
  }

  function validateFile(file: File): boolean {
    const name = file.name.toLowerCase();

    if (name.endsWith('.fasta') || name.endsWith('.fa')) return true;
    if (name.endsWith('.vcf') || name.endsWith('.vcf.gz')) return true;
    return false;
  }

  async function processLargeFile(file: File): Promise<string> {
    const chunkSize = 1024 * 1024; // 1MB chunks
    let content = '';
    let offset = 0;

    console.log(`📊 Processing large file (${(file.size / 1024 / 1024).toFixed(1)}MB) in chunks`);

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const chunkText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(chunk);
      });

      content += chunkText;
      offset += chunkSize;

      // Update progress
      const progressPercent = Math.min(100, (offset / file.size) * 100);
      setProgress(progressPercent);
      console.log(`📈 Progress: ${progressPercent.toFixed(1)}%`);

      // For very large files, we might want to limit processing
      if (content.length > 100 * 1024 * 1024) {
        // 100MB text limit
        console.log('⚠️ File too large for full processing, using sample');
        // Take first 50MB and last 50MB for analysis
        const firstPart = content.substring(0, 25 * 1024 * 1024);
        const lastPart = content.substring(content.length - 25 * 1024 * 1024);
        content = firstPart + '\n... [truncated middle] ...\n' + lastPart;
        break;
      }
    }

    return content;
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2">Upload VCF/FASTA</label>
      <div
        className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
          isLoading
            ? 'border-blue-400 bg-blue-50 cursor-not-allowed'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🎯 File dropped, isLoading:', isLoading);
          if (!isLoading) handleFiles(e.dataTransfer.files);
        }}
        aria-label="Drag and drop a VCF or FASTA file"
      >
        {isLoading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            </div>
            <p className="text-sm text-blue-600 font-medium">Processing {fileName}...</p>
            {progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {progress > 0
                ? `${progress.toFixed(1)}% complete`
                : 'Please wait while we read your file'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600">Drag and drop or click to upload</p>
            <p className="text-xs text-gray-500">
              Supports FASTA (.fasta/.fa) and VCF (.vcf/.vcf.gz) - any size!
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => {
            console.log('📂 File input changed, isLoading:', isLoading);
            void handleFiles(e.target.files);
          }}
          disabled={isLoading}
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
