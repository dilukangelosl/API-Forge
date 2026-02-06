import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import { Layout } from "./components/Layout";
import { DocsPage } from "./pages/Docs";
import { AppsPage } from "./pages/Apps";
import { ConsolePage } from "./pages/Console";
import { SettingsPage } from "./pages/Settings";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename="/portal">
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<DocsPage />} />
                        <Route path="docs" element={<DocsPage />} />
                        <Route path="apps" element={<AppsPage />} />
                        <Route path="console" element={<ConsolePage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
);
