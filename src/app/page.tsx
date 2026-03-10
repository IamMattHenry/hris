import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#3b0a0a] to-[#1e0000] text-center text-yellow-400 p-4">
      <div className="flex flex-col items-center space-y-4">
        <Image
          src="/logo/celestia-logo.png" // Place your logo file in /public folder and rename it
          alt="Celestia Logo"
          width={520}
          height={520}
          className="w-64 h-64 md:w-96 md:h-96 drop-shadow-[0_0_15px_rgba(255,200,0,0.4)]"
        />
        <h1 className="text-3xl md:text-4xl font-thin tracking-widest font-abril">CELESTIA HOTEL</h1>
        <p className="text-md md:text-lg text-yellow-300 font-medium font-arial">Human Resource Information System</p>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 mt-4">
          <Link href="/login_hr" className="mt-6 px-8 py-3 bg-none from-yellow-500 to-yellow-600 text-yellow font-poppins rounded-full shadow-[0_0_10px_rgba(255,200,0,0.5)] hover:shadow-[0_0_20px_rgba(255,200,0,0.7)] transition duration-300 w-full md:w-auto text-center">
            Admin Portal
          </Link>
          <Link href="/portal" className="mt-6 px-8 py-3 bg-none from-yellow-500 to-yellow-600 text-yellow font-poppins rounded-full shadow-[0_0_10px_rgba(255,200,0,0.5)] hover:shadow-[0_0_20px_rgba(255,200,0,0.7)] transition duration-300 w-full md:w-auto text-center">
            Employee Portal
          </Link>
          <Link href="/attendance_system" className="mt-6 px-8 py-3 bg-none from-yellow-500 to-yellow-600 text-yellow font-poppins rounded-full shadow-[0_0_10px_rgba(255,200,0,0.5)] hover:shadow-[0_0_20px_rgba(255,200,0,0.7)] transition duration-300 w-full md:w-auto text-center">
          Attendance System
          </Link>
        </div>

      </div>
      <div className="absolute bottom-4 left-0 right-0 md:left-4 text-xs text-yellow-800 opacity-60">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start">
          <Image src="/logo/logo_outline.png" alt="Celestia Logo" width={32} height={32} className="w-8 h-8"/>
          <span className="ml-1 text-sm md:text-base">© Celestia Hotel {new Date().getFullYear()}</span>
        </div>
      </div>
    </main>
  );
}
