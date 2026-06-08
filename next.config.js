cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'unpkg.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
EOF