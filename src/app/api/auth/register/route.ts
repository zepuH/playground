import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '邮箱、密码和姓名都是必填项' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const client = getSupabaseClient();
    const { data: existingUser, error: checkError } = await client
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      throw new Error(`检查用户失败: ${checkError.message}`);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const { data: newUser, error: insertError } = await client
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
      })
      .select('id, email, name, created_at')
      .single();

    if (insertError) {
      throw new Error(`创建用户失败: ${insertError.message}`);
    }

    return NextResponse.json({
      message: '注册成功',
      user: newUser,
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '注册失败' },
      { status: 500 }
    );
  }
}
