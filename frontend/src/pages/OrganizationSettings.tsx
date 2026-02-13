import React, { useState, useEffect, useRef } from 'react';
import { Building, MapPin, Phone, Mail, Globe, FileText, Users, CreditCard, Shield, Settings, Save, Edit, X, Plus, UserCheck, UserX, Trash2, Banknote, Loader2 } from 'lucide-react';
import { useNotifications, NotificationContainer } from '../components/ui/notification';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { organizationService, OrganizationProfile, OrganizationCreate, OrganizationUpdate } from '../services/organizationService';
import { userManagementService, UserProfile, AdminUserCreate } from '../services/userManagementService';
import { useAuth } from '../utils/AuthContext';



const OrganizationSettings: React.FC = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempProfile, setTempProfile] = useState<OrganizationUpdate>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // User Management state - shows existing registered users for this account_id
  const [organizationUsers, setOrganizationUsers] = useState<UserProfile[]>([]);

  // Admin user management state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<AdminUserCreate>({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    designation: '',
    company: '',
    is_admin: false
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const pincodeUserChanged = useRef(false);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Function to open create user dialog with organization company name
  const openCreateUserDialog = () => {
    setNewUserData({
      email: '',
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      designation: '',
      company: profile?.company_name || '', // Set company name from organization profile
      is_admin: false
    });
    setIsCreateUserOpen(true);
  };

  const notifications = useNotifications();

  // PIN code lookup function
  const fetchPincodeDetails = async (pincode: string) => {
    if (!pincode || pincode.length !== 6) {
      return
    }

    setIsLoadingPincode(true)
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()
      
      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        const city = postOffice.District || postOffice.Block || ""
        const state = postOffice.State || ""
        
        setTempProfile(prev => ({
          ...prev,
          city: city,
          state: state
        }))
        
        notifications.success(
          'Location Found',
          `Location found: ${city}, ${state}`,
          { autoClose: true, autoCloseDelay: 3000 }
        )
      } else {
        notifications.error(
          'Invalid PIN Code',
          'Invalid PIN code or location not found',
          { autoClose: true, autoCloseDelay: 3000 }
        )
        setTempProfile(prev => ({
          ...prev,
          city: "",
          state: ""
        }))
      }
    } catch (error) {
      console.error("Error fetching PIN code details:", error)
      notifications.error(
        'PIN Code Lookup Failed',
        'Failed to fetch location details',
        { autoClose: true, autoCloseDelay: 3000 }
      )
      setTempProfile(prev => ({
        ...prev,
        city: "",
        state: ""
      }))
    } finally {
      setIsLoadingPincode(false)
    }
  }

  // Handle PIN code change with debouncing - only when user changes the pincode
  useEffect(() => {
    if (!pincodeUserChanged.current) return;
    const timeoutId = setTimeout(() => {
      if (tempProfile.postal_code && tempProfile.postal_code.length === 6) {
        fetchPincodeDetails(tempProfile.postal_code)
      }
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [tempProfile.postal_code])

  useEffect(() => {
    if (authUser) {
      loadOrganizationProfile();
      loadOrganizationUsers();
      loadLogo();
    }
  }, [authUser]);

  const loadOrganizationProfile = async () => {
    try {
      setIsInitialLoading(true);
      const orgData = await organizationService.getOrganizationProfile();
      setProfile(orgData);
      setTempProfile({});
    } catch (error) {
      console.error('Error loading organization profile:', error);
      // Profile doesn't exist yet, that's okay
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadLogo = async () => {
    try {
      const result = await organizationService.getLogo();
      setLogoData(result.logo_data);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notifications.error('File Too Large', 'Logo must be less than 2MB.', { autoClose: true, autoCloseDelay: 4000 });
      return;
    }
    setIsUploadingLogo(true);
    try {
      const result = await organizationService.uploadLogo(file);
      setLogoData(result.logo_data);
      notifications.success('Logo Uploaded', 'Company logo has been saved successfully.', { autoClose: true, autoCloseDelay: 3000 });
    } catch (error) {
      console.error('Error uploading logo:', error);
      notifications.error('Upload Failed', 'Failed to upload logo. Please try again.', { autoClose: true, autoCloseDelay: 4000 });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    setIsUploadingLogo(true);
    try {
      await organizationService.deleteLogo();
      setLogoData(null);
      notifications.success('Logo Removed', 'Company logo has been removed.', { autoClose: true, autoCloseDelay: 3000 });
    } catch (error) {
      console.error('Error deleting logo:', error);
      notifications.error('Delete Failed', 'Failed to remove logo.', { autoClose: true, autoCloseDelay: 4000 });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const loadOrganizationUsers = async () => {
    try {
      const users = await userManagementService.getOrganizationUsers();
      setOrganizationUsers(users);
    } catch (error) {
      console.error('Error loading organization users:', error);
      notifications.error(
        'Failed to Load Users',
        'Unable to load organization users. Please try again.',
        { autoClose: false }
      );
    }
  };

  // Admin functions
  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.username || !newUserData.password || 
        !newUserData.first_name || !newUserData.last_name) {
      notifications.error(
        'Missing Information',
        'Please fill in all required fields.',
        { autoClose: true, autoCloseDelay: 3000 }
      );
      return;
    }

    setIsCreatingUser(true);
    try {
      await userManagementService.createUser(newUserData);
      await loadOrganizationUsers(); // Refresh the list
      setIsCreateUserOpen(false);
      setNewUserData({
        email: '',
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        designation: '',
        company: profile?.company_name || '', // Reset to organization company name
        is_admin: false
      });
      notifications.success(
        'User Created',
        `User ${newUserData.first_name} ${newUserData.last_name} has been created successfully.`,
        { autoClose: true, autoCloseDelay: 3000 }
      );
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create user. Please try again.';
      notifications.error(
        'User Creation Failed',
        errorMessage,
        { autoClose: false }
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await userManagementService.updateUserStatus(userId, { is_active: !currentStatus });
      await loadOrganizationUsers(); // Refresh the list
      const action = currentStatus ? 'deactivated' : 'activated';
      notifications.success(
        'User Status Updated',
        `User has been ${action} successfully.`,
        { autoClose: true, autoCloseDelay: 3000 }
      );
    } catch (error: any) {
      console.error('Error updating user status:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update user status.';
      notifications.error(
        'Status Update Failed',
        errorMessage,
        { autoClose: false }
      );
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await userManagementService.deleteUser(userId);
      await loadOrganizationUsers(); // Refresh the list
      notifications.success(
        'User Deleted',
        `User "${userName}" has been deleted successfully.`,
        { autoClose: true, autoCloseDelay: 3000 }
      );
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete user.';
      notifications.error(
        'User Deletion Failed',
        errorMessage,
        { autoClose: false }
      );
    }
  };



  const businessTypes = [
    'Private Limited',
    'Public Limited',
    'Partnership',
    'Sole Proprietorship',
    'LLP',
    'Branch Office',
    'Subsidiary'
  ];

  const industries = [
    'Technology',
    'Manufacturing',
    'Retail',
    'Healthcare',
    'Finance',
    'Education',
    'Real Estate',
    'Transportation',
    'Food & Beverage',
    'Other'
  ];

  const currencies = [
    'INR - Indian Rupee',
    'USD - US Dollar',
    'EUR - Euro',
    'GBP - British Pound',
    'JPY - Japanese Yen',
    'CNY - Chinese Yuan'
  ];

  const timezones = [
    'Asia/Kolkata',
    'Asia/Dubai',
    'Europe/London',
    'America/New_York',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  const employeeCounts = [
    '1-10',
    '11-50',
    '50-100',
    '100-500',
    '500-1000',
    '1000+'
  ];

  const handleEdit = () => {
    if (profile) {
      setTempProfile({
        company_name: profile.company_name,
        business_type: profile.business_type,
        industry: profile.industry,
        founded_year: profile.founded_year,
        employee_count: profile.employee_count,
        registration_number: profile.registration_number,
        tax_id: profile.tax_id,
        gst_number: profile.gst_number,
        pan_number: profile.pan_number,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        currency: profile.currency,
        timezone: profile.timezone,
        fiscal_year_start: profile.fiscal_year_start,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postal_code: profile.postal_code,
        country: profile.country,
        // Banking Information
        bank_name: profile.bank_name,
        bank_account_number: profile.bank_account_number,
        bank_account_holder_name: profile.bank_account_holder_name,
        bank_ifsc_code: profile.bank_ifsc_code,
        bank_branch_name: profile.bank_branch_name,
        bank_branch_address: profile.bank_branch_address,
        bank_account_type: profile.bank_account_type,
        bank_swift_code: profile.bank_swift_code,
        description: profile.description,
        logo_url: profile.logo_url,
        is_verified: profile.is_verified,
        terms_and_conditions: (profile as any).terms_and_conditions,
        rcm_applicable: (profile as any).rcm_applicable,
        tax_invoice_color: profile.tax_invoice_color || '#4c1d95',
        proforma_invoice_color: profile.proforma_invoice_color || '#4c1d95',
        sales_return_color: profile.sales_return_color || '#dc2626',
        last_invoice_number: profile.last_invoice_number || 0,
        last_proforma_number: profile.last_proforma_number || 0,
      });
    }
    pincodeUserChanged.current = false;
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempProfile({});
    setIsEditing(false);
  };

  const handleCreateProfile = async () => {
    try {
      setIsLoading(true);
      const createData: OrganizationCreate = {
        company_name: tempProfile.company_name || '',
        business_type: tempProfile.business_type,
        industry: tempProfile.industry,
        founded_year: tempProfile.founded_year,
        employee_count: tempProfile.employee_count,
        registration_number: tempProfile.registration_number,
        tax_id: tempProfile.tax_id,
        gst_number: tempProfile.gst_number,
        pan_number: tempProfile.pan_number,
        phone: tempProfile.phone,
        email: tempProfile.email,
        website: tempProfile.website,
        currency: tempProfile.currency,
        timezone: tempProfile.timezone,
        fiscal_year_start: tempProfile.fiscal_year_start,
        address: tempProfile.address,
        city: tempProfile.city,
        state: tempProfile.state,
        postal_code: tempProfile.postal_code,
        country: tempProfile.country,
        // Banking Information
        bank_name: tempProfile.bank_name,
        bank_account_number: tempProfile.bank_account_number,
        bank_account_holder_name: tempProfile.bank_account_holder_name,
        bank_ifsc_code: tempProfile.bank_ifsc_code,
        bank_branch_name: tempProfile.bank_branch_name,
        bank_branch_address: tempProfile.bank_branch_address,
        bank_account_type: tempProfile.bank_account_type,
        bank_swift_code: tempProfile.bank_swift_code,
        description: tempProfile.description,
        logo_url: tempProfile.logo_url,
        is_verified: tempProfile.is_verified,
        terms_and_conditions: (tempProfile as any).terms_and_conditions,
        rcm_applicable: (tempProfile as any).rcm_applicable,
        tax_invoice_color: tempProfile.tax_invoice_color || '#4c1d95',
        proforma_invoice_color: tempProfile.proforma_invoice_color || '#4c1d95',
        sales_return_color: tempProfile.sales_return_color || '#dc2626',
        last_invoice_number: tempProfile.last_invoice_number || 0,
        last_proforma_number: tempProfile.last_proforma_number || 0,
      };
      const newProfile = await organizationService.createOrganizationProfile(createData);
      setProfile(newProfile);
      setIsEditing(false);
      setTempProfile({});
      notifications.success(
        'Organization Created',
        'Your organization profile has been created successfully.',
        { autoClose: true, autoCloseDelay: 3000 }
      );
    } catch (error) {
      console.error('Error creating organization profile:', error);
      notifications.error(
        'Creation Failed',
        'Unable to create organization profile. Please try again.',
        { autoClose: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      if (profile.id) {
        // Update existing profile
        const updatedProfile = await organizationService.updateOrganizationProfile(tempProfile);
        setProfile(updatedProfile);
      } else {
        // Create new profile
        const createData: OrganizationCreate = {
          company_name: tempProfile.company_name || profile.company_name,
          business_type: tempProfile.business_type,
          industry: tempProfile.industry,
          founded_year: tempProfile.founded_year,
          employee_count: tempProfile.employee_count,
          registration_number: tempProfile.registration_number,
          tax_id: tempProfile.tax_id,
          gst_number: tempProfile.gst_number,
          pan_number: tempProfile.pan_number,
          phone: tempProfile.phone,
          email: tempProfile.email,
          website: tempProfile.website,
          currency: tempProfile.currency,
          timezone: tempProfile.timezone,
          fiscal_year_start: tempProfile.fiscal_year_start,
          address: tempProfile.address,
          city: tempProfile.city,
          state: tempProfile.state,
          postal_code: tempProfile.postal_code,
          country: tempProfile.country,
          // Banking Information
          bank_name: tempProfile.bank_name,
          bank_account_number: tempProfile.bank_account_number,
          bank_account_holder_name: tempProfile.bank_account_holder_name,
          bank_ifsc_code: tempProfile.bank_ifsc_code,
          bank_branch_name: tempProfile.bank_branch_name,
          bank_branch_address: tempProfile.bank_branch_address,
          bank_account_type: tempProfile.bank_account_type,
          bank_swift_code: tempProfile.bank_swift_code,
          description: tempProfile.description,
          logo_url: tempProfile.logo_url,
          is_verified: tempProfile.is_verified,
          terms_and_conditions: (tempProfile as any).terms_and_conditions,
          rcm_applicable: (tempProfile as any).rcm_applicable,
          tax_invoice_color: tempProfile.tax_invoice_color || '#4c1d95',
          proforma_invoice_color: tempProfile.proforma_invoice_color || '#4c1d95',
          sales_return_color: tempProfile.sales_return_color || '#dc2626',
        };
        const newProfile = await organizationService.createOrganizationProfile(createData);
        setProfile(newProfile);
      }
      
      setIsEditing(false);
      setTempProfile({});
      
      notifications.success(
        'Organization Updated',
        'Your organization profile has been updated successfully.',
        { autoClose: true, autoCloseDelay: 3000 }
      );
    } catch (error) {
      console.error('Error updating organization:', error);
      notifications.error(
        'Update Failed',
        'Unable to update organization profile. Please try again.',
        { autoClose: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof OrganizationProfile, value: string | boolean | number) => {
    setTempProfile(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = () => {
    if (!profile) return 'ORG';
    return profile.company_name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 3);
  };

  // Show loading state while profile is being fetched
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10 p-8 flex items-center justify-center min-h-screen">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-violet-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading organization information...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no profile exists and not editing, show a message to create one
  if (!profile && !isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10 p-8 flex items-center justify-center min-h-screen">
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60">
            <CardContent className="p-8 text-center">
              <Building className="w-16 h-16 text-violet-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Organization Profile</h3>
              <p className="text-gray-600 font-medium mb-4">Create your organization profile to get started</p>
              <Button 
                onClick={() => {
                  setIsEditing(true);
                  setTempProfile({
                    company_name: '',
                    business_type: 'Private Limited',
                    industry: 'Technology',
                    founded_year: '2024',
                    employee_count: '1-10',
                    currency: 'INR',
                    timezone: 'Asia/Kolkata',
                    country: 'India',
                    is_verified: false
                  });
                }}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
              >
                <Edit className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If editing but no profile exists, show creation form
  if (isEditing && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building className="w-8 h-8 text-violet-600" />
              Create Organization Profile
            </h1>
            <p className="text-gray-600 mt-2">Set up your organization profile and business settings</p>
          </div>

          {/* Organization Form */}
          <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
            <CardHeader className="border-b border-white/40 px-6 py-4 relative z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Organization Profile</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setTempProfile({});
                    }}
                    className="bg-white/80 backdrop-blur-lg border border-white/90 hover:bg-white/90"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProfile}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Creating...' : 'Create Profile'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 relative z-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-violet-600" />
                    Basic Information
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <Input
                      value={tempProfile.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                    <Select value={tempProfile.business_type || 'Private Limited'} onValueChange={(value) => handleInputChange('business_type', value)}>
                      <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <Select value={tempProfile.industry || 'Technology'} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                    <Input
                      value={tempProfile.founded_year || '2024'}
                      onChange={(e) => handleInputChange('founded_year', e.target.value)}
                      className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                      placeholder="YYYY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Count</label>
                    <Select value={tempProfile.employee_count || '1-10'} onValueChange={(value) => handleInputChange('employee_count', value)}>
                      <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeCounts.map((count) => (
                          <SelectItem key={count} value={count}>{count}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Business Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-violet-600" />
                    Business Settings
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <Select value={tempProfile.currency || 'INR'} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency} value={currency.split(' - ')[0]}>{currency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <Select value={tempProfile.timezone || 'Asia/Kolkata'} onValueChange={(value) => handleInputChange('timezone', value)}>
                      <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <Input
                      value={tempProfile.country || 'India'}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer spacing */}
          <div className="h-20"></div>
        </div>

        {/* BAI Notification Container */}
        <NotificationContainer position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-25 to-indigo-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-50 to-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-500"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building className="w-8 h-8 text-violet-600" />
            Organization Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your organization profile and business settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Organization Overview & Users */}
          <div className="lg:w-80 flex-shrink-0 space-y-6">
            {/* Organization Overview */}
            <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
              <CardContent className="p-6 relative z-10">
                {/* Organization Logo */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold border-4 border-violet-100 mx-auto mb-4">
                    {getInitials()}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{profile?.company_name || 'Organization'}</h2>
                  <p className="text-gray-600 text-sm">{profile?.business_type || 'Business'}</p>
                  <p className="text-gray-500 text-xs">{profile?.industry || 'General'} Industry</p>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3 pt-4 border-t border-white/40">
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-violet-600" />
                    <span className="text-gray-700">{profile?.employee_count || '1-10'} employees</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-violet-600" />
                    <span className="text-gray-700">{profile?.country || 'India'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="w-4 h-4 text-violet-600" />
                    <span className="text-gray-700">{profile?.currency || 'INR'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-violet-600" />
                    <span className="text-gray-700">{profile?.is_verified ? 'Verified' : 'Not Verified'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Users */}
            <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
              <CardHeader className="border-b border-white/40 px-4 py-3 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-600" />
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Organization Users</h3>
                      <p className="text-xs text-gray-600">Users who can login to the system</p>
                    </div>
                  </div>
                  {authUser?.is_admin && (
                    <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={openCreateUserDialog}
                          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add New User</DialogTitle>
                          <DialogDescription>
                            Create a new user account for your organization.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                              <Input
                                value={newUserData.first_name}
                                onChange={(e) => setNewUserData(prev => ({ ...prev, first_name: e.target.value }))}
                                placeholder="John"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                              <Input
                                value={newUserData.last_name}
                                onChange={(e) => setNewUserData(prev => ({ ...prev, last_name: e.target.value }))}
                                placeholder="Doe"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <Input
                              type="email"
                              value={newUserData.email}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="john.doe@company.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                            <Input
                              value={newUserData.username}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                              placeholder="johndoe"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                            <Input
                              type="password"
                              value={newUserData.password}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Enter secure password"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <Input
                                value={newUserData.phone}
                                onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+1234567890"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                              <Input
                                value={newUserData.designation}
                                onChange={(e) => setNewUserData(prev => ({ ...prev, designation: e.target.value }))}
                                placeholder="Manager"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                            <Input
                              value={newUserData.company}
                              readOnly
                              className="bg-gray-50 cursor-not-allowed"
                              placeholder="Company Name"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Company name is automatically set from organization profile
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_admin"
                              checked={newUserData.is_admin}
                              onCheckedChange={(checked) => setNewUserData(prev => ({ ...prev, is_admin: checked as boolean }))}
                            />
                            <label htmlFor="is_admin" className="text-sm font-medium text-gray-700">
                              Grant admin privileges
                            </label>
                          </div>
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setIsCreateUserOpen(false)}
                              disabled={isCreatingUser}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCreateUser}
                              disabled={isCreatingUser}
                              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                            >
                              {isCreatingUser ? 'Creating...' : 'Create User'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 relative z-10">
                {/* Users List */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-600" />
                    Users ({organizationUsers.length})
                  </h4>
                  
                  {organizationUsers.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No users found</p>
                      <p className="text-xs">Users will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {organizationUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-lg border border-white/80 rounded-lg hover:bg-white/70 transition-all duration-200 shadow-sm ring-1 ring-white/50"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                            {(user.first_name?.charAt(0) || user.username?.charAt(0) || '').toUpperCase()}{(user.last_name?.charAt(0) || '').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <h5 className="font-medium text-gray-900 text-sm truncate">{(user.first_name || user.last_name) ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.username}</h5>
                              {authUser?.id === user.id && (
                                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">@{user.username}</p>
                            {user.designation && (
                              <p className="text-xs text-gray-500 truncate">{user.designation}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              {user.is_admin && (
                                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">Admin</span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                user.is_active 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Admin Controls */}
                          {authUser?.is_admin && authUser.id !== user.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                className={`p-1 h-6 w-6 ${
                                  user.is_active 
                                    ? 'hover:bg-red-50 hover:border-red-200 hover:text-red-600' 
                                    : 'hover:bg-green-50 hover:border-green-200 hover:text-green-600'
                                }`}
                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                              >
                                {user.is_active ? (
                                  <UserX className="w-3 h-3" />
                                ) : (
                                  <UserCheck className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                className="p-1 h-6 w-6 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                title="Delete user"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Organization Form */}
          <div className="flex-1">
            <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
              <CardHeader className="border-b border-white/40 px-6 py-4 relative z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Organization Profile</h3>
                  {!isEditing ? (
                    <Button
                      onClick={handleEdit}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="bg-white/80 backdrop-blur-lg border border-white/90 hover:bg-white/90"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 relative z-10">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-violet-600" />
                      Basic Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.company_name || profile?.company_name || ''}
                          onChange={(e) => handleInputChange('company_name', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.company_name || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      {isEditing ? (
                        <Select value={tempProfile.business_type || profile?.business_type || ''} onValueChange={(value) => handleInputChange('business_type', value)}>
                          <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {businessTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.business_type || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      {isEditing ? (
                        <Select value={tempProfile.industry || profile?.industry || ''} onValueChange={(value) => handleInputChange('industry', value)}>
                          <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {industries.map((industry) => (
                              <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.industry || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.founded_year || profile?.founded_year || ''}
                          onChange={(e) => handleInputChange('founded_year', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.founded_year || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee Count</label>
                      {isEditing ? (
                        <Select value={tempProfile.employee_count || profile?.employee_count || ''} onValueChange={(value) => handleInputChange('employee_count', value)}>
                          <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {employeeCounts.map((count) => (
                              <SelectItem key={count} value={count}>{count}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.employee_count || 'Not specified'}</p>
                      )}
                    </div>
                  </div>

                  {/* Legal & Tax Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-600" />
                      Legal & Tax Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.registration_number || profile?.registration_number || ''}
                          onChange={(e) => handleInputChange('registration_number', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.registration_number || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.gst_number || profile?.gst_number || ''}
                          onChange={(e) => handleInputChange('gst_number', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.gst_number || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.pan_number || profile?.pan_number || ''}
                          onChange={(e) => handleInputChange('pan_number', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.pan_number || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.tax_id || profile?.tax_id || ''}
                          onChange={(e) => handleInputChange('tax_id', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.tax_id || 'Not specified'}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-violet-600" />
                      Contact Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.phone || profile?.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.phone || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.email || profile?.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.email || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.website || profile?.website || ''}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.website || 'Not specified'}</p>
                      )}
                    </div>
                  </div>

                  {/* Business Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-violet-600" />
                      Business Settings
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      {isEditing ? (
                        <Select value={tempProfile.currency || profile?.currency || 'INR'} onValueChange={(value) => handleInputChange('currency', value)}>
                          <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency} value={currency.split(' - ')[0]}>{currency}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.currency || 'INR'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      {isEditing ? (
                        <Select value={tempProfile.timezone || profile?.timezone || 'Asia/Kolkata'} onValueChange={(value) => handleInputChange('timezone', value)}>
                          <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.map((tz) => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.timezone || 'Asia/Kolkata'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year Start</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.fiscal_year_start || profile?.fiscal_year_start || ''}
                          onChange={(e) => handleInputChange('fiscal_year_start', e.target.value)}
                          placeholder="MM-DD"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.fiscal_year_start || 'Not specified'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Section - Full Width */}
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-violet-600" />
                    Address Information
                  </h4>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      {isEditing ? (
                        <Textarea
                          value={tempProfile.address || profile?.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          rows={3}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.address || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                        {isEditing ? (
                          <div className="relative">
                            <Input
                              value={tempProfile.postal_code || profile?.postal_code || ''}
                              onChange={(e) => { pincodeUserChanged.current = true; handleInputChange('postal_code', e.target.value); }}
                              className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg pr-8"
                              placeholder="Enter 6-digit PIN code"
                              maxLength={6}
                            />
                            {isLoadingPincode && (
                              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                            )}
                          </div>
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.postal_code || 'Not specified'}</p>
                        )}
                        {isEditing && (
                          <p className="text-xs text-gray-500 mt-1">
                            Enter PIN code to auto-fill city and state
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        {isEditing ? (
                          <Input
                            value={tempProfile.city || profile?.city || ''}
                            onChange={(e) => setTempProfile({ ...tempProfile, city: e.target.value })}
                            className="w-full p-3 bg-white border-gray-200 text-gray-900 rounded-lg"
                            placeholder="City (auto-filled or enter manually)"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.city || 'Not specified'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        {isEditing ? (
                          <Input
                            value={tempProfile.state || profile?.state || ''}
                            onChange={(e) => setTempProfile({ ...tempProfile, state: e.target.value })}
                            className="w-full p-3 bg-white border-gray-200 text-gray-900 rounded-lg"
                            placeholder="State (auto-filled or enter manually)"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.state || 'Not specified'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banking Information Section */}
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-violet-600" />
                    Banking Information
                  </h4>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.bank_name || profile?.bank_name || ''}
                          onChange={(e) => handleInputChange('bank_name', e.target.value)}
                          placeholder="State Bank of India"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_name || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.bank_account_holder_name || profile?.bank_account_holder_name || ''}
                          onChange={(e) => handleInputChange('bank_account_holder_name', e.target.value)}
                          placeholder="Company Name or Account Holder"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_account_holder_name || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.bank_account_number || profile?.bank_account_number || ''}
                          onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                          placeholder="1234567890"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_account_number || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.bank_ifsc_code || profile?.bank_ifsc_code || ''}
                          onChange={(e) => handleInputChange('bank_ifsc_code', e.target.value)}
                          placeholder="SBIN0001234"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_ifsc_code || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                      {isEditing ? (
                        <select
                          value={tempProfile.bank_account_type || profile?.bank_account_type || ''}
                          onChange={(e) => handleInputChange('bank_account_type', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        >
                          <option value="">Select Account Type</option>
                          <option value="Savings">Savings</option>
                          <option value="Current">Current</option>
                          <option value="Salary">Salary</option>
                          <option value="Fixed Deposit">Fixed Deposit</option>
                          <option value="Business">Business</option>
                        </select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_account_type || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.bank_branch_name || profile?.bank_branch_name || ''}
                          onChange={(e) => handleInputChange('bank_branch_name', e.target.value)}
                          placeholder="Main Branch"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_branch_name || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="xl:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address</label>
                      {isEditing ? (
                        <Textarea
                          value={tempProfile.bank_branch_address || profile?.bank_branch_address || ''}
                          onChange={(e) => handleInputChange('bank_branch_address', e.target.value)}
                          rows={2}
                          placeholder="Complete branch address"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_branch_address || 'Not specified'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT Code (Optional)</label>
                      {isEditing ? (
                        <Input
                          value={tempProfile.bank_swift_code || profile?.bank_swift_code || ''}
                          onChange={(e) => handleInputChange('bank_swift_code', e.target.value)}
                          placeholder="SBININBB123"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.bank_swift_code || 'Not specified'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice PDF Details Section */}
                <div className="mt-8 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 border-b-2 border-violet-300 pb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-600" />
                    Invoice PDF Details
                  </h3>
                  <p className="text-xs text-gray-500">These settings control what appears on your generated invoice PDFs.</p>
                </div>

                {/* Last Used Invoice Numbers */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    Invoice Number Tracking
                  </h4>
                  <p className="text-xs text-gray-500">Set the last used invoice/proforma number. New invoices will increment from this number. These values are also auto-updated when new invoices are created.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Used Invoice Number</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          value={tempProfile.last_invoice_number ?? profile?.last_invoice_number ?? 0}
                          onChange={(e) => handleInputChange('last_invoice_number', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.last_invoice_number || 0}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Next invoice will be: INV-...-{String((tempProfile.last_invoice_number ?? profile?.last_invoice_number ?? 0) + 1).padStart(3, '0')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Used Proforma Invoice Number</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          value={tempProfile.last_proforma_number ?? profile?.last_proforma_number ?? 0}
                          onChange={(e) => handleInputChange('last_proforma_number', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.last_proforma_number || 0}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Next proforma will be: PI-{String((tempProfile.last_proforma_number ?? profile?.last_proforma_number ?? 0) + 1).padStart(6, '0')}</p>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions Section */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    Terms & Conditions
                  </h4>
                  <div>
                    {isEditing ? (
                      <Textarea
                        value={(tempProfile as any).terms_and_conditions || (profile as any)?.terms_and_conditions || ''}
                        onChange={(e) => handleInputChange('terms_and_conditions' as any, e.target.value)}
                        rows={5}
                        placeholder="Enter terms and conditions that will appear on invoices..."
                        className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">{(profile as any)?.terms_and_conditions || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                {/* Company Logo Section */}
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    Company Logo
                  </h4>
                  <div>
                    {logoData ? (
                      <div className="flex items-center gap-4">
                        <img src={logoData} alt="Company Logo" className="h-16 w-auto object-contain border rounded p-1" />
                        <div className="flex flex-col gap-2">
                          <span className="text-sm text-green-600 font-medium">Logo uploaded</span>
                          <div className="flex gap-2">
                            <label className="cursor-pointer">
                              <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                              <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors">
                                {isUploadingLogo ? 'Uploading...' : 'Change Logo'}
                              </span>
                            </label>
                            <Button variant="outline" size="sm" onClick={handleLogoDelete} disabled={isUploadingLogo} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                          No Logo
                        </div>
                        <label className="cursor-pointer">
                          <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                          <span className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm">
                            {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                          </span>
                        </label>
                        <span className="text-xs text-gray-500">PNG, JPG, GIF, WebP (max 2MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RCM (Reverse Charge Mechanism) Section */}
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    Reverse Charge Mechanism (RCM)
                  </h4>
                  <div>
                    {isEditing ? (
                      <Select
                        value={(tempProfile as any).rcm_applicable === true ? 'Yes' : (tempProfile as any).rcm_applicable === false ? 'No' : ((profile as any)?.rcm_applicable ? 'Yes' : 'No')}
                        onValueChange={(value) => handleInputChange('rcm_applicable' as any, value === 'Yes')}
                      >
                        <SelectTrigger className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg">
                          <SelectValue placeholder="Select RCM applicability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{(profile as any)?.rcm_applicable ? 'Yes' : 'No'}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Whether tax is payable on reverse charge basis. This will be printed on invoices.</p>
                  </div>
                </div>

                {/* Invoice Color Settings Section */}
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    Invoice PDF Color Settings
                  </h4>
                  <p className="text-xs text-gray-500">Choose accent colors for your PDF invoices. These colors are used for headers, table headings, totals, and other highlighted elements.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tax Invoice Color */}
                    {(() => {
                      const PRESET_COLORS = [
                        { label: 'Deep Purple', value: '#4c1d95' },
                        { label: 'Indigo', value: '#3730a3' },
                        { label: 'Blue', value: '#1e40af' },
                        { label: 'Teal', value: '#0f766e' },
                        { label: 'Green', value: '#15803d' },
                        { label: 'Orange', value: '#c2410c' },
                        { label: 'Red', value: '#b91c1c' },
                        { label: 'Pink', value: '#be185d' },
                        { label: 'Slate', value: '#334155' },
                        { label: 'Black', value: '#111827' },
                      ];
                      const renderColorPicker = (label: string, field: 'tax_invoice_color' | 'proforma_invoice_color' | 'sales_return_color', defaultColor: string) => {
                        const currentColor = (isEditing ? tempProfile[field] : profile?.[field]) || defaultColor;
                        return (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{label}</label>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: currentColor }}></div>
                              <span className="text-sm font-mono text-gray-600">{currentColor}</span>
                            </div>
                            {isEditing && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {PRESET_COLORS.map((c) => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      title={c.label}
                                      onClick={() => handleInputChange(field, c.value)}
                                      className={`w-7 h-7 rounded-md border-2 transition-all duration-150 ${currentColor === c.value ? 'border-gray-900 scale-110 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200 hover:border-gray-400'}`}
                                      style={{ backgroundColor: c.value }}
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => handleInputChange(field, e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                                    title="Custom color"
                                  />
                                  <Input
                                    value={currentColor}
                                    onChange={(e) => handleInputChange(field, e.target.value)}
                                    placeholder="#4c1d95"
                                    className="w-28 h-8 text-xs font-mono p-2 bg-white/80 border border-white/90 text-gray-900 focus:border-violet-500 rounded-md"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      };
                      return (
                        <>
                          {renderColorPicker('Tax Invoice', 'tax_invoice_color', '#4c1d95')}
                          {renderColorPicker('Proforma Invoice', 'proforma_invoice_color', '#4c1d95')}
                          {renderColorPicker('Sales Return / Credit Note', 'sales_return_color', '#dc2626')}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Description Section */}
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Company Description</h4>
                  <div>
                    {isEditing ? (
                      <Textarea
                        value={tempProfile.description || profile?.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        placeholder="Describe your organization, mission, and values..."
                        className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile?.description || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer spacing */}
        <div className="h-20"></div>
      </div>

      {/* BAI Notification Container */}
      <NotificationContainer position="top-right" />
    </div>
  );
};

export default OrganizationSettings;
