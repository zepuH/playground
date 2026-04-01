'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  LogOut,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
  Circle,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  Database,
  ListTodo,
} from 'lucide-react';

interface Subtask {
  id: string;
  name: string;
  status: 'todo' | 'done' | 'paused';
  created_at: string;
  updated_at: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  priority: 'low' | 'medium' | 'high';
  subtask_count: number;
  output_count: number;
  todo_count: number;
  done_count: number;
  paused_count: number;
  subtasks?: Subtask[];
}

const statusConfig = {
  todo: { label: '待办', color: 'text-amber-600', bg: 'bg-amber-50', icon: Circle },
  done: { label: '已办', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  paused: { label: '搁置', color: 'text-gray-500', bg: 'bg-gray-100', icon: PauseCircle },
};

const priorityConfig = {
  low: { label: '低', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300' },
  medium: { label: '中', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300' },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectPriority, setNewProjectPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchProjects();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.status === 401) {
        router.push('/');
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      router.push('/');
    }
  };

  const fetchProjects = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const url = searchTerm
        ? `/api/projects?search=${encodeURIComponent(searchTerm)}&with_subtasks=true`
        : '/api/projects?with_subtasks=true';
      const response = await fetch(url, {
        credentials: 'include',
      });
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('获取项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects(search);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('请输入项目名称');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          priority: newProjectPriority,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewProjectName('');
        setNewProjectDescription('');
        fetchProjects();
      } else {
        alert(data.error || '创建项目失败');
      }
    } catch (error) {
      console.error('创建项目失败:', error);
      alert('创建项目失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('确定要删除这个项目吗？所有子任务和产出都会被删除。')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchProjects();
      } else {
        const data = await response.json();
        alert(data.error || '删除项目失败');
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      alert('删除项目失败，请重试');
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
        fetchProjects(search);
      } else {
        const data = await response.json();
        alert(data.error || '更新状态失败');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败，请重试');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        router.push('/');
      } else {
        const data = await response.json();
        alert(data.error || '登出失败');
      }
    } catch (error) {
      console.error('登出失败:', error);
      alert('登出失败，请重试');
    }
  };

  const getProgressPercentage = (project: Project) => {
    if (project.subtask_count === 0) return 0;
    return Math.round((project.done_count / project.subtask_count) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">项目管理系统</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索项目..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <Button type="submit" variant="secondary">
              搜索
            </Button>
          </form>

          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  创建项目
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新项目</DialogTitle>
                  <DialogDescription>
                    创建一个新项目来管理您的工作内容
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">项目名称</Label>
                    <Input
                      id="projectName"
                      placeholder="输入项目名称"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">项目描述（可选）</Label>
                    <Textarea
                      id="projectDescription"
                      placeholder="输入项目描述"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>优先级</Label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewProjectPriority(p)}
                          className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                            newProjectPriority === p 
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
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || creating}
                    className="w-full"
                  >
                    {creating ? '创建中...' : '创建项目'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => router.push('/ai-fill')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI 填表
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/all-todos')}
            >
              <ListTodo className="h-4 w-4 mr-2" />
              待办总览
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/ai-summary')}
            >
              <FileText className="h-4 w-4 mr-2" />
              工作总结
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/data-management')}
            >
              <Database className="h-4 w-4 mr-2" />
              数据管理
            </Button>
          </div>
        </div>

        {/* Multi-dimensional Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500 mb-4">还没有项目</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个项目
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
              <div className="col-span-3">项目名称</div>
              <div className="col-span-2 text-center">进度</div>
              <div className="col-span-1 text-center">待办</div>
              <div className="col-span-1 text-center">已办</div>
              <div className="col-span-1 text-center">搁置</div>
              <div className="col-span-1 text-center">产出</div>
              <div className="col-span-1 text-center">更新时间</div>
              <div className="col-span-2 text-right">操作</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100">
              {projects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const progress = getProgressPercentage(project);
                const subtasks = project.subtasks || [];

                return (
                  <div key={project.id}>
                    {/* Project Row */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
                      <div className="col-span-3 flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(project.id)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate">
                              {project.name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[project.priority || 'medium'].bg} ${priorityConfig[project.priority || 'medium'].color}`}>
                              {priorityConfig[project.priority || 'medium'].label}
                            </span>
                          </div>
                          {project.description && (
                            <div className="text-xs text-slate-500 truncate">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">
                            {progress}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                          {project.todo_count}
                        </span>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                          {project.done_count}
                        </span>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                          {project.paused_count}
                        </span>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="text-sm text-slate-600">
                          {project.output_count}
                        </span>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="text-xs text-slate-500">
                          {project.updated_at 
                            ? new Date(project.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                            : new Date(project.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                          }
                        </span>
                      </div>
                      
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/projects/${project.id}`)}
                          className="text-slate-500"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Subtasks */}
                    {isExpanded && subtasks.length > 0 && (
                      <div className="bg-slate-50 border-t border-slate-100">
                        <div className="pl-12 pr-4 py-2">
                          <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-slate-500 bg-white rounded-t-lg border border-slate-200 border-b-0">
                            <div className="col-span-5">子任务名称</div>
                            <div className="col-span-2 text-center">状态</div>
                            <div className="col-span-2 text-center">创建时间</div>
                            <div className="col-span-2 text-center">更新时间</div>
                            <div className="col-span-1"></div>
                          </div>
                          <div className="border border-t-0 border-slate-200 rounded-b-lg overflow-hidden divide-y divide-slate-100 bg-white">
                            {subtasks.map((subtask) => {
                              const config = statusConfig[subtask.status];
                              
                              return (
                                <div 
                                  key={subtask.id}
                                  className="grid grid-cols-12 gap-4 px-3 py-2 items-center hover:bg-slate-50"
                                >
                                  <div className="col-span-5 text-sm text-slate-700 truncate">
                                    {subtask.name}
                                  </div>
                                  <div className="col-span-2 flex justify-center">
                                    <select
                                      value={subtask.status}
                                      onChange={(e) => handleStatusChange(subtask.id, e.target.value as any)}
                                      className={`text-sm px-3 py-1 rounded-full border-0 cursor-pointer ${config.bg} ${config.color} font-medium`}
                                    >
                                      <option value="todo">待办</option>
                                      <option value="done">已办</option>
                                      <option value="paused">搁置</option>
                                    </select>
                                  </div>
                                  <div className="col-span-2 text-center text-xs text-slate-500">
                                    {new Date(subtask.created_at).toLocaleDateString('zh-CN')}
                                  </div>
                                  <div className="col-span-2 text-center text-xs text-slate-500">
                                    {subtask.updated_at 
                                      ? new Date(subtask.updated_at).toLocaleDateString('zh-CN')
                                      : '-'
                                    }
                                  </div>
                                  <div className="col-span-1 flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => router.push(`/projects/${project.id}`)}
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded Empty State */}
                    {isExpanded && subtasks.length === 0 && (
                      <div className="bg-slate-50 border-t border-slate-100">
                        <div className="pl-12 pr-4 py-4 text-center text-sm text-slate-400">
                          暂无子任务，点击详情页添加
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
