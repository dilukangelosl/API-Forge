import { useState, useEffect } from "react";
import { Play, Loader2, ChevronDown, Copy, Check, AlertCircle } from "lucide-react";

interface Endpoint {
    method: string;
    path: string;
    label: string;
}

const defaultEndpoints: Endpoint[] = [
    { method: "GET", path: "/api/v1/users", label: "List Users" },
    { method: "GET", path: "/api/v1/users/:id", label: "Get User" },
    { method: "POST", path: "/api/v1/users", label: "Create User" },
    { method: "GET", path: "/api/v1/products", label: "List Products" },
];

const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ConsolePage() {
    const [endpoints, setEndpoints] = useState<Endpoint[]>(defaultEndpoints);
    const [selectedEndpoint, setSelectedEndpoint] = useState(defaultEndpoints[0]);
    const [token, setToken] = useState("");
    const [pathParams, setPathParams] = useState<Record<string, string>>({});
    const [requestBody, setRequestBody] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [responseStatus, setResponseStatus] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch endpoints from API
        fetch("/portal/api/endpoints")
            .then((res) => res.json())
            .then((data) => {
                if (data.endpoints?.length) {
                    const eps = data.endpoints.map((e: { method: string; path: string; description: string }) => ({
                        method: e.method,
                        path: e.path,
                        label: e.description,
                    }));
                    setEndpoints(eps);
                    setSelectedEndpoint(eps[0]);
                }
            })
            .catch(console.error);
    }, []);

    const extractPathParams = (path: string): string[] => {
        const matches = path.match(/:([a-zA-Z_]+)/g);
        return matches ? matches.map((m) => m.slice(1)) : [];
    };

    const params = extractPathParams(selectedEndpoint.path);

    const buildPath = () => {
        let path = selectedEndpoint.path;
        for (const [key, value] of Object.entries(pathParams)) {
            path = path.replace(`:${key}`, value || `:${key}`);
        }
        return path;
    };

    const executeRequest = async () => {
        // Require token for authenticated endpoints
        if (!token.trim()) {
            setError("Access token is required. Get a token by calling POST /oauth/token with your client credentials.");
            return;
        }

        setLoading(true);
        setResponse(null);
        setResponseStatus(null);
        setError(null);

        try {
            const url = `http://localhost:3000${buildPath()}`;
            const headers: Record<string, string> = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const options: RequestInit = {
                method: selectedEndpoint.method,
                headers,
            };

            if (["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) && requestBody.trim()) {
                try {
                    JSON.parse(requestBody); // Validate JSON
                    options.body = requestBody;
                } catch {
                    setError("Invalid JSON in request body");
                    setLoading(false);
                    return;
                }
            }

            const res = await fetch(url, options);
            setResponseStatus(res.status);

            const contentType = res.headers.get("content-type");
            let body: unknown;
            
            if (contentType?.includes("application/json")) {
                body = await res.json();
            } else {
                body = await res.text();
            }

            // Build response object with headers
            const responseObj = {
                status: res.status,
                statusText: res.statusText,
                headers: {
                    "x-ratelimit-limit": res.headers.get("x-ratelimit-limit") ?? undefined,
                    "x-ratelimit-remaining": res.headers.get("x-ratelimit-remaining") ?? undefined,
                },
                body,
            };

            setResponse(JSON.stringify(responseObj, null, 2));
        } catch (err) {
            setError(`Request failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    const copyResponse = () => {
        if (response) {
            navigator.clipboard.writeText(response);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getStatusColor = () => {
        if (!responseStatus) return "";
        if (responseStatus >= 200 && responseStatus < 300) return "text-emerald-400";
        if (responseStatus >= 400 && responseStatus < 500) return "text-amber-400";
        return "text-red-400";
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">API Console</h1>
                <p className="text-slate-400">
                    Test API endpoints interactively with your credentials
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Panel */}
                <div className="glass rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Request</h2>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-400">{error}</span>
                        </div>
                    )}

                    {/* Endpoint Selector */}
                    <div className="mb-4">
                        <label className="block text-sm text-slate-400 mb-2">Endpoint</label>
                        <div className="relative">
                            <select
                                value={`${selectedEndpoint.method} ${selectedEndpoint.path}`}
                                onChange={(e) => {
                                    const [method, ...pathParts] = e.target.value.split(" ");
                                    const path = pathParts.join(" ");
                                    const endpoint = endpoints.find(
                                        (ep) => ep.method === method && ep.path === path
                                    );
                                    if (endpoint) {
                                        setSelectedEndpoint(endpoint);
                                        setPathParams({});
                                    }
                                }}
                                className="w-full appearance-none px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            >
                                {endpoints.map((ep) => (
                                    <option
                                        key={`${ep.method} ${ep.path}`}
                                        value={`${ep.method} ${ep.path}`}
                                    >
                                        {ep.method} {ep.path} - {ep.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Method Badge + Full URL */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-slate-950 rounded-lg">
                        <span
                            className={`px-2 py-1 rounded text-xs font-bold border ${
                                methodColors[selectedEndpoint.method]
                            }`}
                        >
                            {selectedEndpoint.method}
                        </span>
                        <code className="text-sm text-slate-300 font-mono flex-1 overflow-x-auto">
                            http://localhost:3000{buildPath()}
                        </code>
                    </div>

                    {/* Access Token */}
                    <div className="mb-4">
                        <label className="block text-sm text-slate-400 mb-2">
                            Access Token (Bearer) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => {
                                setToken(e.target.value);
                                setError(null);
                            }}
                            placeholder="Paste your access token here..."
                            className={`w-full px-4 py-3 rounded-lg bg-slate-900 border text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                error && !token ? "border-red-500" : "border-slate-700"
                            }`}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Get a token: <code className="text-slate-400">curl -X POST http://localhost:3000/oauth/token -d "grant_type=client_credentials&client_id=...&client_secret=..."</code>
                        </p>
                    </div>

                    {/* Path Parameters */}
                    {params.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm text-slate-400 mb-2">
                                Path Parameters
                            </label>
                            <div className="space-y-2">
                                {params.map((param) => (
                                    <div key={param} className="flex items-center gap-2">
                                        <span className="text-sm text-slate-300 w-20 font-mono">
                                            :{param}
                                        </span>
                                        <input
                                            type="text"
                                            value={pathParams[param] || ""}
                                            onChange={(e) =>
                                                setPathParams((prev) => ({
                                                    ...prev,
                                                    [param]: e.target.value,
                                                }))
                                            }
                                            placeholder={`Enter ${param}...`}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Request Body */}
                    {["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) && (
                        <div className="mb-4">
                            <label className="block text-sm text-slate-400 mb-2">
                                Request Body (JSON)
                            </label>
                            <textarea
                                value={requestBody}
                                onChange={(e) => setRequestBody(e.target.value)}
                                placeholder={'{"name": "John", "email": "john@example.com"}'}
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    )}

                    {/* Execute Button */}
                    <button
                        onClick={executeRequest}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                Send Request
                            </>
                        )}
                    </button>
                </div>

                {/* Response Panel */}
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">Response</h2>
                            {responseStatus && (
                                <span className={`text-sm font-mono ${getStatusColor()}`}>
                                    {responseStatus}
                                </span>
                            )}
                        </div>
                        {response && (
                            <button
                                onClick={copyResponse}
                                className="flex items-center gap-1 px-2 py-1 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" />
                                        Copy
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="bg-slate-950 rounded-lg p-4 min-h-[400px] overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                Loading...
                            </div>
                        ) : response ? (
                            <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                                {response}
                            </pre>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                Click "Send Request" to see the response
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
