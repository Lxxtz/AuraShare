import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateAlphanumericCode } from '@/lib/utils';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { huffmanEncode } from '@/lib/huffman';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const compression = formData.get('compression') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large! Max 100MB.' }, { status: 413 });
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Generate collision-free code
    let uniqueCode = '';
    let isUnique = false;
    while (!isUnique) {
      uniqueCode = generateAlphanumericCode(6);
      const existing = await prisma.file.findUnique({ where: { unique_code: uniqueCode } });
      if (!existing) {
        isUnique = true;
      }
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let appliedCompression = null;

    if (compression === 'Gzip') {
      buffer = zlib.gzipSync(buffer);
      appliedCompression = 'Gzip';
    } else if (compression === 'Brotli') {
      buffer = zlib.brotliCompressSync(buffer);
      appliedCompression = 'Brotli';
    } else if (compression === 'Huffman') {
      buffer = huffmanEncode(buffer);
      appliedCompression = 'Huffman';
    }

    const storedPath = path.join(UPLOAD_DIR, `${uniqueCode}-${file.name}`);
    
    fs.writeFileSync(storedPath, buffer);

    const stats = fs.statSync(storedPath);

    const newFile = await prisma.file.create({
      data: {
        original_name: file.name,
        stored_path: storedPath,
        unique_code: uniqueCode,
        compression: appliedCompression,
        size: file.size,
        uploader_id: session.userId,
      },
    });

    return NextResponse.json({ 
      message: 'File uploaded successfully', 
      code: newFile.unique_code,
      originalSize: file.size,
      compressedSize: stats.size,
      compressionUsed: appliedCompression
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
