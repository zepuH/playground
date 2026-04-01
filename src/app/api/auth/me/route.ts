import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookies = cookieStore.getAll();

    console.log('Auth check - userId:', userId);
    console.log('Auth check - all cookies:', allCookies);

    if (!userId) {
      console.log('No user_id in cookies, returning 401');
      return NextResponse.json(
        { error: '未登录', debug: { cookiesCount: allCookies.length } },
        { status: 401 }
      );
    }

    // 获取用户信息（使用普通客户端，因为 users 表的 RLS 已经开放）
    const client = getSupabaseClient();
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('id, email, name, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`查询用户失败: ${fetchError.message}`);
    }

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取用户信息失败' },
      { status: 500 }
    );
  }
}
