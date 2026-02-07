import { useState, useEffect } from "react";
import { Search, ChevronRight, Copy, Check, Code2, Loader2 } from "lucide-react";

interface Endpoint {
    method: string;
    path: string;
    description: string;
    scopes?: string[];
}

const methodColors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700 border-emerald-200",
    POST: "bg-blue-100 text-blue-700 border-blue-200",
    PUT: "bg-amber-100 text-amber-700 border-amber-200",
    PATCH: "bg-orange-100 text-orange-700 border-orange-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
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
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search endpoints..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredEndpoints.map((endpoint, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedEndpoint(endpoint)}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                                selectedEndpoint?.path === endpoint.path ? "bg-slate-100" : ""
                            }`}
                        >
                            <span
                                className={`px-2 py-0.5 text-xs font-mono font-medium rounded border ${
                                    methodColors[endpoint.method]
                                }`}
                            >
                                {endpoint.method}
                            </span>
                            <span className="flex-1 text-left text-sm font-mono text-slate-600 truncate">
                                {endpoint.path}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
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
                                <code className="text-xl font-mono text-slate-900">
                                    {selectedEndpoint.path}
                                </code>
                            </div>
                            <p className="text-slate-500">{selectedEndpoint.description}</p>
                        </div>

                        {selectedEndpoint.scopes && selectedEndpoint.scopes.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                    Required Scopes
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedEndpoint.scopes.map((scope) => (
                                        <span
                                            key={scope}
                                            className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm"
                                        >
                                            {scope}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                                    Example Request
                                </h3>
                                <button
                                    onClick={copyCode}
                                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3 h-3 text-emerald-500" />
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
                                    <Code2 className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs text-slate-400 font-mono">curl</span>
                                </div>
                                <pre className="bg-slate-900 border border-slate-200 rounded-xl p-6 pt-10 overflow-x-auto">
                                    <code className="text-sm text-slate-100 font-mono">
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
