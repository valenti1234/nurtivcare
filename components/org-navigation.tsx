'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Clock, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgNavigationProps {
  orgSlug: string;
  userRole?: string;
}

export function OrgNavigation({ orgSlug, userRole }: OrgNavigationProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Patients',
      href: `/org/${orgSlug}/patients`,
      icon: Users,
      roles: ['OWNER', 'ADMIN', 'CARER', 'VIEWER']
    },
    {
      name: 'Shifts',
      href: `/org/${orgSlug}/shifts`,
      icon: Clock,
      roles: ['OWNER', 'ADMIN', 'CARER']
    }
  ];

  const filteredItems = navigationItems.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  return (
    <nav className="flex items-center gap-1">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-teal-100 text-teal-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}