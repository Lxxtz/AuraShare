import fs from 'fs';
import prisma from './prisma';

export async function isExpired(fileMeta: { id: string, created_at: Date, stored_path: string }): Promise<boolean> {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const now = new Date();
  
  if (now.getTime() - fileMeta.created_at.getTime() > TWENTY_FOUR_HOURS) {
    try {
      if (fs.existsSync(fileMeta.stored_path)) {
        fs.unlinkSync(fileMeta.stored_path);
      }
      await prisma.file.delete({ where: { id: fileMeta.id } });
    } catch (err) {
      console.error('Error cleaning up expired file:', err);
    }
    return true;
  }
  return false;
}
