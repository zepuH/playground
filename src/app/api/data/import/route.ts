import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

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

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '请选择要导入的文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 解析 Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 验证文件格式
    const requiredSheets = ['项目', '子任务', '产出'];
    for (const sheet of requiredSheets) {
      if (!workbook.SheetNames.includes(sheet)) {
        return NextResponse.json(
          { error: `文件格式错误：缺少"${sheet}"工作表` },
          { status: 400 }
        );
      }
    }

    const client = getSupabaseClient();
    const result = {
      projects: { success: 0, failed: 0 },
      subtasks: { success: 0, failed: 0 },
      outputs: { success: 0, failed: 0 },
    };

    // 项目名称到新ID的映射
    const projectNameToId: Record<string, string> = {};

    // 1. 导入项目
    const projectsSheet = workbook.Sheets['项目'];
    const projectsData = XLSX.utils.sheet_to_json(projectsSheet) as any[];

    for (const row of projectsData) {
      try {
        const projectName = row['项目名称'];
        if (!projectName) continue;

        const { data: project, error } = await client
          .from('projects')
          .insert({
            user_id: userId,
            name: projectName,
            description: row['项目描述'] || null,
          })
          .select()
          .single();

        if (error) {
          console.error('创建项目失败:', error);
          result.projects.failed++;
        } else {
          projectNameToId[projectName] = project.id;
          result.projects.success++;
        }
      } catch (e) {
        console.error('导入项目异常:', e);
        result.projects.failed++;
      }
    }

    // 2. 导入子任务
    const subtasksSheet = workbook.Sheets['子任务'];
    const subtasksData = XLSX.utils.sheet_to_json(subtasksSheet) as any[];

    for (const row of subtasksData) {
      try {
        const projectName = row['所属项目'];
        const projectId = projectNameToId[projectName];

        if (!projectId) {
          console.error(`找不到项目: ${projectName}`);
          result.subtasks.failed++;
          continue;
        }

        // 解析状态
        const statusText = row['状态'] || '待办';
        let status: 'todo' | 'done' | 'paused' = 'todo';
        if (statusText === '已办') status = 'done';
        else if (statusText === '搁置') status = 'paused';

        const { error } = await client
          .from('subtasks')
          .insert({
            project_id: projectId,
            name: row['子任务名称'],
            status,
            problem: row['问题'] || null,
            solution: row['解决方案'] || null,
          });

        if (error) {
          console.error('创建子任务失败:', error);
          result.subtasks.failed++;
        } else {
          result.subtasks.success++;
        }
      } catch (e) {
        console.error('导入子任务异常:', e);
        result.subtasks.failed++;
      }
    }

    // 3. 导入产出
    const outputsSheet = workbook.Sheets['产出'];
    const outputsData = XLSX.utils.sheet_to_json(outputsSheet) as any[];

    for (const row of outputsData) {
      try {
        const projectName = row['所属项目'];
        const projectId = projectNameToId[projectName];

        if (!projectId) {
          console.error(`找不到项目: ${projectName}`);
          result.outputs.failed++;
          continue;
        }

        const { error } = await client
          .from('outputs')
          .insert({
            project_id: projectId,
            content: row['产出内容'],
          });

        if (error) {
          console.error('创建产出失败:', error);
          result.outputs.failed++;
        } else {
          result.outputs.success++;
        }
      } catch (e) {
        console.error('导入产出异常:', e);
        result.outputs.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: '导入完成',
      result,
    });
  } catch (error) {
    console.error('导入数据错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导入数据失败' },
      { status: 500 }
    );
  }
}
