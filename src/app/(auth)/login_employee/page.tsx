import LoginForm from "./loginform";

export default function LoginPage() {
  return (
    <div className="bg-white/10 backdrop-blur-sm p-12 rounded-2xl border-white shadow-lg w-[400px]">
      <h1 className="text-center text-2xl font-semibold font-poppins font-poppins text-white mb-10">
        EMPLOYEE LOGIN
      </h1>
     {/* <LoginForm /> */} 
      <LoginForm />
    </div>
  );
}
