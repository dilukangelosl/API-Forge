interface ScalarUIOptions {
    specUrl: string;
    title: string;
}

/**
 * Generate Scalar API documentation UI HTML
 * Scalar provides a modern, interactive API documentation experience
 */
export function getScalarUI(options: ScalarUIOptions): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <script id="api-reference" data-url="${options.specUrl}"></script>
    <script>
        var configuration = {
            theme: 'default',
            layout: 'modern',
            showSidebar: true,
            hideDownloadButton: false,
            hideModels: false,
            hideDarkModeToggle: false,
        };
        document.getElementById('api-reference').dataset.configuration = JSON.stringify(configuration);
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
}

/**
 * Alternative: Swagger UI (heavier but more features)
 */
export function getSwaggerUI(options: ScalarUIOptions): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "${options.specUrl}",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;
}
