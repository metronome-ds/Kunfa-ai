'use client';

import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <Construction className="h-12 w-12 text-gray-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 text-center max-w-md">
        {description || 'This feature is currently under development and will be available soon.'}
      </p>
      <p className="text-gray-400 text-sm mt-4">We&apos;ll notify you when this is ready.</p>
    </div>
  );
}
