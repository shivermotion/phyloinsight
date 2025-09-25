export type ParsedInput = { format: 'fasta' | 'vcf'; content: string };

// Quick format sniffing
export function detectFormat(text: string): 'fasta' | 'vcf' | 'unknown' {
  const t = text.trim();
  if (t.startsWith('>')) return 'fasta';
  if (t.startsWith('##') || t.split('\n', 3).some(l => l.startsWith('#CHROM'))) return 'vcf';
  return 'unknown';
}

// Parse VCF minimally to pseudo-FASTA by constructing presence/absence strings per sample.
// For simplicity: 1 for variant present (ALT != .), 0 for reference, ignoring phasing/zygosity.
// Optimized for large files with sampling
export function vcfToPseudoFasta(text: string, maxVariants: number = 10000): string {
  const lines = text.split(/\r?\n/);
  let header: string | null = null;
  for (const l of lines) {
    if (l.startsWith('#CHROM')) { header = l; break; }
  }
  if (!header) return '';
  const cols = header.split('\t');
  const samples = cols.slice(9);
  const seqs: Record<string, string[]> = Object.fromEntries(samples.map(s => [s, []]));

  // Filter to variant lines only
  const variantLines = lines.filter(l => l && !l.startsWith('#'));
  
  // Sample variants if file is too large
  let processedLines = variantLines;
  if (variantLines.length > maxVariants) {
    console.log(`📊 VCF has ${variantLines.length} variants, sampling ${maxVariants}`);
    // Take every nth line to get a representative sample
    const step = Math.floor(variantLines.length / maxVariants);
    processedLines = variantLines.filter((_, i) => i % step === 0).slice(0, maxVariants);
  }

  for (const l of processedLines) {
    const parts = l.split('\t');
    if (parts.length < 10) continue;
    const ref = parts[3];
    const alt = parts[4];
    const gts = parts.slice(9);
    // zygosity-aware: encode 0, 1, 2 for REF/het/HOM-ALT
    gts.forEach((gt, i) => {
      const sample = samples[i];
      let code = 0; // default REF
      const fmt = gt.split(':')[0] || '';
      // Normalize separators
      const alleles = fmt.replace('|', '/').split('/');
      const hasAlt = alt && alt !== '.';
      if (hasAlt && alleles.length >= 2) {
        const altCount = alleles.reduce((acc, a) => acc + (a === '1' ? 1 : 0), 0);
        if (altCount >= 2) code = 2; // homozygous alt
        else if (altCount === 1) code = 1; // heterozygous
        else code = 0; // homozygous ref
      }
      seqs[sample].push(String(code));
    });
  }

  // Emit FASTA
  let out = '';
  for (const s of samples) {
    out += `>${s}\n${seqs[s].join('')}\n`;
  }
  return out;
}

export function prepareInput(text: string): ParsedInput | null {
  const fmt = detectFormat(text);
  if (fmt === 'fasta') return { format: 'fasta', content: text };
  if (fmt === 'vcf') return { format: 'vcf', content: vcfToPseudoFasta(text) };
  return null;
}


