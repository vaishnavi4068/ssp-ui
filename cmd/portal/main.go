// Portal static server: serves the Vite build and SPA fallback (replaces nginx in the image).
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	addr := env("PORTAL_LISTEN", ":8080")
	root := env("PORTAL_ROOT", "/usr/share/nginx/html")
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","runtime":"go"}`))
	})
	mux.Handle("/", spaHandler(root))
	log.Printf("ssp-ui portal listening on %s root=%s", addr, root)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func spaHandler(root string) http.Handler {
	fs := http.FileServer(http.Dir(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || !strings.Contains(strings.TrimPrefix(r.URL.Path, "/"), ".") {
			if _, err := os.Stat(filepath.Join(root, "index.html")); err == nil {
				http.ServeFile(w, r, filepath.Join(root, "index.html"))
				return
			}
		}
		path := filepath.Join(root, filepath.Clean("/"+r.URL.Path))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(root, "index.html"))
	})
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
