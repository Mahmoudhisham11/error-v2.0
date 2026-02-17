import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // تم حذف experimental.turbo لأنه غير مدعوم في Next.js 15
};

export default withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
})(nextConfig);
