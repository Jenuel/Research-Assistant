import { useState } from 'react';
import { Link } from 'react-router-dom';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (email.trim() === '' || password.trim() === '') {
            setError('Please fill in both email and password.');
            return;
        }

        // Simulate login logic
        console.log('Logging in with:', { email, password });

        // Reset fields on success (optional)
        setEmail('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Section */}
            <div className="w-3/4 bg-blue-900 text-white p-12 flex flex-col justify-center">
                <h1 className="text-6xl font-bold mb-6">Focus on research that matters</h1>
                <p className="mb-8 text-lg">
                    ResearchMate is your AI-powered research assistant. We help you collect, organize,
                    summarize, and cite with ease—so you can spend more time thinking and less time managing.
                </p>
                <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="flex items-center gap-2">🧪 <span>Reference Generator</span></div>
                    <div className="flex items-center gap-2">🧾 <span>Lab Report Auto-formatter</span></div>
                    <div className="flex items-center gap-2">🗒️ <span>Study Note Compiler</span></div>
                    <div className="flex items-center gap-2">🔍 <span>Literature Review Builder</span></div>
                </div>
            </div>

            {/* Right Section */}
            <div className="w-1/2 bg-white p-12 flex flex-col justify-center">
                <h2 className="text-2xl font-bold mb-4">Sign in</h2>
                <p className="text-sm mb-6">
                    or <Link to="/register" className="text-blue-700 hover:underline">create an account</Link>
                </p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex items-center">
                        <input type="checkbox" id="remember" className="mr-2" />
                        <label htmlFor="remember">Remember me</label>
                    </div>

                    <p className="text-sm text-blue-700 mt-4 hover:underline">
                        <Link to="/">Forgot your password?</Link>
                    </p>

                    <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-md hover:bg-blue-800">
                        Sign in
                    </button>
                </form>

                <div className="flex items-center my-4">
                    <hr className="flex-grow border-gray-300" />
                    <span className="mx-2 text-sm text-gray-500">or</span>
                    <hr className="flex-grow border-gray-300" />
                </div>

                <button className="w-full border border-gray-300 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100 mb-2">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    Sign in with Google
                </button>

                <button className="w-full border border-gray-300 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/06/ORCID_iD.svg" alt="ORCID" className="w-5 h-5" />
                    Sign in with ORCID
                </button>
            </div>
        </div>
    );
}

export default LoginPage;
