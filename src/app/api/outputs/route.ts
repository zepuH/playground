import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 获取项目的所有产出
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少项目 ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 先验证项目属于当前用户
    const { data: project, error: projectError } = await client
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: '项目不存在或无权访问' },
        { status: 404 }
      );
    }

    const { data: outputs, error: fetchError } = await client
      .from('outputs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`查询产出失败: ${fetchError.message}`);
    }

    return NextResponse.json({
      outputs: outputs || [],
    });
  } catch (error) {
    console.error('获取产出列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取产出列表失败' },
      { status: 500 }
    );
  }
}

// 创建新产出
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const { project_id, content } = await request.json();

    if (!project_id || !content) {
      return NextResponse.json(
        { error: '项目 ID 和产出内容是必填项' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 先验证项目属于当前用户
    const { data: project, error: projectError } = await client
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: '项目不存在或无权访问' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const { data: output, error: insertError } = await client
      .from('outputs')
      .insert({
        project_id,
        content,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`创建产出失败: ${insertError.message}`);
    }

    // 更新项目的 updated_at
    await client
      .from('projects')
      .update({ updated_at: now })
      .eq('id', project_id);

    return NextResponse.json({
      message: '产出创建成功',
      output,
    });
  } catch (error) {
    console.error('创建产出错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建产出失败' },
      { status: 500 }
    );
  }
}
