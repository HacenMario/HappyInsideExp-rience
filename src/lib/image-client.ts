"use client";

/**
 * Client-side image compression.
 *
 * Why: cloud platforms (Vercel) limit request bodies to 4.5 MB and MongoDB
 * caps a document at 16 MB. Compressing/resizing images in the browser before
 * upload keeps every media request small (usually < 1 MB) on any host, with
 * zero server-side dependencies.
 *
 * - Photos (jpeg/webp) are re-encoded; PNG keeps its alpha channel.
 * - GIF (animation) and SVG (vector) are passed through untouched.
 * - Iteratively lowers dimensions/quality until the target size is met.
 * - NEVER throws: on any failure it falls back to the raw data URL so an
 *   upload is never blocked by compression itself.
 */

export interface ImageCompressOptions {
  /** Max width/height in px (default 1800) */
  maxDim?: number;
  /** Initial encoding quality 0..1 (default 0.82) */
  quality?: number;
  /** Target max size of the resulting data URL, in bytes (default 1.2 MB) */
  maxBytes?: number;
}

const DEFAULTS = {
  maxDim: 1800,
  quality: 0.82,
  maxBytes: 1.2 * 1024 * 1024,
};

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}

export async function fileToDataUrl(file: File, opts: ImageCompressOptions = {}): Promise<string> {
  // Formats that must not go through a canvas
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return readAsDataURL(file);
  }
  try {
    const { maxDim, quality, maxBytes } = { ...DEFAULTS, ...opts };
    const raw = await readAsDataURL(file);
    const img = await loadImage(raw);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return raw;

    // PNG/WebP keep their format (transparency preserved); photos → JPEG
    const outType =
      file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";

    let scale = Math.min(1, maxDim / Math.max(w0, h0));
    let q = quality;
    let dataUrl = raw;

    for (let attempt = 0; attempt < 4; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w0 * scale));
      canvas.height = Math.max(1, Math.round(h0 * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return raw;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL(outType, q);
      if (dataUrl.length <= maxBytes) return dataUrl;
      scale *= 0.8;
      q = Math.max(0.5, q - 0.1);
    }
    return dataUrl;
  } catch {
    // Compression is best-effort — never block the upload because of it
    return readAsDataURL(file);
  }
}

/** Rough byte size of a data URL string (base64 ≈ 4/3 of binary). */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  return Math.round(((i >= 0 ? dataUrl.length - i - 1 : dataUrl.length) * 3) / 4);
}
