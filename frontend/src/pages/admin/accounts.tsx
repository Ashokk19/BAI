"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { accountsApi, type Account } from "@/services/accountsApi"
import { useAuth } from "@/utils/AuthContext"
import { apiService } from "@/services/api"
import { Pencil, Trash2, UserPlus, Users, Calendar, Phone, Mail, Building2, CheckCircle, XCircle, Clock } from "lucide-react"

interface DemoRequest {
  id: number
  name: string
  email: string
  phone: string
  company_name?: string
  message?: string
  status: string
  demo_date?: string
  created_at: string
  updated_at?: string
}

interface User {
  id: number
  account_id: string
  username: string
  email: string
  full_name: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export default function AccountsAdmin() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [demoStatusFilter, setDemoStatusFilter] = useState<string>("")
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Account form
  const [newAcc, setNewAcc] = useState({ account_id: "", display_name: "", is_master: false })
  
  // Edit account dialog
  const [editAcc, setEditAcc] = useState<Account | null>(null)
  const [editForm, setEditForm] = useState({ display_name: "", is_active: true })
  
  // User form
  const [userFilter, setUserFilter] = useState("")
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", full_name: "", account_id: "" })
  const [showUserDialog, setShowUserDialog] = useState(false)

  const isMaster = user?.account_id?.toLowerCase() === "masteraccount"

  const loadAccounts = async () => {
    try {
      const list = await accountsApi.listAccounts()
      setAccounts(list)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load accounts")
    }
  }

  const loadUsers = async () => {
    try {
      const list = await apiService.get<User[]>("/api/user-management/users")
      setUsers(list)
    } catch (e: any) {
      console.error("Failed to load users:", e)
    }
  }

  const loadDemoRequests = async (statusFilter?: string) => {
    setIsDemoLoading(true)
    try {
      const filterToUse = statusFilter !== undefined ? statusFilter : demoStatusFilter
      const url = filterToUse 
        ? `/api/demo-requests/?status_filter=${filterToUse}`
        : "/api/demo-requests/"
      console.log('Loading demo requests with URL:', url)
      const list = await apiService.get<DemoRequest[]>(url)
      console.log('Loaded demo requests:', list.length, 'records')
      setDemoRequests(list)
    } catch (e: any) {
      console.error("Failed to load demo requests:", e)
      setError("Failed to load demo requests")
    } finally {
      setIsDemoLoading(false)
    }
  }

  const handleUpdateDemoStatus = async (id: number, newStatus: string) => {
    try {
      await apiService.put(`/api/demo-requests/${id}/status?new_status=${newStatus}`, {})
      setSuccess("Demo request status updated")
      await loadDemoRequests()
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to update status")
    }
  }

  const handleUpdateDemoDate = async (id: number, newDate: string) => {
    if (!newDate) return // Don't update if date is cleared
    try {
      setError(null)
      setSuccess(null)
      await apiService.put(`/api/demo-requests/${id}/date?demo_date=${newDate}`, {})
      setSuccess("Demo date updated successfully")
      // Reload with current filter to ensure we see the updated record
      await loadDemoRequests(demoStatusFilter)
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to update date")
      // Reload to revert UI to database state
      await loadDemoRequests(demoStatusFilter)
    }
  }

  const handleDeleteDemoRequest = async (id: number) => {
    if (!confirm("Delete this demo request?")) return
    try {
      await apiService.delete(`/api/demo-requests/${id}`)
      setSuccess("Demo request deleted")
      await loadDemoRequests()
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to delete demo request")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "contacted":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Phone className="w-3 h-3 mr-1" />Contacted</Badge>
      case "demo_scheduled":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Calendar className="w-3 h-3 mr-1" />Scheduled</Badge>
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case "cancelled":
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  useEffect(() => {
    if (isMaster) {
      setIsLoading(true)
      Promise.all([loadAccounts(), loadUsers(), loadDemoRequests()]).finally(() => setIsLoading(false))
    }
  }, [isMaster])

  const handleCreateAccount = async () => {
    if (!newAcc.account_id.trim()) return
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await accountsApi.createAccount({
        account_id: newAcc.account_id.trim(),
        display_name: newAcc.display_name.trim() || undefined,
        is_master: newAcc.is_master,
      })
      setNewAcc({ account_id: "", display_name: "", is_master: false })
      setSuccess("Account created successfully")
      await loadAccounts()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditAccount = (acc: Account) => {
    setEditAcc(acc)
    setEditForm({ display_name: acc.display_name || "", is_active: acc.is_active })
  }

  const handleUpdateAccount = async () => {
    if (!editAcc) return
    setIsLoading(true)
    setError(null)
    try {
      await accountsApi.updateAccount(editAcc.account_id, {
        display_name: editForm.display_name || undefined,
        is_active: editForm.is_active,
      })
      setEditAcc(null)
      setSuccess("Account updated successfully")
      await loadAccounts()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to update account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async (account_id: string) => {
    if (!confirm(`Delete account "${account_id}"? This cannot be undone.`)) return
    setIsLoading(true)
    setError(null)
    try {
      await accountsApi.deleteAccount(account_id)
      setSuccess("Account deleted successfully")
      await loadAccounts()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to delete account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.account_id) return
    setIsLoading(true)
    setError(null)
    try {
      await apiService.post("/api/user-management/users", {
        username: newUser.username.trim(),
        email: newUser.email.trim() || `${newUser.username.trim()}@example.com`,
        password: newUser.password || "defaultpassword123",
        full_name: newUser.full_name.trim() || newUser.username.trim(),
        account_id: newUser.account_id,
        is_admin: true,
      })
      setNewUser({ username: "", email: "", password: "", full_name: "", account_id: "" })
      setShowUserDialog(false)
      setSuccess("User created successfully with Admin enabled")
      await loadUsers()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to create user")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = userFilter
    ? users.filter((u) => u.account_id.toLowerCase().includes(userFilter.toLowerCase()))
    : users

  if (!isMaster) {
    return (
      <div className="p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be signed in with the Master account to manage accounts.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin: Accounts & Users</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Create Account */}
      <Card>
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acc-id">Account ID *</Label>
              <Input id="acc-id" value={newAcc.account_id} onChange={(e) => setNewAcc({ ...newAcc, account_id: e.target.value })} placeholder="e.g. CompanyXYZ" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-name">Display Name</Label>
              <Input id="acc-name" value={newAcc.display_name} onChange={(e) => setNewAcc({ ...newAcc, display_name: e.target.value })} placeholder="e.g. Company XYZ Inc." />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleCreateAccount} disabled={isLoading || !newAcc.account_id.trim()}>Create Account</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Account ID</th>
                    <th className="p-3 font-semibold">Display Name</th>
                    <th className="p-3 font-semibold">Master</th>
                    <th className="p-3 font-semibold">Active</th>
                    <th className="p-3 font-semibold">Created</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{a.account_id}</td>
                      <td className="p-3">{a.display_name || "-"}</td>
                      <td className="p-3">{a.is_master ? <span className="text-purple-600 font-semibold">Yes</span> : "No"}</td>
                      <td className="p-3">{a.is_active ? <span className="text-green-600">Active</span> : <span className="text-red-600">Inactive</span>}</td>
                      <td className="p-3">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditAccount(a)}><Pencil className="w-4 h-4" /></Button>
                          {!a.is_master && (
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteAccount(a.account_id)}><Trash2 className="w-4 h-4" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Users</CardTitle>
          <Button onClick={() => setShowUserDialog(true)}><UserPlus className="w-4 h-4 mr-2" /> Create User</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Label>Filter by Account ID:</Label>
            <Input className="max-w-xs" placeholder="Type to filter..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Username</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Full Name</th>
                  <th className="p-3 font-semibold">Account ID</th>
                  <th className="p-3 font-semibold">Admin</th>
                  <th className="p-3 font-semibold">Active</th>
                  <th className="p-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{u.username}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.full_name || "-"}</td>
                    <td className="p-3">{u.account_id}</td>
                    <td className="p-3">{u.is_admin ? <span className="text-purple-600 font-semibold">Yes</span> : "No"}</td>
                    <td className="p-3">{u.is_active ? <span className="text-green-600">Active</span> : <span className="text-red-600">Inactive</span>}</td>
                    <td className="p-3">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} className="p-3 text-center text-gray-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Demo Requests Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Demo Requests</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Filter by Status:</Label>
            <select 
              className="border rounded px-3 py-1.5 text-sm"
              value={demoStatusFilter}
              onChange={(e) => {
                const newFilter = e.target.value
                setDemoStatusFilter(newFilter)
                loadDemoRequests(newFilter)
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="demo_scheduled">Demo Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isDemoLoading ? (
            <div className="text-center text-gray-500 py-8">Loading demo requests...</div>
          ) : demoRequests.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No demo requests {demoStatusFilter ? `with status "${demoStatusFilter}"` : "yet"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Contact</th>
                    <th className="p-3 font-semibold">Company</th>
                    <th className="p-3 font-semibold">Message</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demoRequests.map((req) => (
                    <tr key={req.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{req.name}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <a href={`mailto:${req.email}`} className="text-blue-600 hover:underline">{req.email}</a>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <a href={`tel:${req.phone}`} className="text-blue-600 hover:underline">{req.phone}</a>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {req.company_name ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {req.company_name}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={req.message}>{req.message || "-"}</td>
                      <td className="p-3">{getStatusBadge(req.status)}</td>
                      <td className="p-3">
                        <Input
                          type="date"
                          className="text-xs w-32"
                          defaultValue={req.demo_date || ""}
                          onBlur={(e) => {
                            const newDate = e.target.value
                            if (newDate !== (req.demo_date || "")) {
                              handleUpdateDemoDate(req.id, newDate)
                            }
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          <select 
                            className="text-xs border rounded px-2 py-1"
                            value={req.status}
                            onChange={(e) => handleUpdateDemoStatus(req.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="demo_scheduled">Demo Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteDemoRequest(req.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Account Dialog */}
      <Dialog open={!!editAcc} onOpenChange={() => setEditAcc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account: {editAcc?.account_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="edit-active" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAcc(null)}>Cancel</Button>
            <Button onClick={handleUpdateAccount} disabled={isLoading}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User (Admin)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account ID *</Label>
              <select className="w-full border rounded-md p-2" value={newUser.account_id} onChange={(e) => setNewUser({ ...newUser, account_id: e.target.value })}>
                <option value="">Select Account</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>{a.display_name || a.account_id}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Leave blank for default" />
            </div>
            <p className="text-sm text-gray-500">Note: User will be created with Admin privileges enabled.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isLoading || !newUser.username.trim() || !newUser.account_id}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
