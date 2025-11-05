// src/services/image-proxy.ts
// ✅ Service para proxy de imagens do Google Drive

import { google, drive_v3 } from "googleapis";
import crypto from "crypto";
import { Request, Response } from "express";

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
}

interface CachedImage {
  buffer: Buffer;
  mimeType: string;
  timestamp: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hora
const imageCache: Map<string, CachedImage> = new Map();

// Configurar autenticação do Google
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive: drive_v3.Drive = google.drive({ version: "v3", auth });

console.log("🔧 [IMAGE-PROXY] Drive inicializado com sucesso:", !!drive);

async function findFileId(fileName: string): Promise<string | null> {
  try {
    console.log(`🔍 [IMAGE-PROXY] Buscando arquivo: ${fileName}`);
    
    const response = await drive.files.list({
      q: `name = '${fileName}' and trashed=false`,
      fields: "files(id, name, mimeType)",
      spaces: "drive",
      pageSize: 1,
    });

    const files = response.data.files as DriveFile[];
    if (!files?.length) {
      console.log(`❌ [IMAGE-PROXY] Arquivo não encontrado: ${fileName}`);
      return null;
    }

    console.log(`✅ [IMAGE-PROXY] Arquivo encontrado, ID: ${files[0].id}`);
    return files[0].id;
  } catch (error) {
    console.error("❌ [IMAGE-PROXY] Erro ao buscar ID do arquivo:", error);
    throw error;
  }
}

async function downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    console.log(`📥 [IMAGE-PROXY] Baixando arquivo com ID: ${fileId}`);
    
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      response.data
        .on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on("end", () => {
          console.log(`✅ [IMAGE-PROXY] Download concluído, total de chunks: ${chunks.length}`);
          resolve();
        })
        .on("error", (err: Error) => {
          console.error("❌ [IMAGE-PROXY] Erro no stream:", err);
          reject(err);
        });
    });

    const buffer = Buffer.concat(chunks);
    const mimeType = response.headers["content-type"] || "image/jpeg";
    
    console.log(`✅ [IMAGE-PROXY] Buffer criado, tamanho: ${buffer.length} bytes`);
    return { buffer, mimeType };
  } catch (error) {
    console.error("❌ [IMAGE-PROXY] Erro ao baixar arquivo do Drive:", error);
    throw error;
  }
}

export async function handleImageProxy(req: Request, res: Response) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { path: imagePath, url } = req.query as { path?: string; url?: string };
  if (!imagePath && !url) {
    return res.status(400).json({ error: "Informe 'path' (Drive) ou 'url' (direta)" });
  }

  const isDirectUrl = !!url && typeof url === 'string';
  const normalizedPath = typeof imagePath === 'string' ? imagePath : undefined;
  const fileName = normalizedPath ? (normalizedPath.split("/").pop() || "") : undefined;
  const cacheKey = isDirectUrl ? String(url) : String(normalizedPath);

  // Verificar cache
  const cachedImage = imageCache.get(cacheKey);
  if (cachedImage && Date.now() - cachedImage.timestamp < CACHE_TTL) {
    console.log(`📦 [IMAGE-PROXY] Retornando imagem do cache: ${cacheKey}`);
    res.setHeader("Content-Type", cachedImage.mimeType);
    const etag = crypto.createHash('sha1').update(cachedImage.buffer).digest('hex');
    res.setHeader('ETag', etag);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    return res.send(cachedImage.buffer);
  }

  try {
    console.log(`🔄 [IMAGE-PROXY] Processando nova imagem: ${imagePath}`);
    
    let buffer: Buffer;
    let mimeType: string = 'image/jpeg';

    if (isDirectUrl) {
      console.log(`🌐 [IMAGE-PROXY] Buscando URL direta: ${url}`);
      const response = await fetch(String(url));
      if (!response.ok) {
        return res.status(response.status).json({ error: `Falha ao buscar URL (${response.status})` });
      }
      const arrayBuf = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
      mimeType = response.headers.get('content-type') || mimeType;
    } else {
      const fileId = await findFileId(fileName!);
      if (!fileId) {
        return res.status(404).json({ error: "Imagem não encontrada" });
      }
      const result = await downloadFile(fileId);
      buffer = result.buffer;
      mimeType = result.mimeType;
    }
    
    // Salvar no cache
    imageCache.set(cacheKey, { buffer, mimeType, timestamp: Date.now() });
    
    // Limpar cache antigo após TTL
    setTimeout(() => imageCache.delete(cacheKey), CACHE_TTL);

    const etag = crypto.createHash('sha1').update(buffer).digest('hex');
    res.setHeader('ETag', etag);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    res.send(buffer);
    
    console.log(`✅ [IMAGE-PROXY] Imagem servida com sucesso: ${imagePath}`);
  } catch (error) {
    console.error("❌ [IMAGE-PROXY] Erro ao processar imagem:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao processar a imagem" });
    }
  }
}

