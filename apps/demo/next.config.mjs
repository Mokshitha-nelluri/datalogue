/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['datalogue', 'datalogue-react'],
  serverExternalPackages: ['better-sqlite3', '@anthropic-ai/sdk', 'openai'],
};

export default nextConfig;
