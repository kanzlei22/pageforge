#!/usr/bin/env python3
"""
PageForge - Development Server
Serves files with no-cache headers to prevent stale JS/CSS.
"""
import http.server
import os
import sys
import webbrowser
import threading

PORT = 8420

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Quieter logging - only show errors and page loads
        if args and (str(args[0]).endswith('.js') or str(args[0]).endswith('.css')):
            return  # Skip asset logs
        super().log_message(format, *args)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print()
    print("  ⚒️  PageForge - HTML Page Designer")
    print("  ──────────────────────────────────")
    print(f"  http://localhost:{PORT}")
    print("  Cache: DEAKTIVIERT (frische Dateien bei jedem Laden)")
    print("  Ctrl+C zum Beenden")
    print()

    server = http.server.HTTPServer(('', PORT), NoCacheHandler)
    
    # Browser automatisch öffnen
    def open_browser():
        webbrowser.open(f'http://localhost:{PORT}')
    threading.Timer(1.0, open_browser).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server gestoppt.")
        server.server_close()
