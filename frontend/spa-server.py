import http.server
import os
import posixpath
import sys
import urllib.parse

DIRECTORY = sys.argv[1] if len(sys.argv) > 1 else "."
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 4200
TILES_DIR = sys.argv[3] if len(sys.argv) > 3 else None


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        if not self.path.startswith("/tiles/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        clean = posixpath.normpath(urllib.parse.unquote(path.split("?")[0].split("#")[0]))
        if TILES_DIR and clean.startswith("/tiles/"):
            parts = [p for p in clean[len("/tiles/"):].split("/") if p not in ("", ".", "..")]
            return os.path.join(TILES_DIR, *parts)
        return super().translate_path(path)

    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            if self.path.startswith("/tiles/"):
                self.send_error(404)
                return
            self.path = "/index.html"
        return super().do_GET()


http.server.test(HandlerClass=SpaHandler, port=PORT)
