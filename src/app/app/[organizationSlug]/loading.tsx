export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#f5f0e8] p-6 lg:p-8">
      <div className="h-9 w-64 rounded-lg bg-slate-200" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-28 rounded-xl bg-white" key={index} />
        ))}
      </div>
      <div className="mt-5 h-[520px] rounded-xl bg-white" />
    </div>
  );
}
