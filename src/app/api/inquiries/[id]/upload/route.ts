import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: '未选择文件' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 存储到 public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads', params.id);
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/uploads/${params.id}/${filename}`;
    const isImage = file.type.startsWith('image/');

    return NextResponse.json({
      success: true,
      data: {
        url, filename: file.name, size: file.size, type: file.type, isImage,
        // Markdown 图片语法
        markdown: isImage ? `![${file.name}](${url})` : null,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
