import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

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

    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: '请输入工作描述' },
        { status: 400 }
      );
    }

    // 获取用户的所有项目，帮助 AI 匹配
    const client = getSupabaseClient();
    const { data: projects, error: fetchError } = await client
      .from('projects')
      .select('id, name')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(`查询项目失败: ${fetchError.message}`);
    }

    // 准备 AI 提示词
    const systemPrompt = `你是一个工作内容分析助手，负责从用户的描述中批量识别工作内容。

用户当前的项目列表：
${projects?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || '暂无项目'}

请分析用户输入，识别其中包含的所有项目和子任务。支持以下格式：
1. 多个项目的工作内容
2. 一个项目下的多个子任务
3. 自由格式的日常工作描述

请以 JSON 格式返回识别结果，格式如下：
{
  "items": [
    {
      "project": {
        "name": "项目名称",
        "id": "项目ID（如果能匹配到现有项目）",
        "isNew": false（如果能匹配到项目）或 true（如果需要创建新项目）
      },
      "subtasks": [
        {
          "name": "子任务名称",
          "status": "todo" | "done" | "paused",
          "problem": "遇到的问题（可选）",
          "solution": "解决方案（可选）"
        }
      ],
      "outputs": [
        "产出内容1",
        "产出内容2"
      ]
    }
  ],
  "summary": "对用户输入内容的简要总结"
}

识别规则：
1. 项目匹配：如果用户描述中的项目名称与现有项目相似，优先匹配现有项目并设置 isNew 为 false
2. 子任务状态：根据描述判断子任务状态
   - "完成了"、"做好了"、"搞定了" → done
   - "暂停"、"搁置"、"等待" → paused  
   - 其他情况 → todo
3. 问题识别：寻找"问题"、"困难"、"bug"、"报错"等关键词后的内容
4. 解决方案识别：寻找"解决"、"修复"、"方案"等关键词后的内容
5. 产出识别：寻找"完成"、"产出"、"成果"等关键词后的内容

示例输入：
"今天做了产品策划V1的用户调研，完成了10个访谈。遇到了用户配合度不高的问题，通过优化话术解决了。下午开始做技术方案设计，还没完成。另外运营数据统计项目有个bug需要修复。"

示例输出：
{
  "items": [
    {
      "project": {
        "name": "产品策划V1",
        "id": null,
        "isNew": true
      },
      "subtasks": [
        {
          "name": "用户调研",
          "status": "done",
          "problem": "用户配合度不高",
          "solution": "优化话术"
        },
        {
          "name": "技术方案设计",
          "status": "todo",
          "problem": null,
          "solution": null
        }
      ],
      "outputs": ["完成了10个用户访谈"]
    },
    {
      "project": {
        "name": "运营数据统计",
        "id": null,
        "isNew": true
      },
      "subtasks": [
        {
          "name": "修复bug",
          "status": "todo",
          "problem": null,
          "solution": null
        }
      ],
      "outputs": []
    }
  ],
  "summary": "今日工作涉及2个项目，完成了用户调研，技术方案设计进行中，另有bug待修复"
}

注意：
1. 必须返回纯 JSON，不要包含任何其他文本或markdown代码块
2. 即使只识别到一个项目，也要返回 items 数组格式
3. 如果无法识别出项目名称，可以使用"日常工作"作为默认项目名`;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: description },
    ];

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-1-6-lite-251015',
      temperature: 0.3,
    });

    // 解析 AI 返回的 JSON
    let result;
    try {
      // 提取 JSON 部分（处理可能的 markdown 代码块）
      let jsonContent = response.content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      }
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }
      result = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error('解析 AI 返回的 JSON 失败:', parseError);
      console.error('AI 原始返回:', response.content);
      return NextResponse.json(
        { error: 'AI 分析失败，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result,
    });
  } catch (error) {
    console.error('AI 智能填表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 智能填表失败' },
      { status: 500 }
    );
  }
}
