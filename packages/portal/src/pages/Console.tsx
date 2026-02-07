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
    GET: "bg-emerald-100 text-emerald-700 border-emerald-200",
    POST: "bg-blue-100 text-blue-700 border-blue-200",
    PUT: "bg-amber-100 text-amber-700 border-amber-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
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
        if (!token) {
            setError("Access token is required");
            return;
        }
        setError(null);
        setLoading(true);
        setResponse(null);
        setResponseStatus(null);

        try {
            const options: RequestInit = {
                method: selectedEndpoint.method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            };

            if (["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) && requestBody) {
                try {
                    options.body = JSON.stringify(JSON.parse(requestBody));
                } catch {
                    setError("Invalid JSON in request body");
                    setLoading(false);
                    return;
                }
            }

            const res = await fetch(`http://localhost:3000${buildPath()}`, options);
            setResponseStatus(res.status);
            const data = await res.json();
            setResponse(JSON.stringify(data, null, 2));
        } catch (err) {
            setResponse(JSON.stringify({ error: "Request failed", details: String(err) }, null, 2));
            setResponseStatus(500);
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
        if (responseStatus >= 200 && responseStatus < 300) return "text-emerald-600";
        if (responseStatus >= 400) return "text-red-600";
        return "text-amber-600";
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">API Console</h1>
                <p className="text-slate-500">
                    Test API endpoints with your OAuth token
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Panel */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Request</h2>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-700">{error}</span>
                        </div>
                    )}

                    {/* Endpoint Selector */}
                    <div className="mb-4">
                        <label className="block text-sm text-slate-500 mb-2">Endpoint</label>
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
                                className="w-full appearance-none px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
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
                    <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span
                            className={`px-2 py-1 rounded text-xs font-bold border ${
                                methodColors[selectedEndpoint.method]
                            }`}
                        >
                            {selectedEndpoint.method}
                        </span>
                        <code className="text-sm text-slate-700 font-mono flex-1 overflow-x-auto">
                            http://localhost:3000{buildPath()}
                        </code>
                    </div>

                    {/* Access Token */}
                    <div className="mb-4">
                        <label className="block text-sm text-slate-500 mb-2">
                            Access Token (Bearer) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => {
                                setToken(e.target.value);
                                setError(null);
                            }}
                            placeholder="Paste your access token here..."
                            className={`w-full px-4 py-3 rounded-lg bg-white border text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                error && !token ? "border-red-300" : "border-slate-200"
                            }`}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Get a token: <code className="text-slate-500">curl -X POST http://localhost:3000/oauth/token ...</code>
                        </p>
                    </div>

                    {/* Path Parameters */}
                    {params.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm text-slate-500 mb-2">
                                Path Parameters
                            </label>
                            <div className="space-y-2">
                                {params.map((param) => (
                                    <div key={param} className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600 w-20 font-mono">
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
                                            className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Request Body */}
                    {["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) && (
                        <div className="mb-4">
                            <label className="block text-sm text-slate-500 mb-2">
                                Request Body (JSON)
                            </label>
                            <textarea
                                value={requestBody}
                                onChange={(e) => setRequestBody(e.target.value)}
                                placeholder={'{"name": "John", "email": "john@example.com"}'}
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">Response</h2>
                            {responseStatus && (
                                <span className={`text-sm font-mono ${getStatusColor()}`}>
                                    {responseStatus}
                                </span>
                            )}
                        </div>
                        {response && (
                            <button
                                onClick={copyResponse}
                                className="flex items-center gap-1 px-2 py-1 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        <span className="text-emerald-600">Copied</span>
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

                    <div className="bg-slate-900 rounded-lg p-4 min-h-[400px] overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                Loading...
                            </div>
                        ) : response ? (
                            <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                                {response}
                            </pre>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                Click "Send Request" to see the response
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
