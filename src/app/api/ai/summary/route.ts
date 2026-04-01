import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { startDate, endDate, conversationHistory, userMessage } = await request.json();

    const client = getSupabaseClient();

    // 如果是初次生成总结，需要获取时间段内的数据
    let workData = '';
    if (!conversationHistory) {
      // 获取用户所有项目
      const { data: allProjects, error: projectsError } = await client
        .from('projects')
        .select(`
          *,
          subtasks(*),
          outputs(*)
        `)
        .eq('user_id', userId);

      if (projectsError) {
        throw new Error(`查询项目失败: ${projectsError.message}`);
      }

      // 在 JavaScript 中过滤时间范围内的项目
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      const projects = (allProjects || []).filter(project => {
        const createdAt = new Date(project.created_at).getTime();
        const updatedAt = project.updated_at ? new Date(project.updated_at).getTime() : null;
        
        // 创建时间在范围内，或更新时间在范围内
        return (createdAt >= startTime && createdAt <= endTime) ||
               (updatedAt !== null && updatedAt >= startTime && updatedAt <= endTime);
      });

      // 格式化工作数据
      if (projects && projects.length > 0) {
        workData = '## 工作数据\n\n';
        projects.forEach(project => {
          const updateDate = project.updated_at 
            ? new Date(project.updated_at).toLocaleDateString('zh-CN')
            : new Date(project.created_at).toLocaleDateString('zh-CN');
          
          workData += `### 项目：${project.name}（更新于 ${updateDate}）\n`;
          if (project.description) {
            workData += `描述：${project.description}\n`;
          }

          if (project.subtasks && project.subtasks.length > 0) {
            workData += '\n子任务：\n';
            project.subtasks.forEach((subtask: any) => {
              const subtaskDate = subtask.updated_at 
                ? new Date(subtask.updated_at).toLocaleDateString('zh-CN')
                : new Date(subtask.created_at).toLocaleDateString('zh-CN');
              workData += `- [${subtaskDate}] ${subtask.name} (${subtask.status === 'done' ? '已完成' : subtask.status === 'paused' ? '搁置' : '待办'})\n`;
              if (subtask.problem) {
                workData += `  问题：${subtask.problem}\n`;
              }
              if (subtask.solution) {
                workData += `  解决方案：${subtask.solution}\n`;
              }
            });
          }

          if (project.outputs && project.outputs.length > 0) {
            workData += '\n产出：\n';
            project.outputs.forEach((output: any) => {
              const date = new Date(output.created_at).toLocaleDateString('zh-CN');
              workData += `- [${date}] ${output.content}\n`;
            });
          }

          workData += '\n';
        });
      } else {
        workData = '该时间段内没有工作记录。';
      }
    }

    // 准备 AI 消息
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    let messages: any[];

    if (conversationHistory) {
      // 多轮对话，使用历史记录
      messages = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];
    } else {
      // 初次生成总结
      const systemPrompt = `你是一个工作总结助手，负责根据用户的工作数据生成结构化的工作总结。

总结应该包含以下部分：
1. 工作概览（涉及的项目数、子任务数、产出数）
2. 项目详情（每个项目的主要工作、遇到的问题和解决方案、产出）
3. 工作亮点（突出的成果或进展）
4. 待改进点（可以优化的地方）

请使用 Markdown 格式，保持专业但易懂的语气。`;

      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请根据以下工作数据生成工作总结：\n\n${workData}\n\n时间段：${startDate} 至 ${endDate}` },
      ];
    }

    // 创建流式响应
    const stream = llmClient.stream(messages, {
      model: 'doubao-seed-1-6-lite-251015',
      temperature: 0.7,
    });

    // 创建 ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI 工作总结错误:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'AI 工作总结失败' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
