import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

// 获取当前用户的所有子任务（包含项目信息）
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

    // 获取所有项目及其子任务
    const { data: projects, error: fetchError } = await client
      .from('projects')
      .select(`
        id,
        name,
        priority,
        subtasks(
          id,
          name,
          status,
          priority,
          problem,
          solution,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      throw new Error(`查询数据失败: ${fetchError.message}`);
    }

    // 扁平化数据，为每个子任务添加项目信息
    const allSubtasks: any[] = [];
    (projects || []).forEach((project: any) => {
      (project.subtasks || []).forEach((subtask: any) => {
        allSubtasks.push({
          ...subtask,
          project_id: project.id,
          project_name: project.name,
        });
      });
    });

    // 按状态分组统计
    const stats = {
      todo: allSubtasks.filter(s => s.status === 'todo').length,
      done: allSubtasks.filter(s => s.status === 'done').length,
      paused: allSubtasks.filter(s => s.status === 'paused').length,
      total: allSubtasks.length,
    };

    // 按更新时间排序（最近更新的在前）
    allSubtasks.sort((a, b) => {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      subtasks: allSubtasks,
      stats,
    });
  } catch (error) {
    console.error('获取待办总览错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取待办总览失败' },
      { status: 500 }
    );
  }
}
