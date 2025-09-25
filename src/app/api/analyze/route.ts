import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const fileContent = await file.text();
    // Placeholder - server echoes a static tree
    return NextResponse.json({ newick: '(A,(B,C));', scores: { conservation: 0.85 }, length: fileContent.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('API analyze error:', err);
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 });
  }
}


