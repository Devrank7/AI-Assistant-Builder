// src/app/dashboard/playground/[clientId]/layout.tsx

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  // Pass-through: the page component renders a fixed overlay that covers the sidebar
  return <>{children}</>;
}
