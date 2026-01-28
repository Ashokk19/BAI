import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Edit, Save, X, Loader2 } from 'lucide-react';
import { useNotifications, NotificationContainer } from '../components/ui/notification';
import { userService, UserProfile, UserProfileUpdate } from '../services/userService';
import { organizationService, OrganizationProfile } from '../services/organizationService';
import { useAuth } from '../utils/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/card';

// Using UserProfile interface from userService

const Profile: React.FC = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfileUpdate>({});
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);

  const notifications = useNotifications();

  useEffect(() => {
    if (authUser) {
      loadProfile();
      loadOrganization();
    }
  }, [authUser]);

  const loadProfile = async () => {
    try {
      const userData = await userService.getCurrentUser();
      setProfile(userData);
      console.log('Profile loaded:', userData);
    } catch (error) {
      console.error('Error loading profile:', error);
      notifications.error(
        'Profile Load Failed',
        'Unable to load profile information. Please try again.',
        { autoClose: false }
      );
    }
  };

  const loadOrganization = async () => {
    try {
      const org = await organizationService.getOrganizationProfile();
      setOrganization(org);
    } catch (error) {
      // If no organization exists or 404, treat as null and do not alert
      setOrganization(null);
    }
  };

  const handleEdit = () => {
    if (profile) {
      setTempProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        mobile: profile.mobile,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postal_code: profile.postal_code,
        company: profile.company || organization?.company_name || '',
        designation: profile.designation,
        signature_name: profile.signature_name || ((profile.first_name || '') + ' ' + (profile.last_name || '')).trim(),
        signature_style: profile.signature_style || 'handwritten',
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempProfile({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Build payload ensuring blank strings persist and company defaults to org name if available
      const payload: UserProfileUpdate = {
        first_name: tempProfile.first_name ?? '',
        last_name: tempProfile.last_name ?? '',
        phone: tempProfile.phone ?? '',
        mobile: tempProfile.mobile ?? '',
        address: tempProfile.address ?? '',
        city: tempProfile.city ?? '',
        state: tempProfile.state ?? '',
        postal_code: tempProfile.postal_code ?? '',
        company: (tempProfile.company !== undefined && tempProfile.company !== null)
          ? tempProfile.company
          : (organization?.company_name || ''),
        designation: tempProfile.designation ?? '',
        signature_name: tempProfile.signature_name ?? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        signature_style: tempProfile.signature_style ?? 'handwritten',
      };

      await userService.updateProfile(payload);
      await loadProfile();
      setIsEditing(false);
      
      notifications.success(
        'Profile Updated',
        'Your profile has been updated successfully.',
        { autoClose: true, autoCloseDelay: 3000 }
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      notifications.error(
        'Update Failed',
        'Unable to update profile. Please check your connection and try again.',
        { autoClose: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

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

  // Handle PIN code change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tempProfile.postal_code && tempProfile.postal_code.length === 6) {
        fetchPincodeDetails(tempProfile.postal_code)
      }
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [tempProfile.postal_code])

  const handleInputChange = (field: keyof UserProfileUpdate, value: string) => {
    setTempProfile(prev => ({ ...prev, [field]: value }));
  };



  const getInitials = () => {
    if (!profile) return '';
    const first = profile.first_name || profile.username || '';
    const last = profile.last_name || '';
    const fi = typeof first === 'string' && first.length > 0 ? first.charAt(0) : '';
    const li = typeof last === 'string' && last.length > 0 ? last.charAt(0) : '';
    return `${fi}${li}`.toUpperCase();
  };

  // Show loading state while profile is being fetched
  if (!profile) {
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
              <p className="text-gray-600 font-medium">Loading profile information...</p>
            </CardContent>
          </Card>
        </div>
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
            <User className="w-8 h-8 text-violet-600" />
            Profile
          </h1>
          <p className="text-gray-600 mt-2">Manage your personal information and account details</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Avatar and Basic Info */}
          <div className="lg:w-80 flex-shrink-0">
            <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden h-fit">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
              <CardContent className="p-6 relative z-10">
                {/* Avatar Section */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-violet-100">
                      {getInitials()}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {profile.first_name} {profile.last_name}
                    </h2>
                    <p className="text-gray-600">{profile.designation || 'No designation'}</p>
                    <p className="text-sm text-gray-500">{profile.company || ''}</p>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-violet-600" />
                      <span className="text-gray-700">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-violet-600" />
                      <span className="text-gray-700">{profile.mobile || 'No mobile'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-violet-600" />
                      <span className="text-gray-700">{profile.city || 'No city'}, {profile.state || 'No state'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Profile Form */}
          <div className="flex-1">
            <Card className="bg-white/40 backdrop-blur-3xl border border-white/80 shadow-xl ring-1 ring-white/60 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20"></div>
              <CardHeader className="border-b border-white/40 px-6 py-4 relative z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  {!isEditing ? (
                    <button
                      onClick={handleEdit}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 relative z-10">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Personal Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Personal Details</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempProfile.first_name || ''}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempProfile.last_name || ''}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-2 bg-gray-50 rounded-lg text-gray-900">{profile.last_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.email}</p>
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={tempProfile.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.phone || 'No phone'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={tempProfile.mobile || ''}
                          onChange={(e) => handleInputChange('mobile', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.mobile || 'No mobile'}</p>
                      )}
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Professional Details</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempProfile.company || ''}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.company || ''}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempProfile.designation || ''}
                          onChange={(e) => handleInputChange('designation', e.target.value)}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.designation || 'No designation'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      {isEditing ? (
                        <textarea
                          value={tempProfile.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          rows={2}
                          className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.address || 'No address'}</p>
                      )}
                    </div>

                    {/* Digital Signature Settings */}
                    <div className="pt-2 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Digital Signature</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Signature Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={tempProfile.signature_name || ''}
                              onChange={(e) => handleInputChange('signature_name', e.target.value)}
                              className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                              placeholder="Name to display in signature"
                            />
                          ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.signature_name || `${profile.first_name} ${profile.last_name}`}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Signature Style</label>
                          {isEditing ? (
                            <select
                              value={tempProfile.signature_style || 'handwritten'}
                              onChange={(e) => handleInputChange('signature_style', e.target.value)}
                              className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg"
                            >
                              <option value="handwritten">Handwritten</option>
                              <option value="cursive">Cursive</option>
                              <option value="print">Print</option>
                              <option value="mono">Monospace</option>
                            </select>
                          ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900 capitalize">{profile.signature_style || 'handwritten'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                          {(() => {
                            const styleMap: Record<string, React.CSSProperties> = {
                              handwritten: { fontFamily: 'Brush Script MT, Segoe Script, Lucida Handwriting, cursive', fontSize: '20px', fontWeight: 500 },
                              cursive: { fontFamily: 'cursive', fontSize: '20px' },
                              print: { fontFamily: 'Times New Roman, Times, serif', fontSize: '16px', fontWeight: 600 },
                              mono: { fontFamily: 'Courier New, monospace', fontSize: '16px', fontWeight: 600 },
                            };
                            const s = (isEditing ? tempProfile.signature_style : profile.signature_style) || 'handwritten';
                            const name = (isEditing ? tempProfile.signature_name : profile.signature_name) || `${profile.first_name} ${profile.last_name}`;
                            return (
                              <div className="p-3 bg-white/70 rounded border border-white/80 text-right">
                                <div style={styleMap[s]}> {name} </div>
                                <div className="text-xs text-gray-600 mt-1">Authorized Signatory</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Location Details</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={tempProfile.postal_code || ''}
                            onChange={(e) => handleInputChange('postal_code', e.target.value)}
                            className="w-full p-3 bg-white/80 backdrop-blur-lg border border-white/90 text-gray-900 focus:border-violet-500 focus:ring-violet-500/40 focus:bg-white/90 transition-all duration-200 shadow-lg ring-1 ring-white/50 font-semibold rounded-lg pr-8"
                            placeholder="Enter 6-digit PIN code"
                            maxLength={6}
                          />
                          {isLoadingPincode && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                          )}
                        </div>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.postal_code || 'No postal code'}</p>
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
                        <input
                          type="text"
                          value={tempProfile.city || ''}
                          readOnly
                          className="w-full p-3 bg-gray-50 border-gray-200 cursor-not-allowed text-gray-900 rounded-lg"
                          placeholder="Auto-filled from PIN code"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.city || 'No city'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempProfile.state || ''}
                          readOnly
                          className="w-full p-3 bg-gray-50 border-gray-200 cursor-not-allowed text-gray-900 rounded-lg"
                          placeholder="Auto-filled from PIN code"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profile.state || 'No state'}</p>
                      )}
                    </div>
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

export default Profile;
