import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Cookies from "js-cookie";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Register() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
      const response = await axios.post(
        `${BASE_URL}/api/auth/register`,
        formData,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success("Welcome! Account created successfully.", {
          icon: "🔐",
          style: { borderRadius: "15px", background: "#0f172a", color: "#fff" },
        });

        localStorage.setItem('family-tree-user', JSON.stringify(response.data.user));
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (err) {
      // FIX: Correct path for Axios error responses
      const errorMessage = err.response?.data?.message || "Registration failed. Try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/20 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400 text-sm">Join the Roots Archive community</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors bg-transparent border-0 cursor-pointer p-1"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
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
            {loading ? "Creating Account..." : "Register Now"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">Already have an account? </span>
          <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}