import { useState } from "react";
import { Save, Palette, Bell, Shield, Check } from "lucide-react";

export function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState({
        darkMode: true,
        notifications: true,
        twoFactor: false,
        apiLogging: true,
    });

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-slate-400">Manage your developer portal preferences</p>
            </div>

            <div className="space-y-6">
                {/* Appearance */}
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            <Palette className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Appearance</h3>
                            <p className="text-sm text-slate-400">
                                Customize how the portal looks
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-slate-800">
                        <div>
                            <p className="text-sm font-medium">Dark Mode</p>
                            <p className="text-xs text-slate-400">
                                Use dark theme for the portal
                            </p>
                        </div>
                        <button
                            onClick={() => toggleSetting("darkMode")}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                settings.darkMode ? "bg-blue-500" : "bg-slate-700"
                            }`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    settings.darkMode ? "translate-x-6" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Notifications</h3>
                            <p className="text-sm text-slate-400">
                                Manage notification preferences
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-slate-800">
                        <div>
                            <p className="text-sm font-medium">Email Notifications</p>
                            <p className="text-xs text-slate-400">
                                Receive updates about your API usage
                            </p>
                        </div>
                        <button
                            onClick={() => toggleSetting("notifications")}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                settings.notifications ? "bg-blue-500" : "bg-slate-700"
                            }`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    settings.notifications ? "translate-x-6" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Security */}
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Security</h3>
                            <p className="text-sm text-slate-400">
                                Protect your account and applications
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 border-t border-slate-800 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Two-Factor Auth</p>
                                <p className="text-xs text-slate-400">
                                    Add extra security to your account
                                </p>
                            </div>
                            <button
                                onClick={() => toggleSetting("twoFactor")}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    settings.twoFactor ? "bg-blue-500" : "bg-slate-700"
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                        settings.twoFactor ? "translate-x-6" : ""
                                    }`}
                                />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">API Request Logging</p>
                                <p className="text-xs text-slate-400">
                                    Log all API requests for debugging
                                </p>
                            </div>
                            <button
                                onClick={() => toggleSetting("apiLogging")}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    settings.apiLogging ? "bg-blue-500" : "bg-slate-700"
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                        settings.apiLogging ? "translate-x-6" : ""
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                        saved
                            ? "bg-emerald-500 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                >
                    {saved ? (
                        <>
                            <Check className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
