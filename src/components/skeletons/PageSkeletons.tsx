/**
 * Skeletons compartilhados (Server Components — sem "use client").
 * Usados pelos arquivos `loading.tsx` de cada rota para dar feedback
 * instantâneo durante a navegação (Streaming + Suspense do App Router).
 *
 * As dimensões imitam o layout real das páginas (Topbar ~70px,
 * container max-w-7xl, grid de 12 colunas) para evitar "layout shift".
 */

type ClassNameProp = { className?: string };

/** Bloco base pulsante. */
export function Skeleton({ className = "" }: ClassNameProp) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
    />
  );
}

/** Imita a Topbar fixa (logo + navegação + seletor de escola). */
export function TopbarSkeleton() {
  return (
    <div className="sticky top-0 z-40 w-full h-[70px] bg-white shadow-sm border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-28 h-4" />
        </div>
        <div className="hidden md:flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-8 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="hidden sm:block w-36 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Cabeçalho da página: badge, título, subtítulo e botão primário. */
export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80">
      <div className="space-y-3">
        <Skeleton className="w-56 h-6 rounded-full" />
        <Skeleton className="w-72 h-8" />
        <Skeleton className="w-96 max-w-full h-4" />
      </div>
      {withAction && <Skeleton className="w-40 h-11 rounded-xl" />}
    </div>
  );
}

/** Lista de cards (coluna esquerda das telas de cadastro). */
export function CardListSkeleton({
  items = 5,
  withChips = true,
  className = "",
}: { items?: number; withChips?: boolean } & ClassNameProp) {
  return (
    <section
      className={`bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4 ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="w-40 h-5" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-16 h-4 rounded-md" />
                </div>
                <Skeleton className="w-44 h-3" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
            {withChips && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={j} className="w-12 h-4 rounded" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Painel de formulário (coluna direita das telas de cadastro). */
export function FormPanelSkeleton({
  fields = 3,
  className = "",
}: { fields?: number } & ClassNameProp) {
  return (
    <section
      className={`bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 lg:p-8 space-y-6 ${className}`}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="w-48 h-5" />
          <Skeleton className="w-64 h-3" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-24 h-3" />
            <Skeleton className="w-full h-11 rounded-xl" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={4} columns={4} bare />
      <div className="flex justify-end gap-3 pt-2">
        <Skeleton className="w-28 h-11 rounded-xl" />
        <Skeleton className="w-36 h-11 rounded-xl" />
      </div>
    </section>
  );
}

/** Tabela genérica (cabeçalho + linhas). */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  bare = false,
}: {
  rows?: number;
  columns?: number;
  bare?: boolean;
}) {
  const content = (
    <div className="overflow-hidden rounded-xl border border-slate-200/80">
      <div
        className="grid gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200/80"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-2/3" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 px-4 py-3.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, c) => (
              <Skeleton
                key={c}
                className={`h-4 ${c === 0 ? "w-4/5" : c === columns - 1 ? "w-1/3 ml-auto" : "w-1/2"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (bare) return content;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="w-48 h-5" />
        <Skeleton className="w-full sm:w-64 h-10 rounded-xl" />
      </div>
      {content}
    </section>
  );
}

/**
 * Layout padrão de "cadastro em duas colunas" para children de (dashboard)/layout.tsx:
 * O Topbar é persistido no layout e NÃO pisca durante as transições de rota.
 */
export function TwoColumnPageSkeleton({
  label,
  leftSpan = 5,
  listItems = 5,
  withChips = true,
  formFields = 3,
}: {
  label: string;
  leftSpan?: 4 | 5;
  listItems?: number;
  withChips?: boolean;
  formFields?: number;
}) {
  // Classes literais para o Tailwind detectar no build.
  const leftClass = leftSpan === 4 ? "lg:col-span-4" : "lg:col-span-5";
  const rightClass = leftSpan === 4 ? "lg:col-span-8" : "lg:col-span-7";

  return (
    <div
      className="w-full flex-1 flex flex-col"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando {label}...</span>
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <CardListSkeleton
            className={leftClass}
            items={listItems}
            withChips={withChips}
          />
          <FormPanelSkeleton className={rightClass} fields={formFields} />
        </div>
      </main>
    </div>
  );
}

/** Layout padrão de "listagem em tabela" para children de (dashboard)/layout.tsx */
export function TablePageSkeleton({
  label,
  rows = 8,
  columns = 5,
}: {
  label: string;
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      className="w-full flex-1 flex flex-col"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando {label}...</span>
      <main className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        <PageHeaderSkeleton />
        <TableSkeleton rows={rows} columns={columns} />
      </main>
    </div>
  );
}
