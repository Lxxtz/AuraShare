import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

import { isExpired } from '@/lib/cleanup';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const files = await prisma.file.findMany({
      where: { uploader_id: session.userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        original_name: true,
        unique_code: true,
        size: true,
        created_at: true,
        stored_path: true,
      }
    });

    const activeFiles = [];
    for (const file of files) {
      if (!(await isExpired(file))) {
        activeFiles.push({
          id: file.id,
          original_name: file.original_name,
          unique_code: file.unique_code,
          size: file.size,
          created_at: file.created_at
        });
      }
    }

    return NextResponse.json({ files: activeFiles });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
