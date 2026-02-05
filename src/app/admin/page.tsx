import ClientList from '@/components/ClientList';
import Link from 'next/link';

export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-gradient-animated">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-0 border-b border-white/10 rounded-none">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center">
                                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold gradient-text">AI Widget Admin</h1>
                                <p className="text-xs text-gray-400">Widget Management Dashboard</p>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/admin" className="text-[var(--neon-cyan)] font-medium">Dashboard</Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">Settings</Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</Link>
                        </nav>

                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                Logout
                            </Link>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-pink)] flex items-center justify-center text-xs font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Client <span className="gradient-text">Dashboard</span>
                    </h2>
                    <p className="text-gray-400">
                        Manage and monitor all your widget clients from one place
                    </p>
                </div>

                {/* Client List */}
                <ClientList />
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-16">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]" />
                            <span className="text-sm text-gray-400">AI Widget Admin</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            © {new Date().getFullYear()} All rights reserved
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
