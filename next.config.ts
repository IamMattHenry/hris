import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
	turbopack: {
	  root: __dirname,
	},
	devIndicators: {
	  appIsRunning: false,
	},
	eslint: {
	  // Disable ESLint during production builds so lint warnings/errors
	  // don't cause Vercel builds to fail. Safe for demo deployments.
	  ignoreDuringBuilds: true,
	},
};

export default nextConfig;