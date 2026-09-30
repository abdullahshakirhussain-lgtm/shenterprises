export async function readBody(request: Request, limit = 64000): Promise<Uint8Array> {
 if (Number(request.headers.get("content-length") || 0) > limit) throw new Error("Request too large");
 const reader = request.body?.getReader();
 if (!reader) return new Uint8Array();
 const chunks: Uint8Array[] = []; let length = 0;
 try {
  while (true) {
   const { done, value } = await reader.read();
   if (done) break;
   length += value.byteLength;
   if (length > limit) { await reader.cancel(); throw new Error("Request too large"); }
   chunks.push(value);
  }
 } finally { reader.releaseLock(); }
 const bytes = new Uint8Array(length); let offset = 0;
 for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
 return bytes;
}
export async function readJson(request: Request, limit = 64000): Promise<any> {
 return JSON.parse(new TextDecoder().decode(await readBody(request, limit)));
}
