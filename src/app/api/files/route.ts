import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// 获取文件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || '';
    const entityId = searchParams.get('entityId') || '';
    
    const where: any = {};
    
    if (entityType && entityId) {
      where.entityType = entityType;
      where.entityId = entityId;
    }
    
    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// 上传文件
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const uploadedBy = formData.get('uploadedBy') as string || 'system';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }
    
    // 创建上传目录
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', entityType, entityId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const originalName = file.name;
    const ext = path.extname(originalName);
    const filename = `${timestamp}-${Math.random().toString(36).substring(2, 15)}${ext}`;
    const filePath = path.join(uploadDir, filename);
    
    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);
    
    // 保存文件记录到数据库
    const fileData: any = {
      filename,
      originalName,
      filePath: `/uploads/${entityType}/${entityId}/${filename}`,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy,
    };
    
    // 根据 entityType 设置对应的外键
    if (entityType === 'customer') {
      fileData.customerId = entityId;
    } else if (entityType === 'supplier') {
      fileData.supplierId = entityId;
    } else if (entityType === 'order') {
      fileData.orderId = entityId;
    } else if (entityType === 'product') {
      fileData.productId = entityId;
    }
    
    const fileRecord = await prisma.file.create({
      data: fileData,
    });
    
    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
