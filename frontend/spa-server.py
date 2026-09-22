import http.server
import os
import sys

DIRECTORY = sys.argv[1] if len(sys.argv) > 1 else "."
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 4200


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path.split("?")[0])
        if not os.path.isfile(path):
            self.path = "/index.html"
        return super().do_GET()


http.server.test(HandlerClass=SpaHandler, port=PORT)
