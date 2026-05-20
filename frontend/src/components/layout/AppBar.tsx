import { ReactNode } from 'react';

export default function AppBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="appbar">
      <h1>{title}</h1>
      <div>{right}</div>
    </header>
  );
}
