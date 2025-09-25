'use client';
import { useState } from 'react';

interface QueryInputProps {
  onSubmit: (text: string) => void;
}

export default function QueryInput({ onSubmit }: QueryInputProps) {
  const [text, setText] = useState('How conserved is this variant in primates?');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(text);
      }}
      className="flex gap-2 w-full"
      aria-label="Natural language query"
    >
      <input
        className="flex-1 border rounded px-3 py-2"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ask about conservation, clades, or unpredictability"
      />
      <button className="px-4 py-2 rounded bg-black text-white" type="submit">
        Ask
      </button>
    </form>
  );
}
