'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Plus, 
  Trash2, 
  FolderOpen, 
  CheckSquare, 
  FileText,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';

interface SubtaskItem {
  name: string;
  status: 'todo' | 'done' | 'paused';
  problem: string | null;
  solution: string | null;
}

interface ProjectItem {
  project: {
    name: string;
    id: string | null;
    isNew: boolean;
  };
  subtasks: SubtaskItem[];
  outputs: string[];
}

interface AIResult {
  items: ProjectItem[];
  summary: string;
}

const statusConfig = {
  todo: { label: '待办', icon: Circle, color: 'text-amber-600 bg-amber-50' },
  done: { label: '已办', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  paused: { label: '搁置', icon: PauseCircle, color: 'text-slate-500 bg-slate-100' },
};

export default function AIFillPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  const handleAnalyze = async () => {
    if (!description.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/ai/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'AI 分析失败');
        return;
      }

      setResult(data.result);
      // 默认展开所有项目
      if (data.result?.items) {
        setExpandedProjects(new Set(data.result.items.map((_: any, i: number) => i)));
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      alert('AI 分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (index: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const updateProjectName = (projectIndex: number, name: string) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].project.name = name;
    setResult(newResult);
  };

  const updateSubtask = (projectIndex: number, subtaskIndex: number, field: keyof SubtaskItem, value: any) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].subtasks[subtaskIndex] = {
      ...newResult.items[projectIndex].subtasks[subtaskIndex],
      [field]: value,
    };
    setResult(newResult);
  };

  const addSubtask = (projectIndex: number) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].subtasks.push({
      name: '',
      status: 'todo',
      problem: null,
      solution: null,
    });
    setResult(newResult);
  };

  const removeSubtask = (projectIndex: number, subtaskIndex: number) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].subtasks.splice(subtaskIndex, 1);
    setResult(newResult);
  };

  const updateOutput = (projectIndex: number, outputIndex: number, value: string) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].outputs[outputIndex] = value;
    setResult(newResult);
  };

  const addOutput = (projectIndex: number) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].outputs.push('');
    setResult(newResult);
  };

  const removeOutput = (projectIndex: number, outputIndex: number) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items[projectIndex].outputs.splice(outputIndex, 1);
    setResult(newResult);
  };

  const addNewProject = () => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items.push({
      project: { name: '', id: null, isNew: true },
      subtasks: [],
      outputs: [],
    });
    setResult(newResult);
  };

  const removeProject = (projectIndex: number) => {
    if (!result) return;
    const newResult = { ...result };
    newResult.items.splice(projectIndex, 1);
    setResult(newResult);
  };

  const handleConfirm = async () => {
    if (!result || result.items.length === 0) return;

    setSaving(true);
    const createdItems: string[] = [];

    try {
      for (const item of result.items) {
        if (!item.project.name.trim()) continue;

        let projectId = item.project.id;

        // 如果需要创建新项目
        if (item.project.isNew || !projectId) {
          const projectResponse = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: item.project.name,
              description: '',
            }),
          });

          const projectData = await projectResponse.json();

          if (!projectResponse.ok || !projectData.project) {
            throw new Error(`创建项目 "${item.project.name}" 失败: ${projectData.error}`);
          }

          projectId = projectData.project.id;
          createdItems.push(`项目: ${item.project.name}`);
        }

        // 创建子任务
        for (const subtask of item.subtasks) {
          if (!subtask.name.trim()) continue;

          const subtaskResponse = await fetch('/api/subtasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              project_id: projectId,
              name: subtask.name,
              status: subtask.status,
              problem: subtask.problem,
              solution: subtask.solution,
            }),
          });

          if (!subtaskResponse.ok) {
            const data = await subtaskResponse.json();
            throw new Error(`创建子任务 "${subtask.name}" 失败: ${data.error}`);
          }

          createdItems.push(`  - 子任务: ${subtask.name} (${statusConfig[subtask.status].label})`);
        }

        // 创建产出
        for (const output of item.outputs) {
          if (!output.trim()) continue;

          const outputResponse = await fetch('/api/outputs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              project_id: projectId,
              content: output,
            }),
          });

          if (!outputResponse.ok) {
            const data = await outputResponse.json();
            throw new Error(`创建产出失败: ${data.error}`);
          }

          createdItems.push(`  - 产出: ${output.substring(0, 20)}...`);
        }
      }

      alert(`批量创建成功！\n\n${createdItems.join('\n')}`);
      router.push('/projects');
    } catch (error) {
      console.error('保存失败:', error);
      alert(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const getTotalCounts = () => {
    if (!result) return { projects: 0, subtasks: 0, outputs: 0 };
    const projects = result.items.filter(i => i.project.name.trim()).length;
    const subtasks = result.items.reduce((sum, i) => sum + i.subtasks.filter(s => s.name.trim()).length, 0);
    const outputs = result.items.reduce((sum, i) => sum + i.outputs.filter(o => o.trim()).length, 0);
    return { projects, subtasks, outputs };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="mb-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-xl font-semibold text-slate-900">AI 智能填表</h1>
          <p className="text-slate-500 mt-1 text-sm">
            输入工作描述，AI 自动识别并批量创建项目和子任务
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Input Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              工作描述
            </CardTitle>
            <CardDescription className="text-sm">
              描述您的工作内容，AI 会自动识别项目、子任务和产出。支持多项目、多任务的批量识别。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`示例输入：
今天做了产品策划V1的用户调研，完成了10个访谈。遇到了用户配合度不高的问题，通过优化话术解决了。下午开始做技术方案设计，还没完成。

另外运营数据统计项目有个bug需要修复，已经定位到问题原因。

日常工作方面，回复了客户邮件，整理了文档。`}
              rows={6}
              className="mb-4 text-sm"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!description.trim() || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  开始分析
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Summary */}
            {result.summary && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">{result.summary}</p>
              </div>
            )}

            {/* Items */}
            {result.items.map((item, projectIndex) => {
              const isExpanded = expandedProjects.has(projectIndex);
              const subtaskCount = item.subtasks.filter(s => s.name.trim()).length;
              const outputCount = item.outputs.filter(o => o.trim()).length;

              return (
                <Card key={projectIndex} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleProject(projectIndex)}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          <Input
                            value={item.project.name}
                            onChange={(e) => updateProjectName(projectIndex, e.target.value)}
                            placeholder="项目名称"
                            className="font-medium border-0 shadow-none p-0 h-auto focus-visible:ring-0"
                          />
                          {item.project.isNew && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                              新建
                            </span>
                          )}
                          {item.project.id && !item.project.isNew && (
                            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded">
                              已存在
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {subtaskCount} 子任务 · {outputCount} 产出
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProject(projectIndex)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      {/* Subtasks */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            子任务
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addSubtask(projectIndex)}
                            className="h-6 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            添加
                          </Button>
                        </div>

                        {item.subtasks.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">暂无子任务</p>
                        ) : (
                          <div className="space-y-2">
                            {item.subtasks.map((subtask, subtaskIndex) => {
                              const StatusIcon = statusConfig[subtask.status].icon;
                              return (
                                <div
                                  key={subtaskIndex}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={subtask.name}
                                          onChange={(e) => updateSubtask(projectIndex, subtaskIndex, 'name', e.target.value)}
                                          placeholder="子任务名称"
                                          className="flex-1 h-8 text-sm"
                                        />
                                        <select
                                          value={subtask.status}
                                          onChange={(e) => updateSubtask(projectIndex, subtaskIndex, 'status', e.target.value)}
                                          className={`h-8 text-xs px-2 rounded-full border-0 cursor-pointer ${statusConfig[subtask.status as keyof typeof statusConfig].color}`}
                                        >
                                          <option value="todo">待办</option>
                                          <option value="done">已办</option>
                                          <option value="paused">搁置</option>
                                        </select>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          value={subtask.problem || ''}
                                          onChange={(e) => updateSubtask(projectIndex, subtaskIndex, 'problem', e.target.value || null)}
                                          placeholder="问题（可选）"
                                          className="h-7 text-xs"
                                        />
                                        <Input
                                          value={subtask.solution || ''}
                                          onChange={(e) => updateSubtask(projectIndex, subtaskIndex, 'solution', e.target.value || null)}
                                          placeholder="解决方案（可选）"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSubtask(projectIndex, subtaskIndex)}
                                      className="h-6 w-6 p-0 text-slate-400"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Outputs */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            产出
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addOutput(projectIndex)}
                            className="h-6 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            添加
                          </Button>
                        </div>

                        {item.outputs.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">暂无产出</p>
                        ) : (
                          <div className="space-y-2">
                            {item.outputs.map((output, outputIndex) => (
                              <div key={outputIndex} className="flex items-center gap-2">
                                <Input
                                  value={output}
                                  onChange={(e) => updateOutput(projectIndex, outputIndex, e.target.value)}
                                  placeholder="产出内容"
                                  className="flex-1 h-8 text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOutput(projectIndex, outputIndex)}
                                  className="h-6 w-6 p-0 text-slate-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* Add Project Button */}
            <Button
              variant="outline"
              onClick={addNewProject}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加项目
            </Button>

            {/* Confirm Actions */}
            <div className="flex gap-3 pt-4 sticky bottom-4">
              <Button
                variant="outline"
                onClick={() => setResult(null)}
                className="flex-1"
                disabled={saving}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={saving || result.items.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    确认创建
                    <span className="ml-2 text-xs opacity-80">
                      ({getTotalCounts().projects} 项目, {getTotalCounts().subtasks} 子任务, {getTotalCounts().outputs} 产出)
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
