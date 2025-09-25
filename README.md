PhyloInsight — phylogeny-aware genomic variant querying in the browser.

## Getting Started

Prerequisites:
- Node.js 20+
- Yarn

Setup Pyodide assets:
1) Download Pyodide 0.28.3 from `https://cdn.jsdelivr.net/pyodide/v0.28.3/full/`
2) Place the contents under `public/pyodide/` so files like `public/pyodide/pyodide.asm.wasm` exist
3) (Optional) Put Python wheels under `public/python-packages/`

Run the development server:

```bash
yarn dev
```

Open `http://localhost:3000` for the landing page, or go directly to `http://localhost:3000/analyze`.

Analyze flow:
1) Upload a FASTA or VCF (supports `.vcf.gz` via client-side inflate)
2) Enter a natural-language query (e.g., "How conserved is this variant in mammals?")
3) View the tree and generated explanation

Notes:
- If Pyodide assets are missing you will see 404s for `/pyodide/*` and analysis will fallback with an error message.
- Transformers.js models load on-demand; first use may take time.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Tech

- Next.js App Router, Tailwind
- Pyodide for in-browser Python execution
- phylotree.js + d3 for tree rendering
- transformers.js for AI explanations

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
