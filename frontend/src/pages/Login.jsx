import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie"; // npm install js-cookie

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Send login request to backend
      const response = await axios.post(
        `${BASE_URL}/api/auth/login`,
        formData,
        { withCredentials: true },
      );

      if (response.data.success) {
        Cookies.set('token', response.data.token, { 
          expires: 30, 
          secure: true, 
          sameSite: 'none' 
        });
        
        localStorage.setItem(
          "family-tree-user",
          JSON.stringify(response.data.user),
        );
        
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/20 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-sm">Access your family archive</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2 ml-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Password
              </label>
              <Link
                to="/forgot-password"
                size="sm"
                className="text-[10px] text-indigo-400 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white mt-4 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#6366f1,#06b6d4)",
              boxShadow: "0 10px 20px -10px rgba(99,102,241,0.5)",
            }}
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">New to Roots Archive? </span>
          <Link
            to="/register"
            className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
