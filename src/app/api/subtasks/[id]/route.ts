import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 更新子任务
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { name, problem, solution, status, priority } = await request.json();

    const client = getSupabaseClient();
    
    // 先验证子任务所属项目属于当前用户
    const { data: subtaskCheck, error: checkError } = await client
      .from('subtasks')
      .select('project_id, projects!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (checkError || !subtaskCheck) {
      return NextResponse.json(
        { error: '子任务不存在或无权更新' },
        { status: 404 }
      );
    }

    // 构建更新对象
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (problem !== undefined) updateData.problem = problem;
    if (solution !== undefined) updateData.solution = solution;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    const { data: subtask, error: updateError } = await client
      .from('subtasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) {
      throw new Error(`更新子任务失败: ${updateError.message}`);
    }

    if (!subtask) {
      return NextResponse.json(
        { error: '子任务不存在或无权更新' },
        { status: 404 }
      );
    }

    // 更新项目的 updated_at
    if (subtaskCheck.project_id) {
      await client
        .from('projects')
        .update({ updated_at: updateData.updated_at })
        .eq('id', subtaskCheck.project_id);
    }

    return NextResponse.json({
      message: '子任务更新成功',
      subtask,
    });
  } catch (error) {
    console.error('更新子任务错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新子任务失败' },
      { status: 500 }
    );
  }
}

// 删除子任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = getSupabaseClient();

    // 先验证子任务所属项目属于当前用户
    const { data: subtaskCheck, error: checkError } = await client
      .from('subtasks')
      .select('project_id, projects!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (checkError || !subtaskCheck) {
      return NextResponse.json(
        { error: '子任务不存在或无权删除' },
        { status: 404 }
      );
    }

    const { data: subtask, error: deleteError } = await client
      .from('subtasks')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (deleteError) {
      throw new Error(`删除子任务失败: ${deleteError.message}`);
    }

    if (!subtask) {
      return NextResponse.json(
        { error: '子任务不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '子任务删除成功',
    });
  } catch (error) {
    console.error('删除子任务错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除子任务失败' },
      { status: 500 }
    );
  }
}
