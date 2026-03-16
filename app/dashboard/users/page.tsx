import { UsersContent } from '@/components/dashboard';

export type AuthProvider = 'email' | 'google' | 'github';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  provider: AuthProvider;
  createdAt: string;
  lastActive: string;
}

// This would come from your database in a real app
async function getUsers(): Promise<User[]> {
  const users: User[] = [
    {
      id: '1',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      role: 'admin',
      status: 'active',
      provider: 'email',
      createdAt: 'Mar 14, 2025',
      lastActive: 'Today',
    },
    {
      id: '2',
      name: 'Marcus Chen',
      email: 'marcus@gmail.com',
      role: 'user',
      status: 'active',
      provider: 'google',
      createdAt: 'Mar 14, 2025',
      lastActive: 'Today',
    },
    {
      id: '3',
      name: 'Sarah Jenkins',
      email: 'sarah@example.com',
      role: 'user',
      status: 'pending',
      provider: 'email',
      createdAt: 'Mar 13, 2025',
      lastActive: 'Never',
    },
    {
      id: '4',
      name: 'David O\'Connor',
      email: 'david@example.com',
      role: 'user',
      status: 'inactive',
      provider: 'github',
      createdAt: 'Mar 12, 2025',
      lastActive: '2 weeks ago',
    },
    {
      id: '5',
      name: 'Ana Martinez',
      email: 'ana@example.com',
      role: 'moderator',
      status: 'active',
      provider: 'google',
      createdAt: 'Mar 11, 2025',
      lastActive: 'Yesterday',
    },
    {
      id: '6',
      name: 'James Wilson',
      email: 'james@example.com',
      role: 'user',
      status: 'active',
      provider: 'email',
      createdAt: 'Mar 10, 2025',
      lastActive: '3 days ago',
    },
    {
      id: '7',
      name: 'Lisa Thompson',
      email: 'lisa@example.com',
      role: 'user',
      status: 'active',
      provider: 'github',
      createdAt: 'Mar 9, 2025',
      lastActive: 'Today',
    },
    {
      id: '8',
      name: 'Robert Brown',
      email: 'robert@example.com',
      role: 'admin',
      status: 'active',
      provider: 'email',
      createdAt: 'Mar 8, 2025',
      lastActive: 'Today',
    },
  ];

  return users;
}

export default async function UsersPage() {
  const users = await getUsers();

  return <UsersContent users={users} isAdmin={true} />;
}
