import { detectFormat, vcfToPseudoFasta, prepareInput } from '@/lib/parser';

describe('parser', () => {
  it('detects FASTA', () => {
    expect(detectFormat('>seq\nACGT')).toBe('fasta');
  });
  it('detects VCF', () => {
    const vcf = '##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1\tS2\n';
    expect(detectFormat(vcf)).toBe('vcf');
  });
  it('converts VCF to pseudo-FASTA with zygosity codes', () => {
    const vcf = [
      '##fileformat=VCFv4.2',
      '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1\tS2',
      '1\t100\.\t.\tA\tG\t.\t.\t.\tGT\t0/1\t1/1',
      '1\t200\.\t.\tC\tT\t.\t.\t.\tGT\t0/0\t0/1',
    ].join('\n');
    const fasta = vcfToPseudoFasta(vcf);
    expect(fasta).toContain('>S1');
    expect(fasta).toContain('>S2');
    // S1: 0/1 -> 1 , 0/0 -> 0
    expect(fasta).toMatch(/>S1\n10/);
    // S2: 1/1 -> 2 , 0/1 -> 1
    expect(fasta).toMatch(/>S2\n21/);
  });
  it('prepareInput converts VCF to FASTA content', () => {
    const vcf = [
      '##fileformat=VCFv4.2',
      '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1',
      '1\t100\.\t.\tA\tG\t.\t.\t.\tGT\t0/1',
    ].join('\n');
    const prepared = prepareInput(vcf);
    expect(prepared?.format).toBe('vcf');
    expect(prepared?.content).toContain('>S1');
  });
});


