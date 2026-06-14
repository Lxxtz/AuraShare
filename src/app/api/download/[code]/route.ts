import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { huffmanDecode } from '@/lib/huffman';

import { isExpired } from '@/lib/cleanup';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to download files.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const decompress = searchParams.get('decompress') === 'true';

    const { code } = await params;
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const fileMeta = await prisma.file.findUnique({ where: { unique_code: code } });
    
    if (!fileMeta) {
      return NextResponse.json({ error: 'UNIQUE CODE NOT IN DB' }, { status: 404 });
    }

    if (await isExpired(fileMeta)) {
      return NextResponse.json({ error: 'FILE HAS EXPIRED (24h Limit)' }, { status: 404 });
    }

    const filePath = fileMeta.stored_path;
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    let fileBuffer: Buffer = fs.readFileSync(filePath);

    if (decompress && fileMeta.compression) {
      if (fileMeta.compression === 'Gzip') {
        fileBuffer = Buffer.from(zlib.gunzipSync(fileBuffer));
      } else if (fileMeta.compression === 'Brotli') {
        fileBuffer = Buffer.from(zlib.brotliDecompressSync(fileBuffer));
      } else if (fileMeta.compression === 'Huffman') {
        fileBuffer = Buffer.from(huffmanDecode(fileBuffer));
      }
    }

    // We can compute the actual length since decompressed buffer might be different
    const contentLength = fileBuffer.length.toString();

    // Optionally append extension if sending compressed but not decompressed
    let filename = fileMeta.original_name;
    if (!decompress && fileMeta.compression) {
      if (fileMeta.compression === 'Gzip') filename += '.gz';
      else if (fileMeta.compression === 'Brotli') filename += '.br';
      else if (fileMeta.compression === 'Huffman') filename += '.huff';
    }

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': contentLength,
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
