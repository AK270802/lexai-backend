'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';

export default function DocumentUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      router.push('/documents');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Upload Document</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Upload and analyze a legal document</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12">
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-12 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
          <Upload className="w-16 h-16 mx-auto text-zinc-400 mb-4" />
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">Drop your document here</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">or click to browse</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Supports PDF, DOCX, and TXT files</p>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt"
            className="block w-full text-sm text-zinc-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <FileText className="w-5 h-5 inline mr-2 text-zinc-500" />
              <span className="text-sm text-zinc-900 dark:text-zinc-50">{file.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/documents')}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
      </div>
    </div>
  );
}
