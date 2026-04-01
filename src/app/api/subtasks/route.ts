import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 获取项目的所有子任务
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

    const { data: subtasks, error: fetchError } = await client
      .from('subtasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`查询子任务失败: ${fetchError.message}`);
    }

    return NextResponse.json({
      subtasks: subtasks || [],
    });
  } catch (error) {
    console.error('获取子任务列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取子任务列表失败' },
      { status: 500 }
    );
  }
}

// 创建新子任务
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

    const { project_id, name, problem, solution, status, priority } = await request.json();

    if (!project_id || !name) {
      return NextResponse.json(
        { error: '项目 ID 和子任务名称是必填项' },
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
    const { data: subtask, error: insertError } = await client
      .from('subtasks')
      .insert({
        project_id,
        name,
        problem,
        solution,
        status: status || 'todo',
        priority: priority || 'medium',
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`创建子任务失败: ${insertError.message}`);
    }

    // 更新项目的 updated_at
    await client
      .from('projects')
      .update({ updated_at: now })
      .eq('id', project_id);

    return NextResponse.json({
      message: '子任务创建成功',
      subtask,
    });
  } catch (error) {
    console.error('创建子任务错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建子任务失败' },
      { status: 500 }
    );
  }
}
