import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add role-based logic here if needed
    return;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public routes that don't require authentication
        const publicPaths = [
          '/',
          '/about',
          '/contact',
          '/services',
          '/tournaments',
          '/booking',
          '/auction',
          '/auctions',
          '/auction/live',
          '/live-auction',
          '/overlay',
          '/register',
          '/api/auth',
          '/login'
        ];

        const { pathname } = req.nextUrl;
        
        // Check if path is public
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true;
        }

        // Admin routes require authentication and admin role
        if (pathname.startsWith('/admin')) {
          return token?.role === 'admin';
        }

        // Other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.webmanifest, icon-192.png, icon-512.png (PWA/static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png).*)',
  ],
};
