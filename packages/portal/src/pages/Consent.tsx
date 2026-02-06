import { useState, useEffect } from "react";
import { Check, X, Shield, Loader2 } from "lucide-react";

interface ClientInfo {
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
}

interface ScopeInfo {
    name: string;
    description: string;
}

export function ConsentPage() {
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [scopes, setScopes] = useState<ScopeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get authorization params from URL
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client_id");
    const redirectUri = params.get("redirect_uri");
    const scopeParam = params.get("scope");
    const state = params.get("state");
    const codeChallenge = params.get("code_challenge");
    const codeChallengeMethod = params.get("code_challenge_method");

    useEffect(() => {
        if (!clientId) {
            setError("Missing client_id parameter");
            setLoading(false);
            return;
        }

        fetchClientInfo();
    }, [clientId]);

    const fetchClientInfo = async () => {
        try {
            // Fetch client info
            const clientRes = await fetch(`/portal/api/client?client_id=${clientId}`);
            if (!clientRes.ok) {
                throw new Error("Unknown application");
            }
            const clientData = await clientRes.json();
            setClient(clientData);

            // Fetch scope descriptions
            const scopesRes = await fetch("/portal/api/scopes");
            const scopesData = await scopesRes.json();
            const requestedScopes = scopeParam?.split(" ").filter(Boolean) ?? [];
            const scopeInfos = requestedScopes.map((name) => {
                const found = scopesData.scopes?.find((s: ScopeInfo) => s.name === name);
                return found ?? { name, description: name };
            });
            setScopes(scopeInfos);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load application info");
        } finally {
            setLoading(false);
        }
    };

    const handleAllow = async () => {
        if (!clientId || !redirectUri) return;

        setSubmitting(true);
        try {
            const res = await fetch("/portal/api/authorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    scope: scopeParam,
                    state,
                    code_challenge: codeChallenge,
                    code_challenge_method: codeChallengeMethod,
                    approved: true,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error_description || "Authorization failed");
            }

            const data = await res.json();
            // Redirect to callback URL
            window.location.href = data.redirect_url;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authorization failed");
            setSubmitting(false);
        }
    };

    const handleDeny = async () => {
        if (!redirectUri) return;

        // Redirect with access_denied error
        const url = new URL(redirectUri);
        url.searchParams.set("error", "access_denied");
        url.searchParams.set("error_description", "The user denied the authorization request");
        if (state) url.searchParams.set("state", state);
        window.location.href = url.toString();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="glass rounded-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-semibold mb-2">Authorization Error</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="glass rounded-xl p-8 max-w-md w-full">
                {/* App Info */}
                <div className="text-center mb-6">
                    {client?.logoUrl ? (
                        <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="w-16 h-16 mx-auto rounded-xl mb-4"
                        />
                    ) : (
                        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/30 flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8 text-blue-400" />
                        </div>
                    )}
                    <h1 className="text-xl font-semibold mb-1">Authorize {client?.name}</h1>
                    <p className="text-sm text-slate-400">
                        This application wants to access your account
                    </p>
                </div>

                {/* Scopes */}
                <div className="mb-6">
                    <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                        Permissions Requested
                    </h2>
                    <div className="space-y-2">
                        {scopes.map((scope) => (
                            <div
                                key={scope.name}
                                className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg"
                            >
                                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-sm font-medium text-slate-200">
                                        {scope.name}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {scope.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDeny}
                        disabled={submitting}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Deny
                    </button>
                    <button
                        onClick={handleAllow}
                        disabled={submitting}
                        className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Authorizing...
                            </>
                        ) : (
                            "Allow"
                        )}
                    </button>
                </div>

                {/* Footer */}
                <p className="text-xs text-slate-500 text-center mt-6">
                    By clicking Allow, you authorize this application to access your data
                    according to its terms of service.
                </p>
            </div>
        </div>
    );
}
