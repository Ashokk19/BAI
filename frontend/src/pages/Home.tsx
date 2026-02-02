"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { 
  FileText, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  User,
  LogIn,
  Calendar,
  CreditCard,
  Truck,
  ClipboardList,
  PieChart,
  Receipt,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { accountsApi } from "@/services/accountsApi"
import { apiService } from "@/services/api"
import APP_CONFIG from "@/config/app"

export default function Home() {
  const navigate = useNavigate()
  
  // Login dialog state
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [accountName, setAccountName] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  
  // Demo request dialog state
  const [showDemoDialog, setShowDemoDialog] = useState(false)
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    message: ""
  })
  const [demoSubmitting, setDemoSubmitting] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)
  const [demoError, setDemoError] = useState("")

  const handleLoginSubmit = async () => {
    if (!accountName.trim()) {
      setLoginError("Please enter your account name")
      return
    }
    
    setIsValidating(true)
    setLoginError("")
    
    try {
      const publicAccounts = await accountsApi.getPublicAccounts()
      const match = publicAccounts.find(
        a => (a.account_id || "").toLowerCase() === accountName.trim().toLowerCase()
      )
      
      if (!match) {
        setLoginError("Account not found. Please check your account name and try again.")
        setIsValidating(false)
        return
      }
      
      // Redirect to login page with account parameter
      navigate(`/login?account=${encodeURIComponent(match.account_id)}`)
    } catch (error) {
      setLoginError("Failed to validate account. Please try again.")
      setIsValidating(false)
    }
  }

  const handleDemoSubmit = async () => {
    if (!demoForm.name.trim() || !demoForm.email.trim() || !demoForm.phone.trim()) {
      setDemoError("Please fill in all required fields")
      return
    }
    
    // Validate phone number (10 digits, optional country code)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{4,10}$/
    if (!phoneRegex.test(demoForm.phone.trim())) {
      setDemoError("Please enter a valid phone number (e.g., +91 9876543210 or 9876543210)")
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(demoForm.email.trim())) {
      setDemoError("Please enter a valid email address")
      return
    }
    
    setDemoSubmitting(true)
    setDemoError("")
    
    try {
      await apiService.post("/api/demo-requests/", {
        name: demoForm.name.trim(),
        email: demoForm.email.trim(),
        phone: demoForm.phone.trim(),
        company_name: demoForm.company_name.trim() || undefined,
        message: demoForm.message.trim() || undefined
      })
      
      setDemoSuccess(true)
      setDemoForm({ name: "", email: "", phone: "", company_name: "", message: "" })
    } catch (error: any) {
      setDemoError(error?.response?.data?.detail || "Failed to submit demo request. Please try again.")
    } finally {
      setDemoSubmitting(false)
    }
  }

  const features = [
    {
      icon: FileText,
      title: "GST Invoicing",
      description: "Create professional GST-compliant tax invoices with automatic tax calculations, HSN codes, and multi-tax support."
    },
    {
      icon: Package,
      title: "Inventory Management",
      description: "Track stock levels, manage categories, set reorder points, and monitor expiry dates with real-time updates."
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Maintain detailed customer profiles, track purchase history, and manage credit limits effortlessly."
    },
    {
      icon: ShoppingCart,
      title: "Purchase Orders",
      description: "Streamline procurement with purchase orders, vendor management, and automated stock updates on receipt."
    },
    {
      icon: CreditCard,
      title: "Payment Tracking",
      description: "Record payments, track outstanding amounts, manage credit sales, and get instant payment status updates."
    },
    {
      icon: Truck,
      title: "Delivery & Shipment",
      description: "Create delivery notes, track shipments, and maintain complete delivery history for every invoice."
    },
    {
      icon: Receipt,
      title: "Proforma Invoices",
      description: "Generate proforma invoices for quotes and estimates, then convert them to tax invoices seamlessly."
    },
    {
      icon: PieChart,
      title: "Reports & Analytics",
      description: "Get insights with comprehensive dashboards, sales reports, and inventory analytics at a glance."
    }
  ]

  const benefits = [
    "GST-compliant invoicing with CGST, SGST, IGST support",
    "Multi-user access with role-based permissions",
    "Real-time inventory tracking and alerts",
    "Customer credit management and tracking",
    "Purchase order and vendor management",
    "Delivery notes and shipment tracking",
    "Payment recording and outstanding reports",
    "Professional PDF invoice generation"
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{APP_CONFIG.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="hidden sm:flex"
                onClick={() => setShowDemoDialog(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book a Demo
              </Button>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                onClick={() => setShowLoginDialog(true)}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
                <Shield className="w-4 h-4" />
                GST Compliant Billing Software
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Simplify Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600"> Business Billing</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                All-in-one invoice and inventory management software designed for Indian businesses. 
                Create GST invoices, manage inventory, track payments, and grow your business efficiently.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8"
                  onClick={() => setShowDemoDialog(true)}
                >
                  Book a Free Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8"
                  onClick={() => setShowLoginDialog(true)}
                >
                  Login to Your Account
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">100%</div>
                  <div className="text-sm text-gray-500">GST Compliant</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-500">Cloud Access</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">Free</div>
                  <div className="text-sm text-gray-500">Demo Available</div>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-3xl transform rotate-3 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Tax Invoice</div>
                        <div className="text-sm text-gray-500">INV-2024-001</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">₹24,500</div>
                      <div className="text-sm text-green-600">Paid</div>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200"></div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">CGST (9%)</div>
                      <div className="font-medium">₹1,867.80</div>
                    </div>
                    <div>
                      <div className="text-gray-500">SGST (9%)</div>
                      <div className="font-medium">₹1,867.80</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From invoicing to inventory, payments to purchases - all your business operations in one powerful platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-purple-200 hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:from-purple-200 group-hover:to-indigo-200 transition-colors">
                    <feature.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Why Choose {APP_CONFIG.name}?
              </h2>
              <p className="text-purple-100 text-lg">
                Built specifically for Indian businesses with GST compliance at its core. 
                Manage your entire business operations from a single, intuitive platform.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-purple-50"
                onClick={() => setShowDemoDialog(true)}
              >
                Get Started with a Free Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of businesses already using {APP_CONFIG.name} to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8"
              onClick={() => setShowDemoDialog(true)}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book a Free Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
              onClick={() => setShowLoginDialog(true)}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">{APP_CONFIG.name}</span>
              </div>
              <p className="text-sm">
                Complete GST billing and inventory management software for Indian businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li>GST Invoicing</li>
                <li>Inventory Management</li>
                <li>Purchase Orders</li>
                <li>Payment Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Modules</h4>
              <ul className="space-y-2 text-sm">
                <li>Sales & Invoicing</li>
                <li>Stock Management</li>
                <li>Customer Management</li>
                <li>Reports & Analytics</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  support@example.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +91 98765 43210
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-purple-600" />
              Login to Your Account
            </DialogTitle>
            <DialogDescription>
              Enter your account name to proceed to the login page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="Enter your account name"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value)
                  setLoginError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLoginSubmit()
                }}
              />
              {loginError && (
                <p className="text-sm text-red-600">{loginError}</p>
              )}
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              onClick={handleLoginSubmit}
              disabled={isValidating}
            >
              {isValidating ? "Validating..." : "Continue to Login"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Demo Dialog */}
      <Dialog open={showDemoDialog} onOpenChange={(open) => {
        setShowDemoDialog(open)
        if (!open) {
          setDemoSuccess(false)
          setDemoError("")
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Book a Free Demo
            </DialogTitle>
            <DialogDescription>
              Fill in your details and our team will contact you to schedule a personalized demo.
            </DialogDescription>
          </DialogHeader>
          
          {demoSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Thank You!</h3>
              <p className="text-gray-600">
                Your demo request has been submitted successfully. Our team will contact you within 24 hours.
              </p>
              <Button onClick={() => setShowDemoDialog(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-name">Full Name *</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="demo-name"
                      placeholder="John Doe"
                      className="pl-10"
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-email">Email *</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="demo-email"
                      type="email"
                      placeholder="john@company.com"
                      className="pl-10"
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="demo-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-10"
                      value={demoForm.phone}
                      onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-company">Company Name</Label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="demo-company"
                      placeholder="ABC Enterprises"
                      className="pl-10"
                      value={demoForm.company_name}
                      onChange={(e) => setDemoForm({ ...demoForm, company_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-message">Message (Optional)</Label>
                <Textarea
                  id="demo-message"
                  placeholder="Tell us about your business requirements..."
                  rows={3}
                  value={demoForm.message}
                  onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                />
              </div>
              
              {demoError && (
                <p className="text-sm text-red-600">{demoError}</p>
              )}
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                onClick={handleDemoSubmit}
                disabled={demoSubmitting}
              >
                {demoSubmitting ? "Submitting..." : "Submit Demo Request"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
