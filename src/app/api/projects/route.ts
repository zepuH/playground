import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 获取当前用户的所有项目
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

    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const withSubtasks = searchParams.get('with_subtasks') === 'true';

    let query = client
      .from('projects')
      .select(withSubtasks ? `
        *,
        subtasks(id, name, status, created_at, updated_at),
        outputs(count)
      ` : `
        *,
        subtasks(count),
        outputs(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // 搜索功能
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: projects, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`查询项目失败: ${fetchError.message}`);
    }

    // 转换数据格式
    const formattedProjects = projects?.map(project => {
      if (withSubtasks) {
        // 计算各状态数量
        const subtasks = project.subtasks || [];
        const todoCount = subtasks.filter((s: any) => s.status === 'todo').length;
        const doneCount = subtasks.filter((s: any) => s.status === 'done').length;
        const pausedCount = subtasks.filter((s: any) => s.status === 'paused').length;
        
        return {
          ...project,
          subtask_count: subtasks.length,
          output_count: project.outputs?.[0]?.count || 0,
          todo_count: todoCount,
          done_count: doneCount,
          paused_count: pausedCount,
          outputs: undefined,
        };
      }
      
      return {
        ...project,
        subtask_count: project.subtasks?.[0]?.count || 0,
        output_count: project.outputs?.[0]?.count || 0,
        subtasks: undefined,
        outputs: undefined,
      };
    }) || [];

    return NextResponse.json({
      projects: formattedProjects,
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// 创建新项目
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

    const { name, description, priority } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: '项目名称是必填项' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const { data: project, error: insertError } = await client
      .from('projects')
      .insert({
        user_id: userId,
        name,
        description,
        priority: priority || 'medium',
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`创建项目失败: ${insertError.message}`);
    }

    return NextResponse.json({
      message: '项目创建成功',
      project,
    });
  } catch (error) {
    console.error('创建项目错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建项目失败' },
      { status: 500 }
    );
  }
}
