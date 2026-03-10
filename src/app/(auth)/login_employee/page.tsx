import LoginForm from "./loginform";

export default function LoginPage() {
  return (
    <div className="bg-white/10 backdrop-blur-sm p-8 sm:p-12 rounded-2xl border-white shadow-lg w-full max-w-sm">
      <h1 className="text-center text-xl sm:text-2xl font-semibold font-poppins text-white mb-8 sm:mb-10">
        EMPLOYEE LOGIN
      </h1>
      <LoginForm />
    </div>
  );
}
