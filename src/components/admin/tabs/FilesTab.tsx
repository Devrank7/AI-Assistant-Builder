'use client';

interface FilesTabProps {
  files: string[];
  folderPath: string;
}

export default function FilesTab({ files, folderPath }: FilesTabProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Widget Files</h3>
      <div className="space-y-2">
        {files.length > 0 ? (
          files.map((file) => (
            <div
              key={file}
              className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="font-mono text-sm text-gray-300">{file}</span>
              </div>
              <a
                href={`/widgets/${folderPath}/${file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--neon-cyan)] hover:underline"
              >
                View
              </a>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-gray-400">No files found</p>
        )}
      </div>
    </div>
  );
}
