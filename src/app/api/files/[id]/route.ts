import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: { id: string };
}

// 获取单个文件信息
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
    
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

// 删除文件
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    
    // 删除物理文件
    const fullPath = path.join(process.cwd(), 'public', file.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    // 删除数据库记录
    await prisma.file.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
