import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3010";

class SocketClient {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      this.socket?.emit("join-org", token);
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketClient = new SocketClient();
