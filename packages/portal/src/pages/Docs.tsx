import { useState } from "react";
import { Search, ChevronRight, Copy, Check, Code2 } from "lucide-react";

const endpoints = [
    {
        method: "GET",
        path: "/api/v1/users",
        description: "List all users",
        scopes: ["read:users"],
    },
    {
        method: "GET",
        path: "/api/v1/users/:id",
        description: "Get user by ID",
        scopes: ["read:users"],
    },
    {
        method: "POST",
        path: "/api/v1/users",
        description: "Create a new user",
        scopes: ["write:users"],
    },
    {
        method: "GET",
        path: "/api/v1/products",
        description: "List all products",
        scopes: ["read:products"],
    },
];

const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400",
    POST: "bg-blue-500/20 text-blue-400",
    PUT: "bg-amber-500/20 text-amber-400",
    DELETE: "bg-red-500/20 text-red-400",
    PATCH: "bg-purple-500/20 text-purple-400",
};

export function DocsPage() {
    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    const filteredEndpoints = endpoints.filter(
        (e) =>
            e.path.toLowerCase().includes(search.toLowerCase()) ||
            e.description.toLowerCase().includes(search.toLowerCase())
    );

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Hero */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                    API Documentation
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Explore our REST API endpoints. All endpoints require OAuth 2.0 authentication
                    with appropriate scopes.
                </p>
            </div>

            {/* Search */}
            <div className="max-w-xl mx-auto mb-12">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search endpoints..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-4">
                {filteredEndpoints.map((endpoint, i) => (
                    <div
                        key={i}
                        className="glass rounded-xl p-6 hover:border-slate-700 transition-all group"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <span
                                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                        methodColors[endpoint.method]
                                    }`}
                                >
                                    {endpoint.method}
                                </span>
                                <div>
                                    <code className="text-slate-100 font-mono text-sm">
                                        {endpoint.path}
                                    </code>
                                    <p className="text-slate-400 mt-1 text-sm">
                                        {endpoint.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {endpoint.scopes.map((scope) => (
                                            <span
                                                key={scope}
                                                className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400"
                                            >
                                                {scope}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => copyToClipboard(endpoint.path)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                    title="Copy path"
                                >
                                    {copied === endpoint.path ? (
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Code Example */}
            <div className="mt-12 glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Code2 className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold">Quick Start</h3>
                </div>
                <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto text-sm">
                    <code className="text-slate-300">
{`# Get an access token
curl -X POST http://localhost:3000/oauth/token \\
  -d "grant_type=client_credentials" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_SECRET" \\
  -d "scope=read:users"

# Call an API endpoint
curl http://localhost:3000/api/v1/users \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
                    </code>
                </pre>
            </div>
        </div>
    );
}
