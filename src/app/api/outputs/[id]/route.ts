import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 更新产出
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
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: '产出内容是必填项' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 先验证产出所属项目属于当前用户
    const { data: outputCheck, error: checkError } = await client
      .from('outputs')
      .select('project_id, projects!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (checkError || !outputCheck) {
      return NextResponse.json(
        { error: '产出不存在或无权更新' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const { data: output, error: updateError } = await client
      .from('outputs')
      .update({
        content,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) {
      throw new Error(`更新产出失败: ${updateError.message}`);
    }

    if (!output) {
      return NextResponse.json(
        { error: '产出不存在或无权更新' },
        { status: 404 }
      );
    }

    // 更新项目的 updated_at
    if (outputCheck.project_id) {
      await client
        .from('projects')
        .update({ updated_at: now })
        .eq('id', outputCheck.project_id);
    }

    return NextResponse.json({
      message: '产出更新成功',
      output,
    });
  } catch (error) {
    console.error('更新产出错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新产出失败' },
      { status: 500 }
    );
  }
}

// 删除产出
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

    // 先验证产出所属项目属于当前用户
    const { data: outputCheck, error: checkError } = await client
      .from('outputs')
      .select('project_id, projects!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (checkError || !outputCheck) {
      return NextResponse.json(
        { error: '产出不存在或无权删除' },
        { status: 404 }
      );
    }

    const { data: output, error: deleteError } = await client
      .from('outputs')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (deleteError) {
      throw new Error(`删除产出失败: ${deleteError.message}`);
    }

    if (!output) {
      return NextResponse.json(
        { error: '产出不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '产出删除成功',
    });
  } catch (error) {
    console.error('删除产出错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除产出失败' },
      { status: 500 }
    );
  }
}
