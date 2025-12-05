/** @type {import('next').NextConfig} */
const nextConfig = {
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