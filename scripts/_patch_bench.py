import io
p = 'apps/web/src/components/features/BenchWorkspace.tsx'
s = io.open(p, encoding='utf-8').read()

old_start = s.index('  const gridRef = useToolboxColumns();\n\n  return (\n    <div className="workspace-shell')
old_end = s.index('/* ================================================================== *\n * 面板卡片')
new = '''  const gridRef = useToolboxColumns();

  return (
    <WorkspaceShell pinned={nav}>
      <div className="toolbox-workspace-layout flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible">
        <section className="relative z-[1] mx-auto w-full max-w-shell bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 [--toolbox-section-gutter:56px] !max-w-[calc(100%-var(--toolbox-section-gutter))] [.workspace-main-shell:has(>.workspace-pinned-navigation[data-layout-expanded=true])_&]:[--toolbox-section-gutter:16px] duration-[250ms] ease-out motion-reduce:!transition-none max-lg:!max-w-[min(108rem,calc(100%-clamp(1.5rem,4vw,3.5rem)))] max-lg:!transition-none [.workspace-main-shell:has(>.workspace-pinned-navigation[data-animate-layout=true])_&]:[transition-property:max-width] flex min-h-0 flex-1 flex-col lg:overflow-hidden lg:!pl-2 lg:!pr-2">
          <div
            ref={gridRef}
            className={cn(
              GRID_CLASS,
              "grid-cols-[var(--toolbox-expanded-columns,minmax(386px,0.51fr)_minmax(0,1fr)_minmax(150px,0.18fr))]"
            )}
          >
            <div
              aria-label="编辑区"
              className="toolbox-edit-region flex min-h-0 min-w-[386px] max-lg:min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:z-[25]"
            >
              {editor}
            </div>
            <div
              aria-label="预览区"
              className="toolbox-preview-region min-h-0 min-w-0 lg:col-start-2 lg:row-start-1 lg:z-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
            >
              {preview}
            </div>
            <div
              aria-label="最近任务"
              className="toolbox-queue-region min-h-0 min-w-[150px] max-lg:min-w-0 lg:col-start-3 lg:row-start-1 lg:z-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
            >
              {queue}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

'''
s = s[:old_start] + new + s[old_end:]
s = s.replace(
    'import { cn } from "@/lib/cn";',
    'import { cn } from "@/lib/cn";\nimport { WorkspaceShell } from "@/components/features/WorkspaceShell";'
)
io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
