import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const userId = cookieStore.get('user_id')?.value;

    return NextResponse.json({
      message: 'Cookie 调试信息',
      userId: userId || null,
      allCookies: allCookies,
      cookiesCount: allCookies.length,
    });
  } catch (error) {
    console.error('调试错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '调试失败' },
      { status: 500 }
    );
  }
}
