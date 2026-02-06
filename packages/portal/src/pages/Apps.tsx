import { useState, useEffect } from "react";
import { 
    Plus, Key, Trash2, Copy, Check, 
    Loader2, X, RefreshCw, ChevronRight,
    Globe, Shield, AlertTriangle, Settings2, Save
} from "lucide-react";

interface OAuthApp {
    id: string;
    name: string;
    clientId: string;
    clientSecret?: string;
    scopes: string[];
    redirectUris: string[];
    grantTypes: string[];
    isActive: boolean;
    createdAt: string;
}

interface Scope {
    name: string;
    description: string;
}

export function AppsPage() {
    const [apps, setApps] = useState<OAuthApp[]>([]);
    const [scopes, setScopes] = useState<Scope[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newApp, setNewApp] = useState({ name: "", scopes: [] as string[], redirectUri: "" });
    const [createdApp, setCreatedApp] = useState<OAuthApp | null>(null);
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [editingApp, setEditingApp] = useState<OAuthApp | null>(null);
    const [regeneratingSecret, setRegeneratingSecret] = useState<string | null>(null);
    const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);
    const [deletingApp, setDeletingApp] = useState<string | null>(null);
    const [newRedirectUri, setNewRedirectUri] = useState("");

    useEffect(() => {
        fetchApps();
        fetchScopes();
    }, []);

    const fetchApps = async () => {
        try {
            const res = await fetch("/portal/api/apps");
            const data = await res.json();
            setApps(data.apps || []);
        } catch (err) {
            setError("Failed to load applications");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchScopes = async () => {
        try {
            const res = await fetch("/portal/api/scopes");
            const data = await res.json();
            setScopes(data.scopes || []);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleScope = (scope: string) => {
        setNewApp((prev) => ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter((s) => s !== scope)
                : [...prev.scopes, scope],
        }));
    };

    const toggleEditScope = (scope: string) => {
        if (!editingApp) return;
        setEditingApp((prev) => prev ? ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter((s) => s !== scope)
                : [...prev.scopes, scope],
        }) : null);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const createApp = async () => {
        setCreating(true);
        try {
            const res = await fetch("/portal/api/apps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newApp),
            });
            const data = await res.json();
            setCreatedApp(data);
            fetchApps();
        } catch (err) {
            setError("Failed to create application");
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const updateApp = async (app: OAuthApp) => {
        try {
            const res = await fetch(`/portal/api/apps/${app.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: app.name,
                    scopes: app.scopes,
                    redirectUris: app.redirectUris,
                    isActive: app.isActive,
                }),
            });
            if (res.ok) {
                fetchApps();
                setEditingApp(null);
            }
        } catch (err) {
            setError("Failed to update application");
            console.error(err);
        }
    };

    const deleteApp = async (id: string) => {
        setDeletingApp(id);
        try {
            await fetch(`/portal/api/apps/${id}`, { method: "DELETE" });
            fetchApps();
            setExpandedApp(null);
        } catch (err) {
            setError("Failed to delete application");
            console.error(err);
        } finally {
            setDeletingApp(null);
        }
    };

    const regenerateSecret = async (id: string) => {
        setRegeneratingSecret(id);
        try {
            const res = await fetch(`/portal/api/apps/${id}/regenerate-secret`, {
                method: "POST",
            });
            const data = await res.json();
            setNewSecret({ id, secret: data.clientSecret });
        } catch (err) {
            setError("Failed to regenerate secret");
            console.error(err);
        } finally {
            setRegeneratingSecret(null);
        }
    };

    const addRedirectUri = () => {
        if (!editingApp || !newRedirectUri.trim()) return;
        setEditingApp({
            ...editingApp,
            redirectUris: [...editingApp.redirectUris, newRedirectUri.trim()],
        });
        setNewRedirectUri("");
    };

    const removeRedirectUri = (uri: string) => {
        if (!editingApp) return;
        setEditingApp({
            ...editingApp,
            redirectUris: editingApp.redirectUris.filter((u) => u !== uri),
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#0f172a]">Applications</h1>
                    <p className="text-[#64748b] mt-1">
                        Manage your OAuth 2.0 applications and credentials
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Application
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Apps List */}
            <div className="space-y-4">
                {apps.map((app) => (
                    <div key={app.id} className="card overflow-hidden">
                        {/* App Header */}
                        <div
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#f8fafc] transition-colors"
                            onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                    {app.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#0f172a]">{app.name}</h3>
                                    <p className="text-sm text-[#64748b] font-mono">{app.clientId}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`badge ${app.isActive ? 'badge-success' : 'badge-warning'}`}>
                                    {app.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <ChevronRight className={`w-5 h-5 text-[#94a3b8] transition-transform ${expandedApp === app.id ? 'rotate-90' : ''}`} />
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedApp === app.id && (
                            <div className="border-t border-[#e2e8f0] p-6 bg-[#f8fafc]">
                                {/* Credentials Section */}
                                <div className="mb-6">
                                    <h4 className="section-title flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Credentials
                                    </h4>
                                    <div className="grid gap-3">
                                        {/* Client ID */}
                                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e2e8f0]">
                                            <div>
                                                <span className="text-xs text-[#64748b] block mb-1">Client ID</span>
                                                <code className="text-sm font-mono text-[#0f172a]">{app.clientId}</code>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(app.clientId, `${app.id}-id`)}
                                                className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors"
                                            >
                                                {copied === `${app.id}-id` ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-[#64748b]" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Client Secret */}
                                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e2e8f0]">
                                            <div className="flex-1">
                                                <span className="text-xs text-[#64748b] block mb-1">Client Secret</span>
                                                {newSecret?.id === app.id ? (
                                                    <div>
                                                        <code className="text-sm font-mono text-[#0f172a]">{newSecret.secret}</code>
                                                        <p className="text-xs text-amber-600 mt-1">⚠️ Copy this now - it won't be shown again!</p>
                                                    </div>
                                                ) : (
                                                    <code className="text-sm font-mono text-[#64748b]">••••••••••••••••••••</code>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {newSecret?.id === app.id && (
                                                    <button
                                                        onClick={() => copyToClipboard(newSecret.secret, `${app.id}-secret`)}
                                                        className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors"
                                                    >
                                                        {copied === `${app.id}-secret` ? (
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-[#64748b]" />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => regenerateSecret(app.id)}
                                                    disabled={regeneratingSecret === app.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                >
                                                    {regeneratingSecret === app.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                    Regenerate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* OAuth Settings */}
                                <div className="mb-6">
                                    <h4 className="section-title flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        Redirect URIs
                                    </h4>
                                    {editingApp?.id === app.id ? (
                                        <div className="space-y-2">
                                            {editingApp.redirectUris.map((uri) => (
                                                <div key={uri} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#e2e8f0]">
                                                    <code className="flex-1 text-sm font-mono text-[#0f172a]">{uri}</code>
                                                    <button
                                                        onClick={() => removeRedirectUri(uri)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={newRedirectUri}
                                                    onChange={(e) => setNewRedirectUri(e.target.value)}
                                                    placeholder="https://example.com/callback"
                                                    className="input flex-1"
                                                />
                                                <button onClick={addRedirectUri} className="btn btn-secondary">
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {app.redirectUris?.length > 0 ? (
                                                app.redirectUris.map((uri) => (
                                                    <div key={uri} className="p-2 bg-white rounded-lg border border-[#e2e8f0]">
                                                        <code className="text-sm font-mono text-[#0f172a]">{uri}</code>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-[#64748b]">No redirect URIs configured</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Scopes */}
                                <div className="mb-6">
                                    <h4 className="section-title flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Permissions (Scopes)
                                    </h4>
                                    {editingApp?.id === app.id ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {scopes.map((scope) => (
                                                <label
                                                    key={scope.name}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e2e8f0] cursor-pointer hover:border-blue-300"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={editingApp.scopes.includes(scope.name)}
                                                        onChange={() => toggleEditScope(scope.name)}
                                                        className="w-4 h-4 rounded text-blue-500"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-[#0f172a]">{scope.name}</div>
                                                        <div className="text-xs text-[#64748b]">{scope.description}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {app.scopes?.map((scope) => (
                                                <span key={scope} className="scope-tag">{scope}</span>
                                            ))}
                                            {(!app.scopes || app.scopes.length === 0) && (
                                                <span className="text-sm text-[#64748b]">No scopes assigned</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0]">
                                    {editingApp?.id === app.id ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateApp(editingApp)}
                                                className="btn btn-primary flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => setEditingApp(null)}
                                                className="btn btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setEditingApp(app)}
                                            className="btn btn-secondary flex items-center gap-2"
                                        >
                                            <Settings2 className="w-4 h-4" />
                                            Edit Settings
                                        </button>
                                    )}
                                    
                                    {/* Danger Zone */}
                                    <button
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to delete "${app.name}"? This action cannot be undone.`)) {
                                                deleteApp(app.id);
                                            }
                                        }}
                                        disabled={deletingApp === app.id}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        {deletingApp === app.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        Delete Application
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {apps.length === 0 && !loading && (
                <div className="text-center py-16 card">
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#f1f5f9] flex items-center justify-center mb-4">
                        <Key className="w-8 h-8 text-[#94a3b8]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#0f172a] mb-2">No applications yet</h3>
                    <p className="text-[#64748b] mb-6">
                        Create your first OAuth 2.0 application to get started.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Application
                    </button>
                </div>
            )}

            {/* Create App Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
                            <h2 className="text-xl font-semibold text-[#0f172a]">
                                {createdApp ? "Application Created!" : "Create New Application"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreatedApp(null);
                                    setNewApp({ name: "", scopes: [], redirectUri: "" });
                                }}
                                className="p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {createdApp ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-700 font-medium">
                                            ✓ Your application has been created successfully
                                        </p>
                                    </div>

                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-700">
                                            ⚠️ Save these credentials now! The secret won't be shown again.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                                            <div className="text-xs text-[#64748b] mb-1">Client ID</div>
                                            <div className="flex items-center justify-between">
                                                <code className="text-sm font-mono text-[#0f172a]">
                                                    {createdApp.clientId}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(createdApp.clientId, "new-id")}
                                                    className="p-2 hover:bg-[#e2e8f0] rounded-lg transition-colors"
                                                >
                                                    {copied === "new-id" ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-[#64748b]" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                                            <div className="text-xs text-[#64748b] mb-1">Client Secret</div>
                                            <div className="flex items-center justify-between">
                                                <code className="text-sm font-mono text-[#0f172a]">
                                                    {createdApp.clientSecret}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(createdApp.clientSecret!, "new-secret")}
                                                    className="p-2 hover:bg-[#e2e8f0] rounded-lg transition-colors"
                                                >
                                                    {copied === "new-secret" ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-[#64748b]" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreatedApp(null);
                                            setNewApp({ name: "", scopes: [], redirectUri: "" });
                                        }}
                                        className="w-full btn btn-primary"
                                    >
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-[#0f172a] mb-2">
                                            Application Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newApp.name}
                                            onChange={(e) => setNewApp((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="My Awesome App"
                                            className="input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#0f172a] mb-2">
                                            Redirect URI
                                        </label>
                                        <input
                                            type="url"
                                            value={newApp.redirectUri}
                                            onChange={(e) => setNewApp((prev) => ({ ...prev, redirectUri: e.target.value }))}
                                            placeholder="https://myapp.com/callback"
                                            className="input"
                                        />
                                        <p className="text-xs text-[#64748b] mt-1">
                                            Where users will be redirected after authorization
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#0f172a] mb-2">
                                            Permissions
                                        </label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {scopes.map((scope) => (
                                                <label
                                                    key={scope.name}
                                                    className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-lg cursor-pointer hover:bg-[#f1f5f9] transition-colors border border-[#e2e8f0]"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newApp.scopes.includes(scope.name)}
                                                        onChange={() => toggleScope(scope.name)}
                                                        className="w-4 h-4 rounded text-blue-500"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-[#0f172a]">{scope.name}</div>
                                                        <div className="text-xs text-[#64748b]">{scope.description}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1 btn btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={createApp}
                                            disabled={!newApp.name.trim() || creating}
                                            className="flex-1 btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {creating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Application"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
