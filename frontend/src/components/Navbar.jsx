import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";

import MemberModal from "./MemberModal";

const NAV_LINKS = [
  { label: "Family Tree", href: "/" },
  {
    label: "Explore",
    href: "#",
    dropdown: [
      { icon: "🌳", label: "View Tree", href: "/" },
      { icon: "📸", label: "Gallery", href: "/gallery" },
      { icon: "📜", label: "Documents", href: "/docs" },
      { icon: "📊", label: "Statistics", href: "/stats" },
    ],
  },
  { label: "Timeline", href: "/timeline" },
];

/* ─── Logo ─── */
function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 no-underline group flex-shrink-0"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-transform group-hover:scale-105"
        style={{
          background: "linear-gradient(135deg,#6366f1,#06b6d4)",
          boxShadow: "0 0 18px rgba(99,102,241,0.45)",
        }}
      >
        FT
      </div>
      <div>
        <span
          className="font-bold text-white text-sm tracking-wide block leading-tight"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Family Tree
        </span>
        <span className="text-[9px] text-slate-600 uppercase tracking-widest">
          Archive
        </span>
      </div>
    </Link>
  );
}

/* ─── Dropdown ─── */
function NavDropdown({ link }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-sm font-medium py-1.5 px-1 transition-colors bg-transparent border-0 cursor-pointer ${
          open ? "text-indigo-400" : "text-slate-400 hover:text-white"
        }`}
      >
        {link.label}
        <svg
          width={10}
          height={10}
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={`absolute top-full left-0 pt-2 w-48 transition-all duration-200 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{ zIndex: 200 }}
      >
        <div
          className="rounded-2xl p-1.5 shadow-2xl"
          style={{
            background: "rgba(7,13,32,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          }}
        >
          {link.dropdown.map((item, i) => (
            <Link
              key={i}
              to={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-all ${
                location.pathname === item.href
                  ? "text-indigo-400 bg-indigo-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── User Menu ─── */
function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
        style={{ background: "transparent" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{
            background: "linear-gradient(135deg,#6366f1,#ec4899)",
            boxShadow: "0 0 10px rgba(99,102,241,0.3)",
          }}
        >
          {initials}
        </div>
        <span className="text-xs font-semibold text-slate-300 hidden sm:block max-w-[80px] truncate">
          {user?.name}
        </span>
        <svg
          width={10}
          height={10}
          viewBox="0 0 10 10"
          fill="none"
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={`absolute top-full right-0 pt-2 w-52 transition-all duration-200 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{ zIndex: 200 }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(7,13,32,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-sm font-bold text-white">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>

          {/* Menu items */}
          {[
            { icon: "👤", label: "Profile Settings", href: "/profile" },
            { icon: "🔒", label: "Privacy", href: "/privacy" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all no-underline"
            >
              <span>{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}

          <div className="border-t border-slate-800 mt-1 pt-1 pb-1">
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span>🚪</span>
              <span className="text-xs font-semibold">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Navbar({
  isAuthenticated,
  user,
  members = [],
  onMemberAdded,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const logout = async () => {
    localStorage.removeItem("family-tree-user");
    Cookies.remove("token", { path: "/", secure: true, sameSite: "none" });
  
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure";
  
    try {
      await axios.post(`${BASE_URL}/api/auth/logout`);
    } catch (err) {
      console.log("Backend cleanup failed, but local data is gone.");
    }
  
    // 5. Final redirect
    window.location.href = "/login";
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isModalOpen || mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen, mobileOpen]);

  if (!isAuthenticated) return null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
        style={{
          background: scrolled ? "rgba(2,6,23,0.92)" : "rgba(2,6,23,0.4)",
          backdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          borderBottom: scrolled
            ? "1px solid rgba(99,102,241,0.18)"
            : "1px solid transparent",
          boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link, i) =>
              link.dropdown ? (
                <NavDropdown key={i} link={link} />
              ) : (
                <Link
                  key={i}
                  to={link.href}
                  className={`text-sm font-medium py-1 transition-colors no-underline ${
                    location.pathname === link.href
                      ? "text-indigo-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Member count badge */}
            {members.length > 0 && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}
              >
                <span>🌳</span>
                {members.length}
              </div>
            )}

            {/* Add Member CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#6366f1,#06b6d4)",
                boxShadow: "0 0 20px rgba(99,102,241,0.3)",
              }}
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Add Member</span>
            </button>

            {/* User menu */}
            <UserMenu user={user} logout={logout} />

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1.5 p-1 border-0 bg-transparent cursor-pointer"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-5 h-0.5 bg-slate-400 rounded-full transition-all duration-300"
                  style={{
                    transform: mobileOpen
                      ? i === 0
                        ? "translateY(8px) rotate(45deg)"
                        : i === 2
                          ? "translateY(-8px) rotate(-45deg)"
                          : "scaleX(0)"
                      : "none",
                    opacity: mobileOpen && i === 1 ? 0 : 1,
                    background: mobileOpen ? "#818cf8" : "#94a3b8",
                  }}
                />
              ))}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <>
        <div
          className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
            mobileOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`fixed top-16 left-0 right-0 z-[95] md:hidden transition-all duration-300 ${
            mobileOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
          style={{
            background: "rgba(7,13,32,0.97)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <nav className="px-5 py-4 space-y-1">
            {NAV_LINKS.flatMap((link, i) => [
              <Link
                key={`main-${i}`}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 border-b border-slate-800/50 text-sm font-medium no-underline transition-colors ${
                  location.pathname === link.href
                    ? "text-indigo-400"
                    : "text-slate-400"
                }`}
              >
                {link.label}
              </Link>,
              ...(link.dropdown || []).map((sub, j) => (
                <Link
                  key={`sub-${i}-${j}`}
                  to={sub.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-2.5 pl-4 border-b border-slate-800/30 text-xs text-slate-500 hover:text-slate-300 no-underline transition-colors"
                >
                  <span>{sub.icon}</span>
                  {sub.label}
                </Link>
              )),
            ])}
          </nav>
        </div>
      </>

      {/* Add Member Modal */}
      {isModalOpen && (
        <MemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          loggedInUser={user}
          allMembers={members}
          onSuccess={() => {
            setIsModalOpen(false);
            onMemberAdded?.();
          }}
        />
      )}
    </>
  );
}
