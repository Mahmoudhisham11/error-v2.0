import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // إعداد Turbopack لـ Next.js 16
    turbopack: {},
};

export default withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
})(nextConfig);
