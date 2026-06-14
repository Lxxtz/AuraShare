import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';

import { isExpired } from '@/lib/cleanup';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const fileMeta = await prisma.file.findUnique({ where: { unique_code: code } });
    
    if (!fileMeta) {
      return NextResponse.json({ error: 'File not found or code invalid' }, { status: 404 });
    }

    if (await isExpired(fileMeta)) {
      return NextResponse.json({ error: 'FILE HAS EXPIRED (24h Limit)' }, { status: 404 });
    }
    
    if (!fs.existsSync(fileMeta.stored_path)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    // Get current stored size (compressed or raw)
    const stats = fs.statSync(fileMeta.stored_path);

    return NextResponse.json({
      original_name: fileMeta.original_name,
      original_size: fileMeta.size,
      stored_size: stats.size,
      compression: fileMeta.compression,
      created_at: fileMeta.created_at,
    });

  } catch (error) {
    console.error('Info route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
