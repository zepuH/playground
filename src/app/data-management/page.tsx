'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ImportResult {
  projects: { success: number; failed: number };
  subtasks: { success: number; failed: number };
  outputs: { success: number; failed: number };
}

export default function DataManagementPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/data/export', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '导出失败');
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'project-data.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('导出失败:', e);
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
      setError('请选择 Excel 文件 (.xlsx)');
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/data/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '导入失败');
      }

      setImportResult(data.result);
    } catch (e) {
      console.error('导入失败:', e);
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setImporting(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
          <h1 className="text-xl font-semibold text-slate-900">数据管理</h1>
          <p className="text-slate-500 mt-1 text-sm">
            导出或导入您的项目数据
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 说明 */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-800 mb-1">使用说明</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>导出的 Excel 文件包含项目、子任务、产出三个工作表</li>
                  <li>导入时会根据项目名称创建新项目，不重复导入已有项目</li>
                  <li>建议先在测试环境导出数据，再导入到生产环境</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <Card className="border-slate-200 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                导入完成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-700">项目</div>
                  <div className="mt-1">
                    <span className="text-green-600">{importResult.projects.success} 成功</span>
                    {importResult.projects.failed > 0 && (
                      <span className="text-red-600 ml-2">{importResult.projects.failed} 失败</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-700">子任务</div>
                  <div className="mt-1">
                    <span className="text-green-600">{importResult.subtasks.success} 成功</span>
                    {importResult.subtasks.failed > 0 && (
                      <span className="text-red-600 ml-2">{importResult.subtasks.failed} 失败</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-700">产出</div>
                  <div className="mt-1">
                    <span className="text-green-600">{importResult.outputs.success} 成功</span>
                    {importResult.outputs.failed > 0 && (
                      <span className="text-red-600 ml-2">{importResult.outputs.failed} 失败</span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/projects')}
                className="mt-4"
              >
                查看项目列表
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 操作卡片 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 导出 */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                导出数据
              </CardTitle>
              <CardDescription>
                将所有项目数据导出为 Excel 文件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    导出 Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 导入 */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                导入数据
              </CardTitle>
              <CardDescription>
                从 Excel 文件导入项目数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                onClick={triggerFileInput}
                disabled={importing}
                variant="outline"
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    选择文件导入
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500 mt-2 text-center">
                支持 .xlsx 格式
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 注意事项 */}
        <Card className="border-amber-200 bg-amber-50 mt-6">
          <CardContent className="pt-6">
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-2">⚠️ 注意事项</p>
              <ul className="list-disc list-inside space-y-1">
                <li>导入操作会创建新数据，不会覆盖现有数据</li>
                <li>如果项目名称已存在，会创建同名的新项目</li>
                <li>建议在导入前先备份现有数据（导出一份）</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
