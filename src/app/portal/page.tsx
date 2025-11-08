import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#041f1e] to-[#073532] text-center text-yellow-400">
      <div className="flex flex-col items-center space-y-4">
        <Image
          src="/logo/celestia-logo.png" // Place your logo file in /public folder and rename it
          alt="Celestia Logo"
          width={520}
          height={520}
          className="drop-shadow-[0_0_15px_rgba(255,200,0,0.4)]"
        />
        <h1 className="text-4xl font-thin tracking-widest font-abril">CELESTIA HOTEL</h1>
        <p className="text-lg text-yellow-300 font-medium font-arial">Hotel Employee Portal</p>
         <Link href="/login_employee" className="mt-6 px-8 py-3 bg-none from-yellow-500 to-yellow-600 text-yellow font-poppins rounded-full shadow-[0_0_10px_rgba(255,200,0,0.5)] hover:shadow-[0_0_20px_rgba(255,200,0,0.7)] transition duration-300">
          Get Started
        </Link>
      </div>   
      <div className="absolute bottom-4 left-4 text-xs text-white opacity-60">
        <div className="flex flex-column items-center">
          <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={48} height={48} />
          <span className="ml-1 text-sm">© Celestia Hotel 2025</span>
        </div>
      </div>
    </main>
  );
}
