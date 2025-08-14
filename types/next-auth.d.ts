import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      slug: string;
      role: string;
      image?: string;
    };
  }

  interface User {
    id: string;
    slug: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    slug: string;
    role: string;
  }
}