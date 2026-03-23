import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Cookies from "js-cookie";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from 'axios';

// Import your components
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import FamilyTree from "./pages/FamilyTree";
import PageNotFound from "./pages/PageNotFound";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!Cookies.get("token");
  
  const user = (() => {
    try {
      const saved = localStorage.getItem("family-tree-user");
      return saved && saved !== "[object Object]" ? JSON.parse(saved) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  })();

  const fetchMembers = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/tree/members`, {
        withCredentials: true,
      });
      
      if (res.data.success) {
        setMembers(res.data.data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error(err.response?.data?.message || "Failed to load family members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar visible on all pages, handles its own 'hidden' logic via isAuthenticated */}
      <Navbar isAuthenticated={isAuthenticated} user={user} />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Root Route */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <FamilyTree 
                members={members} 
                loading={loading} 
                user={user} 
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 Page */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>

      {/* Container for notifications */}
      <ToastContainer 
        position="bottom-right" 
        theme="dark" 
        autoClose={3000} 
        pauseOnHover={false}
      />
    </div>
  );
}

export default App;