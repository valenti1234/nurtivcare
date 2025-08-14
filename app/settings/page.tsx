'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft, Bell, Shield, Palette, Globe } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const settingsCategories = [
    {
      title: 'Notifications',
      description: 'Manage your notification preferences',
      icon: Bell,
      href: '/settings/notifications',
      available: false
    },
    {
      title: 'Security',
      description: 'Password and security settings',
      icon: Shield,
      href: '/settings/security',
      available: false
    },
    {
      title: 'Appearance',
      description: 'Customize the look and feel',
      icon: Palette,
      href: '/settings/appearance',
      available: false
    },
    {
      title: 'Language & Region',
      description: 'Set your language and regional preferences',
      icon: Globe,
      href: '/settings/language',
      available: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-600" />
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Settings</h2>
          <p className="text-gray-600">
            Manage your account preferences and application settings.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card key={category.title} className={!category.available ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {category.available ? (
                    <Link href={category.href}>
                      <Button variant="outline" className="w-full">
                        Configure
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common settings and account management options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link href="/profile">
                  <Button variant="outline">
                    Edit Profile
                  </Button>
                </Link>
                <Button variant="outline" disabled>
                  Change Password
                </Button>
                <Button variant="outline" disabled>
                  Export Data
                </Button>
                <Button variant="outline" disabled>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}