package idol.aurora.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request.getUrl() == null || !HOST.equals(request.getUrl().getHost())) {
                    return null;
                }
                String path = request.getUrl().getPath();
                if (path == null || path.equals("/") || path.isEmpty()) {
                    path = "index.html";
                } else if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                if (path.contains("..")) {
                    return null;
                }
                try {
                    InputStream input = getAssets().open(path);
                    return new WebResourceResponse(mime(path), isText(path) ? "utf-8" : null, input);
                } catch (IOException missing) {
                    return null;
                }
            }
        });
        webView.loadUrl("https://" + HOST + "/index.html");
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private static boolean isText(String path) {
        String lower = path.toLowerCase();
        return lower.endsWith(".html") || lower.endsWith(".css") || lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".json") || lower.endsWith(".svg");
    }

    private static String mime(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }
}
