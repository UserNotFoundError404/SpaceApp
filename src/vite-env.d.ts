/// <reference types="vite/client" />
/// <reference types="vite/client" />

// Declare OffscreenCanvas for TypeScript
declare var OffscreenCanvas: {
  prototype: OffscreenCanvas;
  new(width: number, height: number): OffscreenCanvas;
};

interface OffscreenCanvas {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
  getContext(contextId: "webgl"): WebGLRenderingContext | null;
  transferToImageBitmap(): ImageBitmap;
}
/// <reference types="vite/client" />

// Phoenix module declaration for TypeScript
declare module "phoenix" {
  export class Socket {
    constructor(endPoint: string, opts?: any);
    connect(): void;
    disconnect(callback?: () => void): void;
    channel(topic: string, params?: any): Channel;
  }

  export class Channel {
    constructor(topic: string, params?: any);
    join(): { receive: (status: string, callback: (resp: any) => void) => void };
    push(event: string, payload: any): { receive: (status: string, callback: (resp: any) => void) => void };
    on(event: string, callback: (payload: any) => void): void;
  }
}
