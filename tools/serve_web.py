"""Serve the local WebHID UI from a secure localhost origin."""

from __future__ import annotations

import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
HOST = "127.0.0.1"
PORT = 8765


class QuietHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        print(f"[web] {args[0]}")


def main() -> None:
    handler = partial(QuietHandler, directory=str(WEB))
    server = ThreadingHTTPServer((HOST, PORT), handler)
    url = f"http://localhost:{PORT}/"
    print(f"Phantom Device Studio is running at {url}")
    print("Leave this window open while using the WebHID controls. Press Ctrl+C to stop.")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local web server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
