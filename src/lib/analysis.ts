import type { PyodideInterface } from 'pyodide';

export interface AnalysisResult {
  newick: string;
  scores: Record<string, number>;
}

// Performs an in-browser analysis using pure-Python code (no external deps)
// - Parses FASTA
// - Computes pairwise Hamming distances
// - Builds a simple UPGMA tree
// - Computes a conservation score as mean max-nucleotide-frequency per site
export async function performAnalysis(pyodide: PyodideInterface, fileContent: string): Promise<AnalysisResult> {
  const sanitized = (fileContent || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  const code = `
from typing import Dict, List, Tuple
from io import StringIO
import math

def parse_fasta(text: str) -> Dict[str, str]:
    seqs = {}
    current_id = None
    current_seq = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith('>'):
            if current_id is not None:
                seqs[current_id] = ''.join(current_seq)
            current_id = line[1:].strip().split()[0]
            current_seq = []
        else:
            current_seq.append(line.upper())
    if current_id is not None:
        seqs[current_id] = ''.join(current_seq)
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
    # UPGMA with simple branch lengths (ultrametric assumption)
    clusters = {i: ids[i] for i in range(len(ids))}
    height = {i: 0.0 for i in range(len(ids))}  # height of each cluster
    active = {i for i in range(len(ids))}
    size = {i: 1 for i in range(len(ids))}

    def d(i, j):
        a, b = ids[i], ids[j]
        if a == b:
            return 0.0
        key = (a, b) if (a, b) in dm else (b, a)
        return dm.get(key, 0.0)

    while len(active) > 1:
        pairs = [(i, j) for i in active for j in active if i < j]
        if not pairs:
            break
        i, j = min(pairs, key=lambda ij: d(ij[0], ij[1]))
        dij = d(i, j)
        new_height = dij / 2.0
        li = max(new_height - height[i], 0.0)
        lj = max(new_height - height[j], 0.0)
        newick = f"({clusters[i]}:{li:.4f},{clusters[j]}:{lj:.4f})"
        new_idx = max(clusters.keys()) + 1
        clusters[new_idx] = newick
        height[new_idx] = new_height
        size[new_idx] = size[i] + size[j]

        for k in list(active):
            if k in (i, j):
                continue
            dik = d(i, k)
            djk = d(j, k)
            avg = (dik * size[i] + djk * size[j]) / (size[i] + size[j])
            ai, ak = ids[i], ids[k]
            aj = ids[j]
            dm[(ai, ak)] = avg
            dm[(ak, ai)] = avg
            dm[(aj, ak)] = avg
            dm[(ak, aj)] = avg
        active.remove(i)
        active.remove(j)
        active.add(new_idx)

    root_idx = next(iter(active)) if active else 0
    tree = clusters[root_idx] if clusters else '(A:0.0,B:0.0)'
    if not tree.endswith(';'):
        tree += ';'
    return tree

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

seqs = parse_fasta('''${sanitized}''')
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
  return { newick, scores: { conservation: score } };
}


