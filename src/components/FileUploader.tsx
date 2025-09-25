'use client';
import { useRef } from 'react';
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
  const [error, setError] = ((): [string, (v: string) => void] => {
    // inline minimal state without external dep to keep file focused
    let val = '';
    return [
      val,
      (v: string) => {
        val = v;
      },
    ];
  })();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ok = validateFile(file);
    if (!ok) {
      setError('Invalid file. Please upload FASTA (.fasta/.fa) for now.');
      return;
    }
    const name = file.name.toLowerCase();
    // If gzipped VCF, inflate before passing on
    if (name.endsWith('.vcf.gz')) {
      const buf = new Uint8Array(await file.arrayBuffer());
      const text = new TextDecoder('utf-8').decode(inflate(buf));
      onFileLoaded(text, file.name);
      return;
    }
    // default: read as text
    const reader = new FileReader();
    reader.onload = () => {
      onFileLoaded(String(reader.result || ''), file.name);
    };
    reader.readAsText(file);
  }

  function validateFile(file: File): boolean {
    const name = file.name.toLowerCase();
    if (name.endsWith('.fasta') || name.endsWith('.fa')) return true;
    if (name.endsWith('.vcf') || name.endsWith('.vcf.gz')) return true;
    return false;
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2">Upload VCF/FASTA</label>
      <div
        className="border-2 border-dashed rounded p-6 text-center cursor-pointer hover:bg-gray-50"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          handleFiles(e.dataTransfer.files);
        }}
        aria-label="Drag and drop a VCF or FASTA file"
      >
        <p className="text-sm text-gray-600">Drag and drop or click to upload</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
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
