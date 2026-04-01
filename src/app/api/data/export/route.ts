import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

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

    // 获取用户的所有项目
    const { data: projects, error: projectsError } = await client
      .from('projects')
      .select(`
        *,
        subtasks(*),
        outputs(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (projectsError) {
      throw new Error(`查询项目失败: ${projectsError.message}`);
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 1. 项目表
    const projectsData = (projects || []).map((p: any) => ({
      '项目ID': p.id,
      '项目名称': p.name,
      '项目描述': p.description || '',
      '创建时间': new Date(p.created_at).toLocaleString('zh-CN'),
      '更新时间': p.updated_at ? new Date(p.updated_at).toLocaleString('zh-CN') : '',
    }));
    const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
    XLSX.utils.book_append_sheet(workbook, projectsSheet, '项目');

    // 2. 子任务表
    const subtasksData: any[] = [];
    (projects || []).forEach((project: any) => {
      (project.subtasks || []).forEach((subtask: any) => {
        subtasksData.push({
          '所属项目': project.name,
          '子任务名称': subtask.name,
          '状态': subtask.status === 'done' ? '已办' : subtask.status === 'paused' ? '搁置' : '待办',
          '问题': subtask.problem || '',
          '解决方案': subtask.solution || '',
          '创建时间': new Date(subtask.created_at).toLocaleString('zh-CN'),
          '更新时间': subtask.updated_at ? new Date(subtask.updated_at).toLocaleString('zh-CN') : '',
        });
      });
    });
    const subtasksSheet = XLSX.utils.json_to_sheet(subtasksData);
    XLSX.utils.book_append_sheet(workbook, subtasksSheet, '子任务');

    // 3. 产出表
    const outputsData: any[] = [];
    (projects || []).forEach((project: any) => {
      (project.outputs || []).forEach((output: any) => {
        outputsData.push({
          '所属项目': project.name,
          '产出内容': output.content,
          '创建时间': new Date(output.created_at).toLocaleString('zh-CN'),
        });
      });
    });
    const outputsSheet = XLSX.utils.json_to_sheet(outputsData);
    XLSX.utils.book_append_sheet(workbook, outputsSheet, '产出');

    // 4. 导出信息表
    const exportInfo = [
      { '字段': '导出时间', '值': new Date().toLocaleString('zh-CN') },
      { '字段': '项目数量', '值': projects?.length || 0 },
      { '字段': '子任务数量', '值': subtasksData.length },
      { '字段': '产出数量', '值': outputsData.length },
      { '字段': '导出版本', '值': '1.0' },
    ];
    const infoSheet = XLSX.utils.json_to_sheet(exportInfo);
    XLSX.utils.book_append_sheet(workbook, infoSheet, '导出信息');

    // 生成 Excel 文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 返回文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="project-data-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('导出数据错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出数据失败' },
      { status: 500 }
    );
  }
}
