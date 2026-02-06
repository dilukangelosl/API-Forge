import { NavLink, Outlet } from "react-router-dom";
import { Book, AppWindow, Terminal, Settings, Zap } from "lucide-react";

const navItems = [
    { path: "/docs", label: "Documentation", icon: Book },
    { path: "/apps", label: "Applications", icon: AppWindow },
    { path: "/console", label: "API Console", icon: Terminal },
    { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout() {
    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc]">
            {/* Header - Clean White */}
            <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#0f172a]">
                                API Forge
                            </h1>
                            <p className="text-xs text-[#64748b]">Developer Portal</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <NavLink
                                key={path}
                                to={path}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive
                                            ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                            : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
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

            {/* Footer - Minimal */}
            <footer className="border-t border-[#e2e8f0] py-6 text-center text-sm text-[#94a3b8] bg-white">
                Powered by API Forge
            </footer>
        </div>
    );
}
