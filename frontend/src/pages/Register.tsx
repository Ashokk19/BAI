"use client"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import APP_CONFIG from "@/config/app"
import Footer from "@/components/Layout/Footer"

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    account_id: "TestAccount",
    phone: "",
    address: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Registration validation
    if (!formData.email || !formData.password || !formData.username || !formData.first_name || !formData.last_name) {
      setError("Please fill in all required fields")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch("http://localhost:8001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          account_id: formData.account_id,
          phone: formData.phone || null,
          address: formData.address || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Registration failed")
      }

      const userData = await response.json()
      setSuccess("Registration successful! Redirecting to login...")
      
      // Redirect to login page after successful registration
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-50 to-violet-100 rounded-full mix-blend-multiply filter blur-2xl opacity-25 animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-violet-50 to-purple-50 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-pulse delay-1500"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="bg-white/40 backdrop-blur-3xl border border-white/80 rounded-3xl p-8 shadow-2xl ring-2 ring-white/60 hover:bg-white/50 hover:ring-white/70 transition-all duration-300 relative overflow-hidden">
            {/* Enhanced glass effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20 rounded-3xl"></div>

            <div className="space-y-6 relative z-10">
              {/* Header */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className={`w-12 h-12 ${APP_CONFIG.logo.bgColor} rounded-xl flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{APP_CONFIG.logo.icon}</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
                      {APP_CONFIG.name}
                    </h1>
                  </div>
                </div>
                <div>
                  <h3 className="text-gray-900 text-2xl font-bold">Create Account</h3>
                  <p className="text-gray-700 font-semibold">Sign up to get started with {APP_CONFIG.name}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-800 font-bold">
                      Username *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-gray-800 font-bold">
                      First Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                      <Input
                        id="first_name"
                        name="first_name"
                        type="text"
                        placeholder="First name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-gray-800 font-bold">
                      Last Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                      <Input
                        id="last_name"
                        name="last_name"
                        type="text"
                        placeholder="Last name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_id" className="text-gray-800 font-bold">
                    Account ID *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <select
                      id="account_id"
                      name="account_id"
                      value={formData.account_id}
                      onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                      className="pl-10 w-full bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-md appearance-none pr-4"
                      disabled={isLoading}
                      required
                    >
                      <option value="TestAccount">TestAccount</option>
                      <option value="AccountA">Account A</option>
                      <option value="AccountB">Account B</option>
                      <option value="AccountC">Account C</option>
                      <option value="DemoAccount">Demo Account</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-800 font-bold">
                    Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-800 font-bold">
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 8 characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-800 font-bold">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-800 font-bold">
                    Phone (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 placeholder:text-gray-600 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 h-12 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl ring-2 ring-violet-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-gray-700 text-sm font-semibold">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => window.location.href = '/login'}
                  className="text-violet-600 hover:text-violet-700 font-bold transition-colors underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Footer */}
    <Footer />
  </div>
  )
} 