// src/services/upload.ts
// ✅ Service para upload de fotos para Google Drive

import { google } from 'googleapis';
import multer from 'multer';
import fs from 'fs';
import { Request, Response } from 'express';

// Configuração do multer para armazenar em disco temporariamente
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
  fileFilter: (_req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
});

interface UploadResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

// Middleware para processar o upload
export const uploadMiddleware = upload.single('file');

export async function handleUploadFoto(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // Usar o middleware do multer
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
    const { idDispositivo, idLoja } = req.body;

    console.log('Dados recebidos no upload:', { file: file?.originalname, idDispositivo, idLoja });

    if (!file || !idDispositivo) {
      return res.status(400).json({ success: false, error: 'Arquivo ou ID do dispositivo ausente' });
    }

    // Configurar autenticação do Google
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // ID da pasta no Google Drive onde as imagens serão salvas
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1_EeqI9FtCny6fwkxp3K2JEu82WgL_oCR";

    // Gerar um nome de arquivo único baseado no ID do dispositivo e timestamp
    const timestamp = Date.now();
    const fileName = `${idDispositivo}.FOTO.${timestamp}.jpg`;
    const filePath = `img_Maua/Mapeamentos_Images_Maua/${fileName}`;

    console.log('Fazendo upload para o Google Drive:', { fileName, folderId });

    // Configurar o upload para o Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: file.mimetype,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
    });

    if (!driveResponse.data.id) {
      throw new Error('Falha ao fazer upload para o Google Drive');
    }

    // Remover o arquivo temporário
    fs.unlinkSync(file.path);

    console.log('Upload concluído com sucesso, caminho:', filePath);

    res.status(200).json({
      success: true,
      filePath: filePath,
    });
  } catch (error: any) {
    console.error('Erro no upload da foto:', error);
    res.status(500).json({
      success: false,
      error: `Erro no upload: ${error.message || 'Erro desconhecido'}`,
    });
  }
}

