// src/services/upload.ts
// ✅ Service para upload de fotos para Google Drive

import { google } from 'googleapis';
import multer from 'multer';
import fs from 'fs';
import { Request, Response } from 'express';
import stream from 'stream';

const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

export async function handleUploadFoto(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  await new Promise<void>((resolve, reject) => {
    uploadMiddleware(req as any, res as any, (err: any) => {
      if (err) {
        console.error('Erro no multer middleware:', err);
        reject(err);
      }
      resolve();
    });
  });

  try {
    const file = (req as any).file;
    const { idDispositivo, nome, idLoja, folderPrefix } = req.body;

    console.log('Dados recebidos no upload multipart:', {
      file: file?.originalname,
      idDispositivo,
      idLoja,
      nome
    });

    if (!file || !idDispositivo) {
      return res.status(400).json({ success: false, error: 'Arquivo ou ID do dispositivo ausente' });
    }

    const buffer = fs.readFileSync(file.path);
    const drive = createDriveClient();

    const { filePath } = await uploadBufferToDrive({
      drive,
      buffer,
      originalMimeType: file.mimetype,
      idDispositivo,
      folderPrefix,
      nome,
      lojaId: idLoja
    });

    fs.unlinkSync(file.path);

    console.log('Upload multipart concluído, caminho:', filePath);

    res.status(200).json({
      success: true,
      filePath,
    });
  } catch (error: any) {
    console.error('Erro no upload multipart:', error);
    res.status(500).json({
      success: false,
      error: `Erro no upload: ${error.message || 'Erro desconhecido'}`,
    });
  }
}

export async function handleUploadFotoBase64(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { base64, idDispositivo, mimeType, nome, folderPrefix, idLoja } = req.body || {};

    console.log('Dados recebidos no upload base64:', {
      hasBase64: Boolean(base64),
      idDispositivo,
      mimeType,
      nome
    });

    if (!base64 || !idDispositivo) {
      return res.status(400).json({ success: false, error: 'base64 ou ID do dispositivo ausente' });
    }

    const { buffer, detectedMime } = decodeBase64Image(base64);
    const drive = createDriveClient();

    const { filePath } = await uploadBufferToDrive({
      drive,
      buffer,
      originalMimeType: mimeType || detectedMime || 'image/jpeg',
      idDispositivo,
      folderPrefix,
      nome,
      lojaId: idLoja
    });

    console.log('Upload base64 concluído, caminho:', filePath);

    res.status(200).json({
      success: true,
      filePath,
    });
  } catch (error: any) {
    console.error('Erro no upload base64:', error);
    res.status(500).json({
      success: false,
      error: `Erro no upload: ${error.message || 'Erro desconhecido'}`,
    });
  }
}

export function createDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

interface UploadParams {
  drive: ReturnType<typeof createDriveClient>;
  buffer: Buffer;
  originalMimeType: string;
  idDispositivo: string;
  folderPrefix?: string;
  nome?: string;
  lojaId?: string;
}

export async function uploadBufferToDrive({
  drive,
  buffer,
  originalMimeType,
  idDispositivo,
  folderPrefix,
  nome,
  lojaId,
}: UploadParams) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1_EeqI9FtCny6fwkxp3K2JEu82WgL_oCR";
  const timestamp = Date.now();
  const sanitizedId = sanitizeId(idDispositivo);
  const sanitizedNome = nome ? sanitizeId(nome) : null;
  const sanitizedLoja = lojaId ? sanitizeId(lojaId) : null;
  const extension = mimeTypeToExtension(originalMimeType);
  const parts = [sanitizedId];
  if (sanitizedLoja) parts.push(sanitizedLoja);
  if (sanitizedNome) parts.push(sanitizedNome);
  parts.push('FOTO');
  const fileName = `${parts.join('_')}.${timestamp}.${extension}`;
  const effectiveFolderPrefix = folderPrefix || 'img_Maua/Mapeamentos_Images_Maua';
  const filePath = `${effectiveFolderPrefix}/${fileName}`;

  const driveResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: originalMimeType,
      parents: [folderId],
    },
    media: {
      mimeType: originalMimeType,
      body: bufferToStream(buffer),
    },
  });

  if (!driveResponse.data.id) {
    throw new Error('Falha ao fazer upload para o Google Drive');
  }

  return { fileName, filePath };
}

function bufferToStream(buffer: Buffer) {
  const readable = new stream.Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export function decodeBase64Image(base64String: string): { buffer: Buffer; detectedMime?: string } {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (matches) {
    return { buffer: Buffer.from(matches[2], 'base64'), detectedMime: matches[1] };
  }
  return { buffer: Buffer.from(base64String, 'base64') };
}

export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

export function mimeTypeToExtension(mimeType: string): string {
  if (!mimeType) return 'jpg';
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

const TMP_UPLOAD_DIR = '/tmp/uploads/';
const CLEANUP_INTERVAL_MS = 1000 * 60 * 30; // 30 minutos
const CLEANUP_RETENTION_MS = 1000 * 60 * 60 * 6; // 6 horas

function cleanupTemporaryUploads() {
  try {
    if (!fs.existsSync(TMP_UPLOAD_DIR)) {
      return;
    }
    const now = Date.now();
    const files = fs.readdirSync(TMP_UPLOAD_DIR);
    files.forEach((file) => {
      const path = `${TMP_UPLOAD_DIR}${file}`;
      try {
        const stat = fs.statSync(path);
        if (now - stat.mtimeMs > CLEANUP_RETENTION_MS) {
          fs.unlinkSync(path);
          console.log(`🧹 [UPLOAD] Arquivo temporário removido: ${path}`);
        }
      } catch (err) {
        console.warn(`⚠️ [UPLOAD] Falha ao processar arquivo temporário: ${path}`, err);
      }
    });
  } catch (error) {
    console.error('❌ [UPLOAD] Erro na limpeza de temporários:', error);
  }
}

setInterval(cleanupTemporaryUploads, CLEANUP_INTERVAL_MS);
cleanupTemporaryUploads();
