import { NavLink, Outlet } from "react-router-dom";
import { Book, AppWindow, Terminal, Settings, Zap } from "lucide-react";

const navItems = [
    { path: "/docs", label: "Documentation", icon: Book },
    { path: "/apps", label: "My Apps", icon: AppWindow },
    { path: "/console", label: "API Console", icon: Terminal },
    { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="glass border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center glow">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                API Forge
                            </h1>
                            <p className="text-xs text-slate-400">Developer Portal</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <NavLink
                                key={path}
                                to={path}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isActive
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
                Powered by API Forge • Built with ❤️
            </footer>
        </div>
    );
}
