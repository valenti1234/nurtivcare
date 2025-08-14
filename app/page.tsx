import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Heart className="h-12 w-12 text-teal-600" />
          <h1 className="text-4xl font-bold text-gray-900">Nurtiv</h1>
        </div>
        <div className="space-y-4">
          <p className="text-lg text-gray-600">AI-powered care assistant</p>
          <div className="space-x-4">
            <Link href="/login">
              <Button className="bg-teal-600 hover:bg-teal-700">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}