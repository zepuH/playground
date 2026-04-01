import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('user_id');

    return NextResponse.json({
      message: '登出成功',
    });
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '登出失败' },
      { status: 500 }
    );
  }
}
