'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Circle,
  CheckCircle2,
  PauseCircle,
  ListTodo,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface Subtask {
  id: string;
  name: string;
  status: 'todo' | 'done' | 'paused';
  priority: 'low' | 'medium' | 'high';
  problem: string | null;
  solution: string | null;
  created_at: string;
  updated_at: string | null;
  project_id: string;
  project_name: string;
}

interface Stats {
  todo: number;
  done: number;
  paused: number;
  total: number;
}

const priorityConfig = {
  low: { label: '低', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300' },
  medium: { label: '中', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300' },
};

export default function AllTodosPage() {
  const router = useRouter();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [stats, setStats] = useState<Stats>({ todo: 0, done: 0, paused: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'todo' | 'done' | 'paused'>('all');

  useEffect(() => {
    fetchSubtasks();
  }, []);

  const fetchSubtasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subtasks/all', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setSubtasks(data.subtasks);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('获取待办失败:', error);
    } finally {
      setLoading(false);
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
        // 更新本地数据
        setSubtasks(prev =>
          prev.map(s => (s.id === subtaskId ? { ...s, status: newStatus } : s))
        );
        // 重新计算统计
        setStats(prev => {
          const oldSubtask = subtasks.find(s => s.id === subtaskId);
          if (!oldSubtask) return prev;
          
          const newStats = { ...prev };
          newStats[oldSubtask.status]--;
          newStats[newStatus]++;
          return newStats;
        });
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const filteredSubtasks = subtasks.filter(s => filter === 'all' || s.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'paused':
        return <PauseCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Circle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-50 border-green-200';
      case 'paused':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="mb-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            待办总览
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            一眼看到所有待办及其所属项目
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card
            className={`cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter('all')}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
              <div className="text-xs text-slate-500">全部</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filter === 'todo' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter('todo')}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-600">{stats.todo}</div>
              <div className="text-xs text-slate-500">待办</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filter === 'done' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter('done')}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.done}</div>
              <div className="text-xs text-slate-500">已办</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filter === 'paused' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter('paused')}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.paused}</div>
              <div className="text-xs text-slate-500">搁置</div>
            </CardContent>
          </Card>
        </div>

        {/* 待办列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredSubtasks.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-500">
              {filter === 'all' ? '暂无待办事项' : `暂无${filter === 'todo' ? '待办' : filter === 'done' ? '已办' : '搁置'}事项`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSubtasks.map(subtask => (
              <Card
                key={subtask.id}
                className={`border transition-all hover:shadow-md ${getStatusColor(subtask.status)}`}
              >
                <CardContent className="py-4 px-4">
                  <div className="flex items-start gap-3">
                    {/* 状态切换 */}
                    <button
                      onClick={() => {
                        const statuses: ('todo' | 'done' | 'paused')[] = ['todo', 'done', 'paused'];
                        const currentIndex = statuses.indexOf(subtask.status);
                        const nextStatus = statuses[(currentIndex + 1) % 3];
                        handleStatusChange(subtask.id, nextStatus);
                      }}
                      className="mt-0.5 hover:scale-110 transition-transform"
                      title="点击切换状态"
                    >
                      {getStatusIcon(subtask.status)}
                    </button>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-medium ${
                            subtask.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {subtask.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[subtask.priority || 'medium'].bg} ${priorityConfig[subtask.priority || 'medium'].color}`}>
                          {priorityConfig[subtask.priority || 'medium'].label}
                        </span>
                      </div>

                      {/* 所属项目 */}
                      <button
                        onClick={() => router.push(`/projects/${subtask.project_id}`)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {subtask.project_name}
                      </button>

                      {/* 问题和解决方案 */}
                      <div className="text-sm space-y-1">
                        {subtask.problem && (
                          <div className="text-red-600">
                            <span className="font-medium">问题：</span>
                            {subtask.problem}
                          </div>
                        )}
                        {subtask.solution && (
                          <div className="text-green-600">
                            <span className="font-medium">解决：</span>
                            {subtask.solution}
                          </div>
                        )}
                      </div>

                      {/* 时间 */}
                      <div className="text-xs text-slate-400 mt-2">
                        {subtask.updated_at
                          ? `更新于 ${new Date(subtask.updated_at).toLocaleString('zh-CN')}`
                          : `创建于 ${new Date(subtask.created_at).toLocaleString('zh-CN')}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
