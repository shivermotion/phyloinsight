import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-6 py-16">
        <section className="text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">PhyloInsight</h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Query genomic variants with phylogenetic context. Upload FASTA or VCF, run in-browser
            analysis via Pyodide, and explore interactive trees.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/analyze" className="px-5 py-3 rounded bg-black text-white">
              Get started
            </Link>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded border border-black/10 hover:bg-gray-50"
            >
              Learn more
            </a>
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border rounded p-5">
            <h3 className="font-semibold mb-1">In-browser analysis</h3>
            <p className="text-sm text-gray-600">
              Pyodide runs Biopython-like workflows without servers.
            </p>
          </div>
          <div className="border rounded p-5">
            <h3 className="font-semibold mb-1">Interactive phylogeny</h3>
            <p className="text-sm text-gray-600">
              Navigate trees, zoom, and export Newick results.
            </p>
          </div>
          <div className="border rounded p-5">
            <h3 className="font-semibold mb-1">AI explanations</h3>
            <p className="text-sm text-gray-600">
              Transformers.js summarizes conservation and insights.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
