import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 获取单个项目详情
export async function GET(
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

    // 获取项目详情
    const { data: project, error: fetchError } = await client
      .from('projects')
      .select(`
        *,
        subtasks(*),
        outputs(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`查询项目失败: ${fetchError.message}`);
    }

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      project,
    });
  } catch (error) {
    console.error('获取项目详情错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取项目详情失败' },
      { status: 500 }
    );
  }
}

// 更新项目
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
    const { name, description, priority } = await request.json();

    const client = getSupabaseClient();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;

    const { data: project, error: updateError } = await client
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (updateError) {
      throw new Error(`更新项目失败: ${updateError.message}`);
    }

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在或无权更新' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '项目更新成功',
      project,
    });
  } catch (error) {
    console.error('更新项目错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新项目失败' },
      { status: 500 }
    );
  }
}

// 删除项目
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

    const { data: project, error: deleteError } = await client
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (deleteError) {
      throw new Error(`删除项目失败: ${deleteError.message}`);
    }

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '项目删除成功',
    });
  } catch (error) {
    console.error('删除项目错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除项目失败' },
      { status: 500 }
    );
  }
}
