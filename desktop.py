"""
Desktop launcher for PO Helper using a local FastAPI server and pywebview.
"""
from __future__ import annotations

from dataclasses import dataclass
import threading
import socket
import time

import uvicorn
import webview

from main import app


@dataclass(frozen=True)
class ServerHandle:
    """Container for the Uvicorn server and its background thread."""
    server: uvicorn.Server
    thread: threading.Thread


def find_free_port() -> int:
    """Return an available localhost port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def start_server(port: int) -> ServerHandle:
    """Start the FastAPI server in a background thread."""
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    for _ in range(50):
        if server.started:
            break
        time.sleep(0.1)

    return ServerHandle(server=server, thread=thread)


def stop_server(handle: ServerHandle) -> None:
    """Signal the background server to stop."""
    handle.server.should_exit = True


def main() -> None:
    """Launch the desktop app window."""
    port = find_free_port()
    handle = start_server(port)
    url = f"http://127.0.0.1:{port}/"

    window = webview.create_window("PO Helper", url, width=1100, height=800)
    window.events.closed += lambda: stop_server(handle)
    webview.start()

    handle.thread.join(timeout=2)


if __name__ == "__main__":
    main()
