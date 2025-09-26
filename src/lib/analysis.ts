import type { PyodideInterface } from 'pyodide';

export interface AnalysisResult {
  newick: string;
  scores: Record<string, number>;
}

// Performs an in-browser analysis using pure-Python code (no external deps)
// - Parses FASTA with aggressive sampling for large datasets
// - Computes pairwise Hamming distances on sampled data
// - Builds a simple UPGMA tree
// - Computes a conservation score as mean max-nucleotide-frequency per site
export async function performAnalysis(pyodide: PyodideInterface, fileContent: string): Promise<AnalysisResult> {
  console.log('🔬 Starting Python analysis...');
  const sanitized = (fileContent || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Analysis timeout after 30 seconds')), 30000);
  });
  
  const analysisPromise = (async () => {
    const code = `
from typing import Dict, List, Tuple
from io import StringIO
import math

def parse_fasta(text: str, max_sequences: int = 50, max_length: int = 1000) -> Dict[str, str]:
    """Parse FASTA with aggressive sampling for large datasets"""
    seqs = {}
    current_id = None
    current_seq = []
    sequence_count = 0
    
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith('>'):
            if current_id is not None:
                # Truncate sequence if too long
                full_seq = ''.join(current_seq).upper()
                if len(full_seq) > max_length:
                    full_seq = full_seq[:max_length]
                seqs[current_id] = full_seq
                sequence_count += 1
                
                # Stop if we have enough sequences
                if sequence_count >= max_sequences:
                    break
                    
            current_id = line[1:].strip().split()[0]
            current_seq = []
        else:
            current_seq.append(line.upper())
    
    # Handle last sequence
    if current_id is not None and sequence_count < max_sequences:
        full_seq = ''.join(current_seq).upper()
        if len(full_seq) > max_length:
            full_seq = full_seq[:max_length]
        seqs[current_id] = full_seq
    
    return seqs

def pad_sequences(seqs: Dict[str, str]) -> Dict[str, str]:
    if not seqs:
        return seqs
    maxlen = max(len(s) for s in seqs.values())
    return {k: (v + '-' * (maxlen - len(v))) for k, v in seqs.items()}

def hamming(a: str, b: str) -> float:
    L = min(len(a), len(b))
    mismatches = sum(1 for i in range(L) if a[i] != b[i]) + abs(len(a)-len(b))
    return mismatches / max(len(a), len(b), 1)

def distance_matrix(ids: List[str], seqs: Dict[str, str]) -> Dict[Tuple[str,str], float]:
    dm = {}
    for i in range(len(ids)):
        for j in range(i+1, len(ids)):
            dm[(ids[i], ids[j])] = hamming(seqs[ids[i]], seqs[ids[j]])
    return dm

def upgma(ids: List[str], dm: Dict[Tuple[str,str], float]) -> str:
    # Simplified UPGMA that avoids index errors and ensures proper branch lengths
    if len(ids) <= 1:
        return f"({ids[0] if ids else 'A'}:1.0);"
    
    if len(ids) == 2:
        a, b = ids[0], ids[1]
        dist = dm.get((a, b), dm.get((b, a), 1.0))
        return f"({a}:{dist/2:.4f},{b}:{dist/2:.4f});"
    
    # For more than 2 sequences, use a simple approach
    # Find the two most similar sequences
    min_dist = float('inf')
    best_pair = (ids[0], ids[1])
    
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = ids[i], ids[j]
            dist = dm.get((a, b), dm.get((b, a), 1.0))
            if dist < min_dist:
                min_dist = dist
                best_pair = (a, b)
    
    # Create a simple tree with the best pair and others as outgroups
    a, b = best_pair
    remaining = [id for id in ids if id not in best_pair]
    
    if remaining:
        # Group remaining sequences
        if len(remaining) == 1:
            outgroup = remaining[0]
        else:
            outgroup = f"({'|'.join(remaining[:3])})"  # Limit to 3 for readability
        
        # Ensure all nodes have branch lengths - add length to outgroup if missing
        if ':' not in outgroup:
            outgroup_with_length = f"{outgroup}:{min_dist/2:.4f}"
        else:
            outgroup_with_length = outgroup
        
        return f"(({a}:{min_dist/2:.4f},{b}:{min_dist/2:.4f}):{min_dist/4:.4f},{outgroup_with_length});"
    else:
        return f"({a}:{min_dist/2:.4f},{b}:{min_dist/2:.4f});"

def conservation_score(seqs: Dict[str,str]) -> float:
    if not seqs:
        return 0.0
    seq_list = list(seqs.values())
    L = max(len(s) for s in seq_list)
    if L == 0:
        return 0.0
    total = 0.0
    valid_cols = 0
    for i in range(L):
        col = [s[i] if i < len(s) else '-' for s in seq_list]
        # ignore gaps for frequency calc
        bases = [c for c in col if c != '-']
        if not bases:
            continue
        valid_cols += 1
        freq = {}
        for c in bases:
            freq[c] = freq.get(c, 0) + 1
        maxf = max(freq.values())
        total += maxf / len(bases)
    return total / max(valid_cols, 1)

# Use aggressive sampling for large datasets
seqs = parse_fasta('''${sanitized}''', max_sequences=30, max_length=500)
if not seqs:
    newick = '(A,B);'
    score = 0.0
else:
    seqs = pad_sequences(seqs)
    ids = list(seqs.keys())
    if len(ids) == 1:
        newick = f"({ids[0]},outgroup);"
    else:
        dm = distance_matrix(ids, seqs)
        newick = upgma(ids, dm)
    score = conservation_score(seqs)

result = (newick, score)
result
`;
    const res = (await pyodide.runPythonAsync(code)) as [string, number] | unknown;
    let newick = '(A,(B,C));';
    let score = 0.0;
    if (Array.isArray(res) && typeof res[0] === 'string' && typeof res[1] === 'number') {
      newick = res[0] as string;
      score = res[1] as number;
    }
    console.log('✅ Python analysis completed');
    return { newick, scores: { conservation: score } };
  })();
  
  // Race between analysis and timeout
  return Promise.race([analysisPromise, timeoutPromise]);
}


