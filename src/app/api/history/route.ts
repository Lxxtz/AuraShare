import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';

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
        compression: true,
        created_at: true,
        stored_path: true,
      }
    });

    const activeFiles = [];
    for (const file of files) {
      if (!(await isExpired(file))) {
        let storedSize = file.size;
        if (fs.existsSync(file.stored_path)) {
          const stats = fs.statSync(file.stored_path);
          storedSize = stats.size;
        }

        activeFiles.push({
          id: file.id,
          original_name: file.original_name,
          unique_code: file.unique_code,
          size: file.size,
          stored_size: storedSize,
          compression: file.compression || 'None',
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
