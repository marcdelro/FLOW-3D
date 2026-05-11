import { Link } from "react-router-dom";

export function Register() {
  return <StubCard title="Register" body="Account sign-up is not wired up yet. Check back soon." />;
}

export function StubCard({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur px-8 py-10 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 items-center justify-center mb-5">
          <span className="text-2xl font-bold text-blue-300">3D</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-gray-400">{body}</p>
        <p className="mt-2 text-sm text-gray-500">Coming soon.</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/"
            className="rounded-lg px-4 py-2.5 bg-white text-gray-900 font-semibold hover:bg-gray-200 transition"
          >
            Back to home
          </Link>
          <Link to="/app" className="text-sm text-blue-300 hover:text-blue-200 underline underline-offset-2">
            Open the simulator preview
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Register;
