import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

import { isExpired } from '@/lib/cleanup';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to download files.' }, { status: 401 });
    }

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

    const fileBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileMeta.original_name}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileMeta.size.toString(),
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
