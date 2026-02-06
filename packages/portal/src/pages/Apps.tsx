import { useState } from "react";
import { Plus, Key, Eye, EyeOff, Trash2, Copy, Check, Calendar } from "lucide-react";

interface OAuthApp {
    id: string;
    name: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    createdAt: string;
}

const mockApps: OAuthApp[] = [
    {
        id: "1",
        name: "Mobile App",
        clientId: "af_cli_abc123xyz789",
        clientSecret: "af_sec_supersecretkey12345",
        scopes: ["read:users", "write:users"],
        createdAt: "2024-01-15",
    },
    {
        id: "2",
        name: "Backend Service",
        clientId: "af_cli_def456uvw321",
        clientSecret: "af_sec_anothersecretkey67890",
        scopes: ["read:products", "admin"],
        createdAt: "2024-02-20",
    },
];

export function AppsPage() {
    const [apps] = useState<OAuthApp[]>(mockApps);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const toggleSecret = (id: string) => {
        setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Applications</h1>
                    <p className="text-slate-400">
                        Manage your OAuth 2.0 applications and credentials
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                    <Plus className="w-4 h-4" />
                    Create App
                </button>
            </div>

            {/* Apps List */}
            <div className="space-y-6">
                {apps.map((app) => (
                    <div key={app.id} className="glass rounded-xl overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                                        <Key className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">{app.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            Created {app.createdAt}
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Credentials */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-lg">
                                    <span className="text-sm text-slate-400 w-24">Client ID</span>
                                    <code className="flex-1 text-sm text-slate-200 font-mono">
                                        {app.clientId}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(app.clientId, `${app.id}-id`)}
                                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    >
                                        {copied === `${app.id}-id` ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-lg">
                                    <span className="text-sm text-slate-400 w-24">Secret</span>
                                    <code className="flex-1 text-sm text-slate-200 font-mono">
                                        {showSecrets[app.id]
                                            ? app.clientSecret
                                            : "••••••••••••••••••••••••"}
                                    </code>
                                    <button
                                        onClick={() => toggleSecret(app.id)}
                                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    >
                                        {showSecrets[app.id] ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(app.clientSecret, `${app.id}-secret`)
                                        }
                                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    >
                                        {copied === `${app.id}-secret` ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Scopes */}
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-sm text-slate-400">Scopes:</span>
                                {app.scopes.map((scope) => (
                                    <span
                                        key={scope}
                                        className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300"
                                    >
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {apps.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        <Key className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
                    <p className="text-slate-400 mb-6">
                        Create your first OAuth 2.0 application to get started.
                    </p>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                        Create App
                    </button>
                </div>
            )}
        </div>
    );
}
