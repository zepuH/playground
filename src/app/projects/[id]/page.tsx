'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Circle, 
  CheckCircle2, 
  PauseCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
} from 'lucide-react';

interface Subtask {
  id: string;
  name: string;
  problem: string | null;
  solution: string | null;
  status: 'todo' | 'done' | 'paused';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string | null;
}

interface Output {
  id: string;
  content: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  subtasks: Subtask[];
  outputs: Output[];
}

const statusConfig = {
  todo: { label: '待办', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Circle },
  done: { label: '已办', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  paused: { label: '搁置', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', icon: PauseCircle },
};

const priorityConfig = {
  low: { label: '低', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300' },
  medium: { label: '中', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300' },
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [outputDialogOpen, setOutputDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editSubtask, setEditSubtask] = useState<Subtask | null>(null);
  const [editOutput, setEditOutput] = useState<Output | null>(null);
  const [expandedSubtask, setExpandedSubtask] = useState<string | null>(null);

  const [subtaskName, setSubtaskName] = useState('');
  const [subtaskProblem, setSubtaskProblem] = useState('');
  const [subtaskSolution, setSubtaskSolution] = useState('');
  const [subtaskStatus, setSubtaskStatus] = useState<'todo' | 'done' | 'paused'>('todo');
  const [subtaskPriority, setSubtaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [outputContent, setOutputContent] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectPriority, setProjectPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setProject(data.project);
    } catch (error) {
      console.error('获取项目详情失败:', error);
      alert('获取项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtask = async () => {
    if (!subtaskName.trim()) {
      alert('请输入子任务名称');
      return;
    }

    try {
      const response = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          name: subtaskName,
          problem: subtaskProblem,
          solution: subtaskSolution,
          status: subtaskStatus,
          priority: subtaskPriority,
        }),
      });

      if (response.ok) {
        setSubtaskDialogOpen(false);
        resetSubtaskForm();
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '创建子任务失败');
      }
    } catch (error) {
      console.error('创建子任务失败:', error);
      alert('创建子任务失败，请重试');
    }
  };

  const handleUpdateSubtask = async () => {
    if (!editSubtask || !subtaskName.trim()) {
      alert('请输入子任务名称');
      return;
    }

    try {
      const response = await fetch(`/api/subtasks/${editSubtask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: subtaskName,
          problem: subtaskProblem,
          solution: subtaskSolution,
          status: subtaskStatus,
          priority: subtaskPriority,
        }),
      });

      if (response.ok) {
        setSubtaskDialogOpen(false);
        setEditSubtask(null);
        resetSubtaskForm();
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '更新子任务失败');
      }
    } catch (error) {
      console.error('更新子任务失败:', error);
      alert('更新子任务失败，请重试');
    }
  };

  const handleStatusChange = async (subtaskId: string, newStatus: 'todo' | 'done' | 'paused') => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '更新状态失败');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败，请重试');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('确定要删除这个子任务吗？')) return;

    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '删除子任务失败');
      }
    } catch (error) {
      console.error('删除子任务失败:', error);
      alert('删除子任务失败，请重试');
    }
  };

  const handleCreateOutput = async () => {
    if (!outputContent.trim()) {
      alert('请输入产出内容');
      return;
    }

    try {
      const response = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          content: outputContent,
        }),
      });

      if (response.ok) {
        setOutputDialogOpen(false);
        setOutputContent('');
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '创建产出失败');
      }
    } catch (error) {
      console.error('创建产出失败:', error);
      alert('创建产出失败，请重试');
    }
  };

  const handleUpdateOutput = async () => {
    if (!editOutput || !outputContent.trim()) {
      alert('请输入产出内容');
      return;
    }

    try {
      const response = await fetch(`/api/outputs/${editOutput.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: outputContent,
        }),
      });

      if (response.ok) {
        setOutputDialogOpen(false);
        setEditOutput(null);
        setOutputContent('');
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '更新产出失败');
      }
    } catch (error) {
      console.error('更新产出失败:', error);
      alert('更新产出失败，请重试');
    }
  };

  const handleDeleteOutput = async (outputId: string) => {
    if (!confirm('确定要删除这条产出吗？')) return;

    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '删除产出失败');
      }
    } catch (error) {
      console.error('删除产出失败:', error);
      alert('删除产出失败，请重试');
    }
  };

  const resetSubtaskForm = () => {
    setSubtaskName('');
    setSubtaskProblem('');
    setSubtaskSolution('');
    setSubtaskStatus('todo');
    setSubtaskPriority('medium');
  };

  const openEditSubtask = (subtask: Subtask) => {
    setEditSubtask(subtask);
    setSubtaskName(subtask.name);
    setSubtaskProblem(subtask.problem || '');
    setSubtaskSolution(subtask.solution || '');
    setSubtaskStatus(subtask.status);
    setSubtaskPriority(subtask.priority || 'medium');
    setSubtaskDialogOpen(true);
  };

  const openEditOutput = (output: Output) => {
    setEditOutput(output);
    setOutputContent(output.content);
    setOutputDialogOpen(true);
  };

  const openEditProject = () => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description || '');
      setProjectPriority(project.priority || 'medium');
      setProjectDialogOpen(true);
    }
  };

  const handleUpdateProject = async () => {
    if (!projectName.trim()) {
      alert('请输入项目名称');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          priority: projectPriority,
        }),
      });

      if (response.ok) {
        setProjectDialogOpen(false);
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || '更新项目失败');
      }
    } catch (error) {
      console.error('更新项目失败:', error);
      alert('更新项目失败，请重试');
    }
  };

  const getProgressStats = () => {
    if (!project) return { todo: 0, done: 0, paused: 0, progress: 0 };
    const todo = project.subtasks.filter(s => s.status === 'todo').length;
    const done = project.subtasks.filter(s => s.status === 'done').length;
    const paused = project.subtasks.filter(s => s.status === 'paused').length;
    const total = project.subtasks.length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, done, paused, progress };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">项目不存在</p>
      </div>
    );
  }

  const stats = getProgressStats();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="mb-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目列表
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
                <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[project.priority || 'medium'].bg} ${priorityConfig[project.priority || 'medium'].color}`}>
                  {priorityConfig[project.priority || 'medium'].label}优先
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openEditProject}
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
              {project.description && (
                <p className="text-slate-500 mt-1 text-sm">{project.description}</p>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {project.subtasks.length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
              <span className="text-sm text-slate-500">{stats.progress}% 完成</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Subtasks */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  子任务
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({project.subtasks.length})
                  </span>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditSubtask(null);
                    resetSubtaskForm();
                    setSubtaskDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
              
              {/* Status Summary */}
              {project.subtasks.length > 0 && (
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Circle className="h-3 w-3 text-amber-500" />
                    <span className="text-slate-600">待办 {stats.todo}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-slate-600">已办 {stats.done}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <PauseCircle className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">搁置 {stats.paused}</span>
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {project.subtasks.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">暂无子任务</p>
              ) : (
                <div className="space-y-2">
                  {project.subtasks.map((subtask) => {
                    const config = statusConfig[subtask.status];
                    const Icon = config.icon;
                    const isExpanded = expandedSubtask === subtask.id;
                    
                    return (
                      <div
                        key={subtask.id}
                        className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                                <span className="font-medium text-slate-800 truncate">
                                  {subtask.name}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[subtask.priority || 'medium'].bg} ${priorityConfig[subtask.priority || 'medium'].color}`}>
                                  {priorityConfig[subtask.priority || 'medium'].label}
                                </span>
                              </div>
                              
                              {/* Status Selector */}
                              <div className="mt-2 flex items-center gap-3">
                                <select
                                  value={subtask.status}
                                  onChange={(e) => handleStatusChange(subtask.id, e.target.value as any)}
                                  className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${config.bg} ${config.color} font-medium`}
                                >
                                  <option value="todo">待办</option>
                                  <option value="done">已办</option>
                                  <option value="paused">搁置</option>
                                </select>
                                <span className="text-xs text-slate-400">
                                  创建: {new Date(subtask.created_at).toLocaleDateString('zh-CN')}
                                  {subtask.updated_at && (
                                    <span className="ml-2">
                                      更新: {new Date(subtask.updated_at).toLocaleDateString('zh-CN')}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(subtask.problem || subtask.solution) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedSubtask(isExpanded ? null : subtask.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSubtask(subtask)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSubtask(subtask.id)}
                                className="h-6 w-6 p-0 text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {isExpanded && (subtask.problem || subtask.solution) && (
                            <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
                              {subtask.problem && (
                                <div>
                                  <span className="text-xs font-medium text-slate-500">问题：</span>
                                  <p className="text-sm text-slate-700 mt-1">{subtask.problem}</p>
                                </div>
                              )}
                              {subtask.solution && (
                                <div>
                                  <span className="text-xs font-medium text-slate-500">解决方案：</span>
                                  <p className="text-sm text-slate-700 mt-1">{subtask.solution}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outputs */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  产出记录
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({project.outputs.length})
                  </span>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditOutput(null);
                    setOutputContent('');
                    setOutputDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.outputs.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">暂无产出</p>
              ) : (
                <div className="space-y-2">
                  {project.outputs.map((output) => (
                    <div
                      key={output.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 mb-1">
                            {new Date(output.created_at).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {output.content}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditOutput(output)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOutput(output.id)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Subtask Dialog */}
      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editSubtask ? '编辑子任务' : '添加子任务'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>子任务名称</Label>
              <Input
                value={subtaskName}
                onChange={(e) => setSubtaskName(e.target.value)}
                placeholder="输入子任务名称"
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <div className="flex gap-2">
                {(['todo', 'done', 'paused'] as const).map((status) => {
                  const config = statusConfig[status];
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSubtaskStatus(status)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                        subtaskStatus === status 
                          ? `${config.border} ${config.bg} ${config.color}` 
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSubtaskPriority(p)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                      subtaskPriority === p 
                        ? `${priorityConfig[p].border} ${priorityConfig[p].bg} ${priorityConfig[p].color}` 
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{priorityConfig[p].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>遇到的问题（可选）</Label>
              <Textarea
                value={subtaskProblem}
                onChange={(e) => setSubtaskProblem(e.target.value)}
                placeholder="描述遇到的问题"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>解决方案（可选）</Label>
              <Textarea
                value={subtaskSolution}
                onChange={(e) => setSubtaskSolution(e.target.value)}
                placeholder="描述解决方案"
                rows={2}
              />
            </div>
            <Button
              onClick={editSubtask ? handleUpdateSubtask : handleCreateSubtask}
              disabled={!subtaskName.trim()}
              className="w-full"
            >
              {editSubtask ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Output Dialog */}
      <Dialog open={outputDialogOpen} onOpenChange={setOutputDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editOutput ? '编辑产出' : '添加产出'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>产出内容</Label>
              <Textarea
                value={outputContent}
                onChange={(e) => setOutputContent(e.target.value)}
                placeholder="描述产出内容"
                rows={4}
              />
            </div>
            <Button
              onClick={editOutput ? handleUpdateOutput : handleCreateOutput}
              disabled={!outputContent.trim()}
              className="w-full"
            >
              {editOutput ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="输入项目名称"
              />
            </div>
            <div className="space-y-2">
              <Label>项目描述（可选）</Label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="输入项目描述"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProjectPriority(p)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                      projectPriority === p 
                        ? `${priorityConfig[p].border} ${priorityConfig[p].bg} ${priorityConfig[p].color}` 
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{priorityConfig[p].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleUpdateProject}
              disabled={!projectName.trim()}
              className="w-full"
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
