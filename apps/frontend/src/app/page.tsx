import KanbanBoard from '@/components/KanbanBoard';

export default function Page() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
        ⚡ Enterprise Solicitation Pipeline
      </h1>
      <KanbanBoard />
    </main>
  );
}
