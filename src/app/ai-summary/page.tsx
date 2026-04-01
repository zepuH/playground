'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileText, Loader2, Send, Copy } from 'lucide-react';

export default function AISummaryPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 设置默认日期范围（最近一周）
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setSummary('');
    setConversationHistory([]);

    try {
      // 将日期转换为 ISO 格式，确保包含完整的时间范围
      // 开始日期从 00:00:00 开始
      const startIso = `${startDate}T00:00:00.000Z`;
      // 结束日期到 23:59:59 结束
      const endIso = `${endDate}T23:59:59.999Z`;

      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startIso,
          endDate: endIso,
        }),
      });

      if (!response.ok) {
        throw new Error('生成总结失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          setSummary((prev) => prev + chunk);
        }
      }

      // 更新对话历史
      setConversationHistory([
        { role: 'assistant', content: summary },
      ]);
    } catch (error) {
      console.error('生成总结失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || loading) return;

    setLoading(true);
    const newUserMessage = userMessage;
    setUserMessage('');

    // 更新对话历史（包含用户新消息）
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: newUserMessage },
    ];
    setConversationHistory(newHistory);

    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          conversationHistory: newHistory.slice(0, -1), // 不包含最新的用户消息
          userMessage: newUserMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('生成总结失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let newSummary = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          newSummary += chunk;
          setSummary((prev) => prev + chunk);
        }
      }

      // 更新对话历史（包含 AI 回复）
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: newSummary },
      ]);
    } catch (error) {
      console.error('生成总结失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">AI 工作总结</h1>
          <p className="text-gray-600 mt-1">
            选择时间段，AI 会自动生成工作总结
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              选择时间段
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!startDate || !endDate || loading}
              className="w-full"
            >
              {loading && !summary ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  生成总结
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {summary && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>工作总结</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  复制
                </Button>
              </div>
              <CardDescription>
                时间段：{startDate} 至 {endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={summaryRef}
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: summary
                    .replace(/\n/g, '<br>')
                    .replace(/#{1,6}\s/g, '<strong>$&</strong>'),
                }}
              />
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>调整总结</CardTitle>
              <CardDescription>
                输入您的需求来调整总结内容，例如：&quot;请重点突出产品策划V1项目的进展&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="输入您的需求..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={!userMessage.trim() || loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
