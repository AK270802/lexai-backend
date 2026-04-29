'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';

export default function NewMatterPage() {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    type: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/matters/', formData);
      router.push('/matters');
    } catch (error) {
      console.error('Failed to create matter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/matters">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Create New Matter</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Start a new legal matter or case</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Matter Name</Label>
          <Input 
            id="name" 
            placeholder="e.g., Smith Contract Review" 
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client">Client</Label>
          <Input 
            id="client" 
            placeholder="e.g., John Smith" 
            value={formData.client}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Matter Type</Label>
          <Input 
            id="type" 
            placeholder="e.g., Contract Review" 
            value={formData.type}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input 
            id="description" 
            placeholder="Brief description of the matter" 
            value={formData.description}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Matter...
            </>
          ) : (
            'Create Matter'
          )}
        </Button>
      </form>
    </div>
  );
}
