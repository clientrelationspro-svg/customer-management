import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: { id: string };
}

// 下载文件
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    const fullPath = path.join(process.cwd(), 'public', file.filePath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }
    
    const fileBuffer = fs.readFileSync(fullPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        'Content-Length': file.fileSize.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
