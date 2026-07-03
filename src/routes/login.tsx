import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Key } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { dashHomeFor } from "@/components/wag/Navbar";
import { PageTransition } from "@/components/wag/primitives";
import { api } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — WE ARE UNITED" }] }),
  component: App,
});

type Role = "member" | "community_admin" | "super_admin";

function App() {
  const navigate = useNavigate();
  const { loginWithApi } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // States for verification flow in login
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);

  // States for forgot password flow
  const [forgotStep, setForgotStep] = useState(0); // 0 = login, 1 = enter email, 2 = enter otp, 3 = reset password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Interactive trigger states to make the visual art react to inputs!
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Quick Demo Pre-fill state
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  interface DemoAccount {
    u: string;
    p: string;
    label: string;
    name: string;
  }

  const demoAccounts: DemoAccount[] = [
    { u: "admin", p: "admin123", label: "Super Admin", name: "System Root" },
    { u: "mehul@samaj.org", p: "admin123", label: "Samaj Admin", name: "Mehul Solanki" },
    { u: "rohit@example.com", p: "admin123", label: "Samaj Member", name: "Rohit Patel" },
    { u: "rutvika@gmail.com", p: "Admin@123", label: "Samaj Admin", name: "Rutvika Jinjala" },
    { u: "ruta@gmail.com", p: "Admin@123", label: "Samaj Admin", name: "Ruta Ahir" },
    { u: "harshilshah_496", p: "Admin@123", label: "Samaj Member", name: "Harshil Shah" },
  ];

  const handleDemoFill = (acc: DemoAccount) => {
    setEmail(acc.u);
    setPassword(acc.p);
    setIsDemoOpen(false);
    toast.success(`Prefilled as ${acc.label} (${acc.name})`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter both email/phone and a valid password.");
      return;
    }

    setIsLoading(true);
    try {
      const u = await loginWithApi(email, password);
      toast.success("Success! Welcome back to WE ARE UNITED.");
      setTimeout(() => {
        navigate({ to: dashHomeFor(u.role) });
      }, 800);
    } catch (err: any) {
      const errMsg = err.message || "";
      if (errMsg.includes("Please verify your email before logging in.")) {
        try {
          await api.registerSendOTP(email);
          toast.info("A verification OTP has been sent to your email.");
        } catch (sendErr) {
          console.error("Failed to automatically send OTP: ", sendErr);
        }
        setUnverifiedEmail(email);
        toast.error("Please verify your email before logging in.");
      } else {
        toast.error(errMsg || "Authentication failed.");
      }
      setIsLoading(false);
    }
  };

  if (unverifiedEmail) {
    return (
      <PageTransition>
        <div className="relative min-h-[100dvh] w-full bg-[#FCF5EC] text-[#2C1D12] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-orange-200">
          <header className="w-full px-[5%] lg:px-[8%] pt-6 md:pt-10 z-20 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#EA580C] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="7" r="2.5" fill="currentColor" />
                  <path d="M7.5 15.5C7.5 13 9.5 11.5 12 11.5C14.5 11.5 16.5 13 16.5 15.5" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </div>
              <h1 className="font-extrabold text-[17px] text-[#3D1A00] tracking-tight leading-none">WE ARE UNITED</h1>
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto px-[5%] flex items-center justify-center py-8">
            <div className="bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(238,150,80,0.12)] p-10 max-w-md w-full border border-orange-200/50 text-center relative rounded-[32px]">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C1D12] mb-2">Verify Your Account</h2>
              <p className="text-[#7A6455] text-xs sm:text-sm font-semibold mb-6">
                Your email is not verified yet. Enter the 6-digit OTP sent to your email.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (loginOtp.length !== 6 || !/^\d+$/.test(loginOtp)) {
                    toast.error("Please enter a valid 6-digit OTP.");
                    return;
                  }
                  setIsVerifyingLoginOtp(true);
                  try {
                    await api.registerVerifyOTP(unverifiedEmail, loginOtp);
                    toast.success("Email verified successfully! You can now log in.");
                    setUnverifiedEmail("");
                    setLoginOtp("");
                  } catch (err: any) {
                    toast.error(err.message || "Invalid OTP. Please try again.");
                  } finally {
                    setIsVerifyingLoginOtp(false);
                  }
                }}
                className="space-y-6 text-left"
              >
                <div>
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    Email Address
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={unverifiedEmail}
                    className="w-full px-4 py-3 rounded-2xl border border-orange-200/50 bg-orange-50/30 font-semibold text-stone-500 text-sm shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 rounded-2xl border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-bold text-stone-800 text-center text-lg tracking-[0.5em] shadow-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingLoginOtp}
                  className="relative w-full py-3.5 mt-8 rounded-full bg-gradient-to-r from-[#F25C05] to-[#FFA74D] hover:from-[#E14D02] hover:to-[#FF952B] focus:outline-none text-white font-extrabold text-[15px] tracking-wide shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isVerifyingLoginOtp ? "Verifying..." : "Verify & Activate Account"}
                </button>
              </form>

              <div className="mt-6 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.registerSendOTP(unverifiedEmail);
                      toast.success("A new verification OTP has been sent to your email.");
                    } catch (err: any) {
                      toast.error(err.message || "Failed to resend OTP.");
                    }
                  }}
                  className="font-bold text-[#EA580C] hover:underline"
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => setUnverifiedEmail("")}
                  className="font-bold text-[#7A6455] hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  if (forgotStep === 1) {
    return (
      <PageTransition>
        <div className="relative min-h-[100dvh] w-full bg-[#FCF5EC] text-[#2C1D12] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-orange-200">
          <header className="w-full px-[5%] lg:px-[8%] pt-6 md:pt-10 z-20 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#EA580C] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="7" r="2.5" fill="currentColor" />
                  <path d="M7.5 15.5C7.5 13 9.5 11.5 12 11.5C14.5 11.5 16.5 13 16.5 15.5" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </div>
              <h1 className="font-extrabold text-[17px] text-[#3D1A00] tracking-tight leading-none">WE ARE UNITED</h1>
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto px-[5%] flex items-center justify-center py-8">
            <div className="bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(238,150,80,0.12)] p-10 max-w-md w-full border border-orange-200/50 text-center relative rounded-[32px]">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C1D12] mb-2">Forgot Password</h2>
              <p className="text-[#7A6455] text-xs sm:text-sm font-semibold mb-6">
                Enter your registered email address to receive a 6-digit verification OTP code.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmail.trim()) {
                    toast.error("Please enter your registered email address.");
                    return;
                  }
                  setIsForgotLoading(true);
                  try {
                    await api.forgotPassword(forgotEmail);
                    toast.success("A secure 6-digit OTP code has been sent to your email.");
                    setForgotStep(2);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to initiate password recovery.");
                  } finally {
                    setIsForgotLoading(false);
                  }
                }}
                className="space-y-6 text-left"
              >
                <div>
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 rounded-2xl border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-semibold text-stone-800 text-sm shadow-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="relative w-full py-3.5 mt-8 rounded-full bg-gradient-to-r from-[#F25C05] to-[#FFA74D] hover:from-[#E14D02] hover:to-[#FF952B] focus:outline-none text-white font-extrabold text-[15px] tracking-wide shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isForgotLoading ? "Sending OTP..." : "Send Reset OTP"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setForgotStep(0)}
                  className="text-xs font-bold text-[#7A6455] hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  if (forgotStep === 2) {
    return (
      <PageTransition>
        <div className="relative min-h-[100dvh] w-full bg-[#FCF5EC] text-[#2C1D12] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-orange-200">
          <header className="w-full px-[5%] lg:px-[8%] pt-6 md:pt-10 z-20 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#EA580C] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="7" r="2.5" fill="currentColor" />
                  <path d="M7.5 15.5C7.5 13 9.5 11.5 12 11.5C14.5 11.5 16.5 13 16.5 15.5" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </div>
              <h1 className="font-extrabold text-[17px] text-[#3D1A00] tracking-tight leading-none">WE ARE UNITED</h1>
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto px-[5%] flex items-center justify-center py-8">
            <div className="bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(238,150,80,0.12)] p-10 max-w-md w-full border border-orange-200/50 text-center relative rounded-[32px]">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C1D12] mb-2">Verify OTP</h2>
              <p className="text-[#7A6455] text-xs sm:text-sm font-semibold mb-6">
                A 6-digit OTP code has been sent to your email.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (forgotOtp.length !== 6 || !/^\d+$/.test(forgotOtp)) {
                    toast.error("Please enter a valid 6-digit OTP.");
                    return;
                  }
                  setIsForgotLoading(true);
                  try {
                    await api.verifyForgotOTP(forgotEmail, forgotOtp);
                    toast.success("OTP verified successfully. Please choose a new password.");
                    setForgotStep(3);
                  } catch (err: any) {
                    toast.error(err.message || "Invalid OTP or too many attempts. Please try again.");
                  } finally {
                    setIsForgotLoading(false);
                  }
                }}
                className="space-y-6 text-left"
              >
                <div>
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    Email Address
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={forgotEmail}
                    className="w-full px-4 py-3 rounded-2xl border border-orange-200/50 bg-orange-50/30 font-semibold text-stone-500 text-sm shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 rounded-2xl border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-bold text-stone-800 text-center text-lg tracking-[0.5em] shadow-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="relative w-full py-3.5 mt-8 rounded-full bg-gradient-to-r from-[#F25C05] to-[#FFA74D] hover:from-[#E14D02] hover:to-[#FF952B] focus:outline-none text-white font-extrabold text-[15px] tracking-wide shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isForgotLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>

              <div className="mt-6 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.forgotPassword(forgotEmail);
                      toast.success("A new 6-digit OTP code has been sent to your email.");
                    } catch (err: any) {
                      toast.error(err.message || "Failed to resend OTP.");
                    }
                  }}
                  className="font-bold text-[#EA580C] hover:underline"
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="font-bold text-[#7A6455] hover:underline"
                >
                  Change Email
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  if (forgotStep === 3) {
    return (
      <PageTransition>
        <div className="relative min-h-[100dvh] w-full bg-[#FCF5EC] text-[#2C1D12] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-orange-200">
          <header className="w-full px-[5%] lg:px-[8%] pt-6 md:pt-10 z-20 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#EA580C] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="7" r="2.5" fill="currentColor" />
                  <path d="M7.5 15.5C7.5 13 9.5 11.5 12 11.5C14.5 11.5 16.5 13 16.5 15.5" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </div>
              <h1 className="font-extrabold text-[17px] text-[#3D1A00] tracking-tight leading-none">WE ARE UNITED</h1>
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto px-[5%] flex items-center justify-center py-8">
            <div className="bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(238,150,80,0.12)] p-10 max-w-md w-full border border-orange-200/50 text-center relative rounded-[32px]">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C1D12] mb-2">Reset Password</h2>
              <p className="text-[#7A6455] text-xs sm:text-sm font-semibold mb-6">
                Please enter a secure new password for your account.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newPassword) {
                    toast.error("Please enter a new password.");
                    return;
                  }
                  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                  if (!passwordRegex.test(newPassword)) {
                    toast.error("Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast.error("New Password and Confirm Password do not match.");
                    return;
                  }

                  setIsForgotLoading(true);
                  try {
                    await api.resetPassword(forgotEmail, forgotOtp, newPassword, confirmPassword);
                    toast.success("Password reset successfully. Please log in with your new password.");
                    setForgotStep(0);
                    // clear inputs
                    setForgotEmail("");
                    setForgotOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to reset password.");
                  } finally {
                    setIsForgotLoading(false);
                  }
                }}
                className="space-y-6 text-left"
              >
                <div className="relative">
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-4 pr-10 py-3 rounded-2xl border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-semibold text-stone-800 text-sm shadow-sm outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3.5 text-[#7A6455] hover:text-[#EA580C] transition-colors pointer-events-auto"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {newPassword && (() => {
                    const getPasswordStrength = (pwd: string) => {
                      if (!pwd) return { score: 0, label: "", color: "bg-stone-200", text: "text-stone-500" };
                      let score = 0;
                      if (pwd.length >= 8) score++;
                      if (/[A-Z]/.test(pwd)) score++;
                      if (/[a-z]/.test(pwd)) score++;
                      if (/\d/.test(pwd)) score++;
                      if (/[@$!%*?&]/.test(pwd)) score++;

                      if (score <= 2) return { score, label: "Weak", color: "bg-red-500", text: "text-red-500" };
                      if (score <= 4) return { score, label: "Medium", color: "bg-amber-500", text: "text-amber-500" };
                      return { score, label: "Strong", color: "bg-green-500", text: "text-green-500" };
                    };
                    const strObj = getPasswordStrength(newPassword);
                    return (
                      <div className="mt-2 px-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1">
                          <span className="text-[#7A6455]">Password Strength</span>
                          <span className={strObj.text}>{strObj.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${strObj.color}`}
                            style={{ width: `${(strObj.score / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 rounded-2xl border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white font-semibold text-stone-800 text-sm shadow-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="relative w-full py-3.5 mt-8 rounded-full bg-gradient-to-r from-[#F25C05] to-[#FFA74D] hover:from-[#E14D02] hover:to-[#FF952B] focus:outline-none text-white font-extrabold text-[15px] tracking-wide shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isForgotLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setForgotStep(0)}
                  className="text-xs font-bold text-[#7A6455] hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="relative min-h-[100dvh] w-full bg-[#FCF5EC] text-[#2C1D12] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-orange-200">

        {/* Absolute Sparkles & Ambient Glows to enrich the visual canvas */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-orange-300 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute top-1/3 right-1/4 w-3.5 h-3.5 bg-[#FFF0DB] rounded-full filter blur-[1px] animate-sparkle"></div>
        <div className="absolute top-[15%] left-[45%] w-2.5 h-2.5 bg-orange-400 rounded-full filter blur-[1px] animate-sparkle" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-[60%] right-[38%] w-3 h-3 bg-white rounded-full filter blur-[1.5px] animate-sparkle" style={{ animationDelay: "1.5s" }}></div>

        {/* TOP HEADER: BRAND IDENTITY */}
        <header className="w-full px-[5%] lg:px-[8%] 2xl:px-[10%] pt-4 lg:pt-6 md:pt-10 z-20 flex justify-between items-start pointer-events-auto">
          <div className="flex items-center gap-4 transition-transform hover:scale-[1.02] duration-300">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#EA580C] flex items-center justify-center shadow-[0_6px_20px_rgba(234,88,12,0.22)]">
              {/* Elegant SVG Triple-person community logo */}
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.5">
                {/* Center Leader figure */}
                <circle cx="12" cy="7" r="2.5" fill="currentColor" />
                <path d="M7.5 15.5C7.5 13 9.5 11.5 12 11.5C14.5 11.5 16.5 13 16.5 15.5" strokeLinecap="round" strokeWidth="1.8" />

                {/* Left family circle */}
                <circle cx="7.5" cy="9.5" r="1.8" fill="currentColor" className="opacity-80" />
                <path d="M4.5 16C4.5 14.2 5.8 13.2 7.5 13.2" strokeLinecap="round" strokeWidth="1.5" className="opacity-80" />

                {/* Right family circle */}
                <circle cx="16.5" cy="9.5" r="1.8" fill="currentColor" className="opacity-80" />
                <path d="M16.5 13.2C18.2 13.2 19.5 14.2 19.5 16" strokeLinecap="round" strokeWidth="1.5" className="opacity-80" />
              </svg>
              <div className="absolute -inset-0.5 rounded-xl bg-orange-400 opacity-20 filter blur-sm"></div>
            </div>
            <div>
              <h1 className="font-extrabold text-[17px] text-[#3D1A00] tracking-tight leading-none">
                WE ARE UNITED
              </h1>
              <p className="text-[11px] text-[#EA580C] font-semibold mt-1 tracking-wider uppercase">
                Aapni Samaj, Aapnu Network
              </p>
            </div>
          </div>

          {/* Demo Drawer Trigger */}
          <button
            onClick={() => setIsDemoOpen(!isDemoOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-200 bg-white/70 hover:bg-orange-50 hover:border-orange-300 text-[11px] font-bold text-orange-700 transition-all shadow-sm active:scale-95"
          >
            <Key className="w-3 h-3 text-orange-500" />
            Quick Accounts
          </button>
        </header>

        {/* MAIN BODY: IMMERSIVE UNIFIED SCENE LAYOUT */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-[5%] lg:px-[8%] flex flex-col lg:grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center justify-center relative z-10 py-8 lg:py-0">

          {/* LEFT COLUMN: HIGH-FIDELITY VECTOR SCENE Backdrop */}
          <div className="flex items-center justify-center w-full h-[240px] sm:h-[350px] lg:h-[500px] xl:h-[550px] relative pointer-events-none select-none">

            <svg
              viewBox="0 0 500 550"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full object-contain filter drop-shadow-[0_12px_45px_rgba(238,150,80,0.12)] overflow-visible transform scale-110 xl:scale-125 origin-bottom"
            >
              {/* DEF GRADIENETS FOR OPTIMAL 3D COLOR CHANNELS */}
              <defs>
                <filter id="softBlur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>

                <linearGradient id="doorwaySun" x1="250" y1="210" x2="250" y2="415" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFF2DC" />
                  <stop offset="50%" stopColor="#FFA642" />
                  <stop offset="100%" stopColor="#FFF3E0" />
                </linearGradient>

                <linearGradient id="pathGradient" x1="250" y1="415" x2="250" y2="550" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFF3E0" />
                  <stop offset="20%" stopColor="#FFA642" />
                  <stop offset="55%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#EA580C" />
                </linearGradient>

                {/* Plaster white portal frame depth mapping gradients */}
                <linearGradient id="portalBevel" x1="160" y1="210" x2="340" y2="210" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ECE0D2" />
                  <stop offset="15%" stopColor="#FFFFFF" />
                  <stop offset="85%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E4D4C3" />
                </linearGradient>

                <linearGradient id="portalInnerBevel" x1="178" y1="220" x2="322" y2="220" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D9C3B0" />
                  <stop offset="100%" stopColor="#F9EFE3" />
                </linearGradient>

                {/* Leaf gradients */}
                <linearGradient id="leafGradLeft" x1="100" y1="300" x2="160" y2="450" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFA74F" />
                  <stop offset="100%" stopColor="#DB5E10" />
                </linearGradient>

                <linearGradient id="leafGradRight" x1="340" y1="300" x2="400" y2="450" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF9C3B" />
                  <stop offset="100%" stopColor="#EB5705" />
                </linearGradient>
              </defs>

              {/* ARTWORK GROUP */}
              <g>
                {/* 1. SEATING SHADOW under the portal */}
                <ellipse cx="250" cy="415" rx="100" ry="8" fill="#D3BEA8" opacity="0.38" />

                {/* 2. OUTER ARCHWAY FRAME: Thick white/cream 3D portal */}
                <path
                  d="M160 415 L160 210 Q160 110 250 110 Q340 110 340 210 L340 415 Z"
                  fill="url(#portalBevel)"
                />

                {/* 3. INNER ARCH PORTAL FRAME DEPTH */}
                <path
                  d="M178 415 L178 215 Q178 132 250 132 Q322 132 322 215 L322 415 Z"
                  fill="url(#portalInnerBevel)"
                />

                {/* 4. DOORWAY INTERIOR OPENING / SKY RADIANCE */}
                <path
                  d="M192 415 L192 219 Q192 152 250 152 Q308 152 308 219 L308 415 Z"
                  fill="url(#doorwaySun)"
                />

                {/* 5. GENTLE SUNLIGHT WAVES (layered interior sky ellipses) */}
                <ellipse cx="250" cy="230" rx="42" ry="34" fill="#FFFBF5" opacity="0.55" />
                <ellipse cx="250" cy="245" rx="28" ry="22" fill="#FFFDFD" opacity="0.45" />

                {/* 6. GOLDEN CITY SKYLINE SILHOUETTE (Overlap inside doorway) */}
                <g fill="#EA7D1E" opacity="0.45">
                  <rect x="210" y="278" width="8" height="28" rx="0.5" />
                  <rect x="221" y="260" width="10" height="46" rx="0.5" />
                  <rect x="234" y="282" width="6" height="24" rx="0.5" />
                  <rect x="242" y="268" width="9" height="38" rx="0.5" />
                  <rect x="254" y="248" width="13" height="58" rx="0.5" />
                  <rect x="270" y="272" width="7" height="34" rx="0.5" />
                  <rect x="280" y="263" width="9" height="43" rx="0.5" />
                  <rect x="291" y="284" width="6" height="22" rx="0.5" />
                  {/* Spires */}
                  <polygon points="226,260 228.5,248 231,260" />
                  <polygon points="260.5,248 263.5,232 266.5,248" />
                  <polygon points="284.5,263 287.5,249 290.5,263" />
                </g>

                {/* 7. FLYING BIRDS IN PORTAL SKY */}
                <g stroke="#E26A04" strokeWidth="1.2" fill="none" opacity="0.6">
                  <path d="M211 210 Q215 206 219 210 Q223 206 227 210" />
                  <path d="M285 198 Q288 195 291 198 Q294 195 297 198" />
                  <path d="M272 215 Q274 212 277 215 Q280 212 282 215" />
                </g>

                {/* 8. THE WINDING PATHWAY: Clean, high-fidelity organic S-curve flaring down beautifully */}
                {/* Soft Ambient Shadow of the Road on the Floor */}
                <path
                  d="M 235 415
                     L 265 415
                     C 265 435, 230 445, 230 465
                     C 230 485, 340 480, 340 510
                     C 340 530, 350 540, 390 550
                     L 110 550
                     C 170 540, 240 530, 240 510
                     C 240 480, 150 485, 150 465
                     C 150 445, 235 435, 235 415
                     Z"
                  fill="#803D0D"
                  opacity="0.14"
                  transform="translate(10, 8)"
                  filter="url(#softBlur)"
                />

                {/* Core Road Body with Gradient */}
                <path
                  d="M 235 415
                     L 265 415
                     C 265 435, 230 445, 230 465
                     C 230 485, 340 480, 340 510
                     C 340 530, 350 540, 390 550
                     L 110 550
                     C 170 540, 240 530, 240 510
                     C 240 480, 150 485, 150 465
                     C 150 445, 235 435, 235 415
                     Z"
                  fill="url(#pathGradient)"
                />

                {/* Soft ambient occlusion shadow */}
                <ellipse cx="250" cy="415" rx="100" ry="4" fill="#602E08" opacity="0.14" filter="url(#softBlur)" />

                {/* 9. LEFT PALM PLANT BRANCH (Foliage) - with gentle sway animation */}
                <g className="animate-swayOrigin" style={{ transformOrigin: "135px 410px" }}>
                  <path d="M135 415 Q140 330 144 285" stroke="#CD5507" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M135 400 Q105 370 95 330 Q122 334 136 368 Z" fill="url(#leafGradLeft)" opacity="0.95" />
                  <path d="M136 380 Q165 352 168 316 Q142 322 136 352 Z" fill="url(#leafGradLeft)" opacity="0.88" />
                  <path d="M138 350 Q106 322 100 286 Q125 292 138 322 Z" fill="url(#leafGradLeft)" opacity="0.85" />
                  <path d="M140 330 Q168 304 172 272 Q148 278 140 306 Z" fill="url(#leafGradLeft)" opacity="0.78" />
                  <path d="M141 310 Q116 284 112 250 Q132 258 141 286 Z" fill="url(#leafGradLeft)" opacity="0.72" />
                  <path d="M143 290 Q126 266 128 238 Q138 245 143 270 Z" fill="url(#leafGradLeft)" opacity="0.65" />
                </g>

                {/* 10. RIGHT PALM PLANT BRANCH (Foliage) - with gentle sway animation */}
                <g className="animate-swayOrigin" style={{ transformOrigin: "365px 410px" }}>
                  <path d="M365 415 Q360 330 356 285" stroke="#CD5507" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M365 400 Q395 370 405 330 Q378 334 364 368 Z" fill="url(#leafGradRight)" opacity="0.95" />
                  <path d="M364 380 Q335 352 332 316 Q358 322 364 352 Z" fill="url(#leafGradRight)" opacity="0.88" />
                  <path d="M362 350 Q394 322 400 286 Q375 292 362 322 Z" fill="url(#leafGradRight)" opacity="0.85" />
                  <path d="M360 330 Q332 304 328 272 Q352 278 360 306 Z" fill="url(#leafGradRight)" opacity="0.78" />
                  <path d="M359 310 Q384 284 388 250 Q368 258 359 286 Z" fill="url(#leafGradRight)" opacity="0.72" />
                  <path d="M357 290 Q374 266 372 238 Q362 245 357 270 Z" fill="url(#leafGradRight)" opacity="0.65" />
                </g>

                {/* 11. LEFT SUSPENDED BADGES: Lock Circle & Feather */}
                <g className={isPasswordFocused ? "animate-bounce" : "animate-float"} style={{ transition: "all 0.5s ease" }}>
                  <path d="M125 150 Q115 110 130 95 Q135 112 128 135" stroke="#E26A04" strokeWidth="1.5" fill="none" opacity="0.5" />
                  <path d="M130 95 C122 110, 115 130, 126 154 C132 135, 138 120, 130 95 Z" fill="#FFA539" opacity="0.45" />
                  <path d="M128 155 Q115 220, 110 270" stroke="#DA7D1E" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 4.5" opacity="0.5" />
                  <path d="M110 270 Q105 320, 122 360" stroke="#DA7D1E" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 4.5" opacity="0.5" />
                  <circle cx="110" cy="270" r="18" fill="white" className="shadow-lg filter drop-shadow-[0_4px_12px_rgba(218,125,30,0.18)]" />
                  <circle cx="110" cy="270" r="14" fill="#FFEFE0" />
                  <rect x="104" y="270" width="12" height="10" rx="1.8" fill="#F87313" />
                  <path d="M106.5 270 L106.5 266.5 Q106.5 262.5 110 262.5 Q113.5 262.5 113.5 266.5 L113.5 270" stroke="#F87313" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  <circle cx="110" cy="275" r="1" fill="white" />
                </g>

                {/* 12. RIGHT SUSPENDED BADGE: Avatar Circle & Winding Path Guidance */}
                <g className={isEmailFocused ? "animate-bounce" : "animate-float-slow"} style={{ transition: "all 0.5s ease" }}>
                  <path d="M380 180 Q305 240, 312 310" stroke="#DA7D1E" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 5" opacity="0.5" />
                  <circle cx="380" cy="180" r="24" fill="white" className="shadow-md filter drop-shadow-[0_6px_15px_rgba(218,125,30,0.15)]" />
                  <circle cx="380" cy="180" r="19" fill="#FFF4E6" />
                  <circle cx="380" cy="174" r="6" fill="#F87313" opacity="0.82" />
                  <ellipse cx="380" cy="189" rx="10" ry="6" fill="#F87313" opacity="0.65" />
                </g>

                {/* 13. ADDITIONAL ORNAMENTAL BUSHES GIVING STABILITY */}
                <ellipse cx="85" cy="420" rx="36" ry="14" fill="#FFA539" opacity="0.25" />
                <ellipse cx="415" cy="420" rx="36" ry="14" fill="#FFA539" opacity="0.25" />
              </g>
            </svg>

          </div>

          {/* RIGHT COLUMN: CORE LOGIN FLOATING FORM */}
          <div className="flex flex-col justify-center h-full z-10 w-full max-w-[360px] mx-auto">

            {/* Validation & Auth handled via sonner toasts */}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-10 xl:space-y-12 pointer-events-auto">

              {/* EMAIL OR PHONE UNDERLINED FIELD */}
              <div className="relative group">
                <div className="flex items-center gap-3 lg:gap-4 pb-2 lg:pb-4 border-b-2 border-[#E6D9C8] transition-all duration-300 group-hover:border-orange-300">
                  <Mail className={`w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 transition-colors duration-250 ${isEmailFocused ? "text-[#E65F06]" : "text-[#7A6455]"}`} />
                  <div className="flex-1 relative">
                    <span className={`absolute left-0 pointer-events-none transition-all duration-200 ${isEmailFocused || email ? "-top-4 lg:-top-6 text-[11px] lg:text-[13px] xl:text-[14px] font-bold text-[#EA580C]" : "top-0 text-sm lg:text-base xl:text-lg font-medium text-[#7A6455]/70"
                      }`}>
                      Email or Phone
                    </span>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => {
                        setIsEmailFocused(true);
                      }}
                      onBlur={() => setIsEmailFocused(false)}
                      className="w-full bg-transparent border-none outline-none text-sm lg:text-base xl:text-lg text-[#2C1D12] font-bold pt-1 focus:ring-0 p-0"
                      placeholder=""
                    />
                  </div>
                </div>
                <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#EA580C] to-[#FFA74D] transition-all duration-300 ${isEmailFocused ? "w-full" : "w-0"
                  }`}></div>
              </div>

              {/* PASSWORD UNDERLINED FIELD */}
              <div className="relative group">
                <div className="flex items-center gap-3 lg:gap-4 pb-2 lg:pb-4 border-b-2 border-[#E6D9C8] transition-all duration-300 group-hover:border-orange-300">
                  <Lock className={`w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 transition-colors duration-250 ${isPasswordFocused ? "text-[#E65F06]" : "text-[#7A6455]"}`} />
                  <div className="flex-1 relative">
                    <span className={`absolute left-0 pointer-events-none transition-all duration-200 ${isPasswordFocused || password ? "-top-4 lg:-top-6 text-[11px] lg:text-[13px] xl:text-[14px] font-bold text-[#EA580C]" : "top-0 text-sm lg:text-base xl:text-lg font-medium text-[#7A6455]/70"
                      }`}>
                      Password
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => {
                        setIsPasswordFocused(true);
                      }}
                      onBlur={() => setIsPasswordFocused(false)}
                      className="w-full bg-transparent border-none outline-none text-sm lg:text-base xl:text-lg text-[#2C1D12] font-bold pt-1 focus:ring-0 p-0 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                      placeholder=""
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 lg:p-2 rounded-md text-[#7A6455] hover:text-[#EA580C] hover:bg-orange-50 transition-colors pointer-events-auto"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" /> : <Eye className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />}
                  </button>
                </div>
                <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#EA580C] to-[#FFA74D] transition-all duration-300 ${isPasswordFocused ? "w-full" : "w-0"
                  }`}></div>
              </div>

              {/* FORGOT PASSWORD LINK */}
              <div className="flex justify-end text-[11px] sm:text-sm xl:text-base mt-1 lg:mt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="font-bold text-[#EA580C] hover:text-[#F37324] transition-colors hover:underline tracking-tight"
                >
                  Forgot Password?
                </button>
              </div>

              {/* HIGH-GLOW PILL LOGIN BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3.5 lg:py-4 mt-6 lg:mt-8 rounded-full bg-gradient-to-r from-[#F25C05] to-[#FFA74D] hover:from-[#E14D02] hover:to-[#FF952B] hover:shadow-[0_12px_40px_rgba(242,92,5,0.45)] focus:outline-none focus:ring-4 focus:ring-orange-300/50 text-white font-extrabold text-[15px] lg:text-[17px] tracking-wide shadow-[0_8px_30px_rgba(242,92,5,0.3)] transition-all duration-350 active:scale-[0.98] flex items-center justify-center gap-2 lg:gap-3 cursor-pointer group disabled:cursor-not-allowed disabled:opacity-75"
              >
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                  {isLoading ? "Signing in..." : "Login"}
                </span>
                {!isLoading && <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 group-hover:translate-x-1.5 transition-transform duration-250" />}

                {/* Internal subtle sparkle inside button on hover */}
                <div className="absolute top-1.5 right-6 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white rounded-full animate-ping opacity-0 group-hover:opacity-100 duration-500"></div>
              </button>

            </form>
          </div>

        </main>

        {/* FOOTER AREA */}
        <footer className="w-full px-[5%] lg:px-[8%] 2xl:px-[10%] py-6 lg:pb-10 z-20 flex flex-col md:flex-row justify-between items-center text-[#7A6455] text-xs font-semibold gap-2 mt-auto">
          <p className="tracking-wide">
            © 2026 WE ARE UNITED. All rights reserved.
          </p>

          <p className="text-[11px] opacity-75 hidden md:block">
            Gujarati Community Network
          </p>
        </footer>

        {/* QUICK PRE-FILL SLIDE-OVER DRAWER (For Developer/User Demonstration) */}
        <div className={`fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#FDF7EE]/95 backdrop-blur-md rounded-t-[32px] border-t border-orange-200/50 shadow-[0_-15px_40px_rgba(238,150,80,0.18)] z-50 p-6 md:p-8 transform transition-transform duration-500 ease-out pointer-events-auto ${isDemoOpen ? "translate-y-0" : "translate-y-full"
          }`}>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-orange-100">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-orange-600 animate-pulse" />
                <h3 className="font-serif text-xl font-bold text-[#2C1D12]">Demo Credentials Quick-Access</h3>
              </div>
              <button
                onClick={() => setIsDemoOpen(false)}
                className="text-xs font-extrabold text-orange-600 hover:text-orange-900 bg-orange-100/60 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            <p className="text-xs text-[#7A6455] leading-relaxed">
              Select an official profile to prefill the login variables instantaneously:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.u}
                  type="button"
                  onClick={() => handleDemoFill(acc)}
                  className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-orange-300 hover:bg-orange-50/40 text-left transition-all active:scale-95 group shadow-sm"
                >
                  <div className="text-xs font-bold text-orange-600 mb-1">{acc.label}</div>
                  <div className="text-[13px] font-extrabold text-[#2C1D12] group-hover:text-orange-900 truncate">{acc.name}</div>
                  <div className="text-[11px] text-stone-500 mt-2 truncate">{acc.u}</div>
                  <div className="text-[10px] text-stone-400 font-medium">Password: {acc.p}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}