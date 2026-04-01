import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 获取 user_id cookie
  const userId = request.cookies.get('user_id')?.value;
  
  console.log('Middleware - Path:', pathname);
  console.log('Middleware - userId:', userId);
  
  // 公开路径（不需要登录）
  const publicPaths = ['/', '/register'];
  
  // 如果是公开路径，直接放行
  if (publicPaths.includes(pathname)) {
    // 如果已登录且访问登录/注册页，重定向到项目页
    if (userId && pathname === '/') {
      return NextResponse.redirect(new URL('/projects', request.url));
    }
    return NextResponse.next();
  }
  
  // 静态资源和 API 路由跳过检查
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // 需要登录的路径，检查是否已登录
  if (!userId) {
    console.log('Middleware - No userId, redirecting to login');
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  console.log('Middleware - User authenticated, proceeding');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
