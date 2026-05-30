import type { ReactNode } from "react";

interface LineagePageShellProps {
  children: ReactNode;
}

export default function LineagePageShell({ children }: LineagePageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}