import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码都是必填项' },
        { status: 400 }
      );
    }

    // 查询用户
    const client = getSupabaseClient();
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('id, email, name, password_hash, created_at')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`查询用户失败: ${fetchError.message}`);
    }

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 创建 session（使用 HTTP-only cookie）
    const cookieStore = await cookies();
    const isProduction = process.env.COZE_PROJECT_ENV === 'PROD';
    
    cookieStore.set('user_id', user.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });

    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: '登录成功',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
