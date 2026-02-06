import { useState, useEffect } from "react";
import { Search, ChevronRight, Copy, Check, Code2, Loader2 } from "lucide-react";

interface Endpoint {
    method: string;
    path: string;
    description: string;
    scopes?: string[];
}

const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    PATCH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function DocsPage() {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchEndpoints();
    }, []);

    const fetchEndpoints = async () => {
        try {
            const res = await fetch("/portal/api/endpoints");
            const data = await res.json();
            setEndpoints(data.endpoints || []);
            if (data.endpoints?.length > 0) {
                setSelectedEndpoint(data.endpoints[0]);
            }
        } catch (err) {
            console.error("Failed to fetch endpoints:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredEndpoints = endpoints.filter(
        (e) =>
            e.path.toLowerCase().includes(search.toLowerCase()) ||
            e.description.toLowerCase().includes(search.toLowerCase())
    );

    const copyCode = () => {
        if (!selectedEndpoint) return;
        const code = `curl -X ${selectedEndpoint.method} "http://localhost:3000${selectedEndpoint.path}" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"`;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search endpoints..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredEndpoints.map((endpoint, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedEndpoint(endpoint)}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${
                                selectedEndpoint?.path === endpoint.path ? "bg-slate-800/70" : ""
                            }`}
                        >
                            <span
                                className={`px-2 py-0.5 text-xs font-mono font-medium rounded border ${
                                    methodColors[endpoint.method]
                                }`}
                            >
                                {endpoint.method}
                            </span>
                            <span className="flex-1 text-left text-sm font-mono text-slate-300 truncate">
                                {endpoint.path}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {selectedEndpoint && (
                    <>
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <span
                                    className={`px-3 py-1 text-sm font-mono font-medium rounded border ${
                                        methodColors[selectedEndpoint.method]
                                    }`}
                                >
                                    {selectedEndpoint.method}
                                </span>
                                <code className="text-xl font-mono">
                                    {selectedEndpoint.path}
                                </code>
                            </div>
                            <p className="text-slate-400">{selectedEndpoint.description}</p>
                        </div>

                        {selectedEndpoint.scopes && selectedEndpoint.scopes.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                                    Required Scopes
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedEndpoint.scopes.map((scope) => (
                                        <span
                                            key={scope}
                                            className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm"
                                        >
                                            {scope}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                                    Example Request
                                </h3>
                                <button
                                    onClick={copyCode}
                                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                    <Code2 className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs text-slate-500 font-mono">curl</span>
                                </div>
                                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-6 pt-10 overflow-x-auto">
                                    <code className="text-sm text-slate-300 font-mono">
                                        {`curl -X ${selectedEndpoint.method} "http://localhost:3000${selectedEndpoint.path}" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"`}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
