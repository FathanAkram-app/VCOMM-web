import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import {
  Users, UserCheck, MessageSquare, Phone, Server, Database, Shield, Settings, Trash2, Plus, Edit, Eye,
  BarChart3, Activity, AlertTriangle, Clock, LogOut, Search, Filter, X
} from 'lucide-react';

export default function AdminComplete() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddRankModal, setShowAddRankModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  
  // User search and filter states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userBranchFilter, setUserBranchFilter] = useState('all');

  // Queries
  const statsQuery = useQuery({
    queryKey: ['/api/admin/dashboard/stats'],
    refetchInterval: 30000,
  });

  const healthQuery = useQuery({
    queryKey: ['/api/admin/dashboard/health'],
    refetchInterval: 60000,
  });

  const usersQuery = useQuery({
    queryKey: ['/api/admin/users'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  const configQuery = useQuery({
    queryKey: ['/api/admin/config'],
  });

  const ranksQuery = useQuery({
    queryKey: ['/api/admin/ranks'],
  });

  const branchesQuery = useQuery({
    queryKey: ['/api/admin/branches'],
  });

  const securityQuery = useQuery({
    queryKey: ['/api/admin/dashboard/security'],
    refetchInterval: 60000,
  });

  const logsQuery = useQuery({
    queryKey: ['/api/admin/logs'],
    refetchInterval: 30000,
  });

  // User Management Mutations
  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${id}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Berhasil",
        description: "Role pengguna berhasil diperbarui",
      });
    },
    onError: (error) => {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Gagal memperbarui role pengguna",
        variant: "destructive",
      });
    }
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Berhasil",
        description: "Status pengguna berhasil diperbarui",
      });
    },
    onError: (error) => {
      console.error("Error updating user status:", error);
      toast({
        title: "Error", 
        description: "Gagal memperbarui status pengguna",
        variant: "destructive",
      });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Berhasil",
        description: "Pengguna berhasil dihapus",
      });
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus pengguna",
        variant: "destructive",
      });
    }
  });

  // Filter users based on search term and filters
  const filteredUsers = usersQuery.data?.filter((user: any) => {
    const matchesSearch = userSearchTerm === '' || 
      user.callsign?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.nrp?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.rank?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.branch?.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesStatus = userStatusFilter === 'all' || user.status === userStatusFilter;
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    const matchesBranch = userBranchFilter === 'all' || user.branch === userBranchFilter;
    
    return matchesSearch && matchesStatus && matchesRole && matchesBranch;
  }) || [];

  // Clear all filters
  const clearFilters = () => {
    setUserSearchTerm('');
    setUserStatusFilter('all');
    setUserRoleFilter('all');
    setUserBranchFilter('all');
  };

  // Config Management Mutations
  const updateConfig = useMutation({
    mutationFn: async ({ id, configValue }: { id: number; configValue: string }) => {
      const response = await apiRequest('PUT', `/api/admin/config/${id}`, { configValue });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "Berhasil",
        description: "Konfigurasi berhasil diperbarui",
      });
    },
  });

  // Ranks Management Mutations
  const createRank = useMutation({
    mutationFn: async (rankData: any) => {
      const response = await apiRequest('POST', '/api/admin/ranks', rankData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ranks'] });
      setShowAddRankModal(false);
      toast({
        title: "Berhasil",
        description: "Pangkat berhasil ditambahkan",
      });
    }
  });

  const updateRank = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest('PUT', `/api/admin/ranks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ranks'] });
      toast({
        title: "Berhasil",
        description: "Pangkat berhasil diperbarui",
      });
    }
  });

  const deleteRank = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/ranks/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ranks'] });
      toast({
        title: "Berhasil",
        description: "Pangkat berhasil dihapus",
      });
    }
  });

  // Branches Management Mutations
  const createBranch = useMutation({
    mutationFn: async (branchData: any) => {
      const response = await apiRequest('POST', '/api/admin/branches', branchData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      setShowAddBranchModal(false);
      toast({
        title: "Berhasil",
        description: "Kesatuan berhasil ditambahkan",
      });
    }
  });

  const updateBranch = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest('PUT', `/api/admin/branches/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      toast({
        title: "Berhasil",
        description: "Kesatuan berhasil diperbarui",
      });
    }
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/branches/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      toast({
        title: "Berhasil",
        description: "Kesatuan berhasil dihapus",
      });
    }
  });

  const stats = statsQuery.data;
  const health = healthQuery.data;

  // Logout function
  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#8d9c6b] mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">NXZZ-VComm System Management</p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-[#1a1a1a] border-[#333]">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#8d9c6b] data-[state=active]:text-black">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#8d9c6b] data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-[#8d9c6b] data-[state=active]:text-black">
              <Settings className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
            <TabsTrigger value="ranks" className="data-[state=active]:bg-[#8d9c6b] data-[state=active]:text-black">
              <Shield className="w-4 h-4 mr-2" />
              Ranks
            </TabsTrigger>
            <TabsTrigger value="branches" className="data-[state=active]:bg-[#8d9c6b] data-[state=active]:text-black">
              <Activity className="w-4 h-4 mr-2" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#8d9c6b] data-[state=active]:text-black">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 text-[#8d9c6b]" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Users Online</p>
                      <p className="text-2xl font-bold text-white">{stats?.users?.online || 0}</p>
                      <p className="text-xs text-gray-500">Total: {stats?.users?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-blue-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Messages Today</p>
                      <p className="text-2xl font-bold text-white">{stats?.messages?.today || 0}</p>
                      <p className="text-xs text-gray-500">Total: {stats?.messages?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Phone className="h-8 w-8 text-green-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Calls Today</p>
                      <p className="text-2xl font-bold text-white">{stats?.calls?.today || 0}</p>
                      <p className="text-xs text-gray-500">Total: {stats?.calls?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-400" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Conversations</p>
                      <p className="text-2xl font-bold text-white">{stats?.conversations?.total || 0}</p>
                      <p className="text-xs text-gray-500">Active channels</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-[#8d9c6b] flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Database Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Status</span>
                      <Badge variant={health?.database?.status === 'healthy' ? 'default' : 'destructive'}>
                        {health?.database?.status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Size</span>
                      <span className="text-white">{health?.database?.size || 'Unknown'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-[#8d9c6b] flex items-center">
                    <Server className="w-5 h-5 mr-2" />
                    Server Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Status</span>
                      <Badge variant="default">Running</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Uptime</span>
                      <span className="text-white">
                        {Math.floor((health?.server?.uptime || 0) / 3600)}h {Math.floor(((health?.server?.uptime || 0) % 3600) / 60)}m
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Memory</span>
                      <span className="text-white">
                        {Math.round((health?.server?.memory?.rss || 0) / 1024 / 1024)}MB
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader>
                <CardTitle className="text-[#8d9c6b] flex items-center justify-between">
                  <span>User Management</span>
                  <Badge variant="outline" className="text-gray-400">
                    {filteredUsers.length} / {usersQuery.data?.length || 0} users
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Section */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search callsign, NRP, name, rank, or branch..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10 bg-[#2a2a2a] border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Status Filter */}
                    <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                      <SelectTrigger className="w-[180px] bg-[#2a2a2a] border-gray-600 text-white">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-600">
                        <SelectItem value="all" className="text-white focus:bg-[#8d9c6b] focus:text-black">All Status</SelectItem>
                        <SelectItem value="online" className="text-white focus:bg-[#8d9c6b] focus:text-black">Online</SelectItem>
                        <SelectItem value="offline" className="text-white focus:bg-[#8d9c6b] focus:text-black">Offline</SelectItem>
                        <SelectItem value="disabled" className="text-white focus:bg-[#8d9c6b] focus:text-black">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Role Filter */}
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                      <SelectTrigger className="w-[180px] bg-[#2a2a2a] border-gray-600 text-white">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-600">
                        <SelectItem value="all" className="text-white focus:bg-[#8d9c6b] focus:text-black">All Roles</SelectItem>
                        <SelectItem value="user" className="text-white focus:bg-[#8d9c6b] focus:text-black">User</SelectItem>
                        <SelectItem value="admin" className="text-white focus:bg-[#8d9c6b] focus:text-black">Admin</SelectItem>
                        <SelectItem value="super_admin" className="text-white focus:bg-[#8d9c6b] focus:text-black">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Branch Filter */}
                    <Select value={userBranchFilter} onValueChange={setUserBranchFilter}>
                      <SelectTrigger className="w-[180px] bg-[#2a2a2a] border-gray-600 text-white">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter Branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-600">
                        <SelectItem value="all" className="text-white focus:bg-[#8d9c6b] focus:text-black">All Branches</SelectItem>
                        {branchesQuery.data?.map((branch: any) => (
                          <SelectItem 
                            key={branch.id} 
                            value={branch.branchName} 
                            className="text-white focus:bg-[#8d9c6b] focus:text-black"
                          >
                            {branch.branchName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Clear Filters Button */}
                    {(userSearchTerm || userStatusFilter !== 'all' || userRoleFilter !== 'all' || userBranchFilter !== 'all') && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="border-gray-600 text-gray-400 hover:bg-gray-700"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {usersQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d9c6b] mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading users...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400">Callsign</th>
                          <th className="text-left p-3 text-gray-400">NRP</th>
                          <th className="text-left p-3 text-gray-400">Full Name</th>
                          <th className="text-left p-3 text-gray-400">Rank</th>
                          <th className="text-left p-3 text-gray-400">Branch</th>
                          <th className="text-left p-3 text-gray-400">Role</th>
                          <th className="text-left p-3 text-gray-400">Status</th>
                          <th className="text-left p-3 text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user: any) => (
                          <tr key={user.id} className="border-b border-gray-800 hover:bg-[#2a2a2a]">
                            <td className="p-3 text-white font-medium">{user.callsign}</td>
                            <td className="p-3 text-gray-300">{user.nrp}</td>
                            <td className="p-3 text-gray-300">{user.fullName || '-'}</td>
                            <td className="p-3 text-gray-300">{user.rank || '-'}</td>
                            <td className="p-3 text-gray-300">{user.branch || '-'}</td>
                            <td className="p-3">
                              <Select 
                                value={user.role} 
                                onValueChange={(value) => updateUserRole.mutate({id: user.id, role: value})}
                              >
                                <SelectTrigger className="w-32 bg-[#2a2a2a] border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2a2a2a] border-gray-600">
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select 
                                value={user.status} 
                                onValueChange={(status) => {
                                  console.log('Updating user status:', {userId: user.id, oldStatus: user.status, newStatus: status});
                                  updateUserStatus.mutate({id: user.id, status});
                                }}
                                disabled={updateUserStatus.isPending}
                              >
                                <SelectTrigger className="w-24 bg-[#2a2a2a] border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2a2a2a] border-gray-600">
                                  <SelectItem value="online">Online</SelectItem>
                                  <SelectItem value="offline">Offline</SelectItem>
                                  <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                              </Select>
                              {updateUserStatus.isPending && (
                                <div className="text-xs text-gray-400 mt-1">Updating...</div>
                              )}
                            </td>
                            <td className="p-3">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-400 border-red-400 hover:bg-red-900"
                                onClick={() => {
                                  if(confirm('Yakin ingin menghapus pengguna ini?')) {
                                    console.log('Deleting user:', user.id);
                                    deleteUser.mutate(user.id);
                                  }
                                }}
                                disabled={deleteUser.isPending}
                              >
                                {deleteUser.isPending ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader>
                <CardTitle className="text-[#8d9c6b]">System Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {configQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d9c6b] mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading configurations...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {configQuery.data?.map((config: any) => (
                      <div key={config.id} className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{config.configKey}</h3>
                          <p className="text-gray-400 text-sm">{config.configDescription}</p>
                          <Badge variant="outline" className="mt-1">{config.category}</Badge>
                        </div>
                        <div className="ml-4">
                          {config.configType === 'boolean' ? (
                            <Select 
                              value={config.configValue} 
                              onValueChange={(value) => updateConfig.mutate({id: config.id, configValue: value})}
                            >
                              <SelectTrigger className="w-24 bg-[#1a1a1a] border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2a2a2a] border-gray-600">
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={config.configValue}
                              onChange={(e) => updateConfig.mutate({id: config.id, configValue: e.target.value})}
                              className="w-48 bg-[#1a1a1a] border-gray-600"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranks Tab */}
          <TabsContent value="ranks" className="space-y-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#8d9c6b]">Military Ranks</CardTitle>
                  <Dialog open={showAddRankModal} onOpenChange={setShowAddRankModal}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#8d9c6b] hover:bg-[#9dac7b] text-black">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rank
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a1a] border-[#333]">
                      <DialogHeader>
                        <DialogTitle className="text-[#8d9c6b]">Add New Rank</DialogTitle>
                      </DialogHeader>
                      <AddRankForm onSubmit={createRank.mutate} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {ranksQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d9c6b] mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading ranks...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400">Rank Name</th>
                          <th className="text-left p-3 text-gray-400">Level</th>
                          <th className="text-left p-3 text-gray-400">Branch</th>
                          <th className="text-left p-3 text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranksQuery.data?.map((rank: any) => (
                          <tr key={rank.id} className="border-b border-gray-800 hover:bg-[#2a2a2a]">
                            <td className="p-3 text-white font-medium">{rank.rankName}</td>
                            <td className="p-3 text-gray-300">{rank.level}</td>
                            <td className="p-3 text-gray-300">{rank.branch || 'All'}</td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-400 border-red-400 hover:bg-red-900"
                                  onClick={() => {
                                    if(confirm('Yakin ingin menghapus pangkat ini?')) {
                                      deleteRank.mutate(rank.id);
                                    }
                                  }}
                                >
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
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches" className="space-y-6">
            <Card className="bg-[#1a1a1a] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#8d9c6b]">Military Branches</CardTitle>
                  <Dialog open={showAddBranchModal} onOpenChange={setShowAddBranchModal}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#8d9c6b] hover:bg-[#9dac7b] text-black">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Branch
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a1a] border-[#333]">
                      <DialogHeader>
                        <DialogTitle className="text-[#8d9c6b]">Add New Branch</DialogTitle>
                      </DialogHeader>
                      <AddBranchForm onSubmit={createBranch.mutate} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {branchesQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d9c6b] mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading branches...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400">Branch Name</th>
                          <th className="text-left p-3 text-gray-400">Code</th>
                          <th className="text-left p-3 text-gray-400">Description</th>
                          <th className="text-left p-3 text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchesQuery.data?.map((branch: any) => (
                          <tr key={branch.id} className="border-b border-gray-800 hover:bg-[#2a2a2a]">
                            <td className="p-3 text-white font-medium">{branch.branchName}</td>
                            <td className="p-3 text-gray-300">{branch.branchCode}</td>
                            <td className="p-3 text-gray-300">{branch.description || '-'}</td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-400 border-red-400 hover:bg-red-900"
                                  onClick={() => {
                                    if(confirm('Yakin ingin menghapus kesatuan ini?')) {
                                      deleteBranch.mutate(branch.id);
                                    }
                                  }}
                                >
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
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-[#8d9c6b] flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Security Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {securityQuery.isLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8d9c6b] mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {securityQuery.data?.map((event: any, index: number) => (
                        <div key={index} className="p-3 bg-[#2a2a2a] rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white text-sm">{event.action}</p>
                              <p className="text-gray-400 text-xs">{event.details}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {new Date(event.createdAt).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-[#8d9c6b] flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Admin Activity Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {logsQuery.isLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8d9c6b] mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {logsQuery.data?.map((log: any, index: number) => (
                        <div key={index} className="p-3 bg-[#2a2a2a] rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white text-sm">{log.action}</p>
                              <p className="text-gray-400 text-xs">{log.details}</p>
                              {log.ipAddress && (
                                <p className="text-gray-500 text-xs">IP: {log.ipAddress}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {new Date(log.createdAt).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Add Rank Form Component
function AddRankForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { data: branches } = useQuery({
    queryKey: ['/api/admin/branches'],
    retry: false,
  });

  const [formData, setFormData] = useState({
    rankName: '',
    rankCode: '',
    level: 1,
    branch: '',
    isOfficer: false,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rankName" className="text-white">Rank Name</Label>
        <Input
          id="rankName"
          value={formData.rankName}
          onChange={(e) => setFormData({...formData, rankName: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
          required
        />
      </div>
      <div>
        <Label htmlFor="rankCode" className="text-white">Rank Code</Label>
        <Input
          id="rankCode"
          value={formData.rankCode}
          onChange={(e) => setFormData({...formData, rankCode: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
          placeholder="e.g., LETDA, SERDA, KOPDA"
          required
        />
      </div>
      <div>
        <Label htmlFor="level" className="text-white">Level (1-20)</Label>
        <Input
          id="level"
          type="number"
          min="1"
          max="20"
          value={formData.level}
          onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
          required
        />
      </div>
      <div>
        <Label htmlFor="branch" className="text-white">Branch</Label>
        <Select onValueChange={(value) => setFormData({...formData, branch: value})} value={formData.branch}>
          <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent className="bg-[#2a2a2a] border-gray-600">
            {branches?.map((branch: any) => (
              <SelectItem key={branch.id} value={branch.branchName} className="text-white focus:bg-[#8d9c6b] focus:text-black">
                {branch.branchName} - {branch.branchFullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isOfficer"
          checked={formData.isOfficer}
          onChange={(e) => setFormData({...formData, isOfficer: e.target.checked})}
          className="rounded"
        />
        <Label htmlFor="isOfficer" className="text-white">Is Officer</Label>
      </div>
      <div>
        <Label htmlFor="description" className="text-white">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
        />
      </div>
      <Button type="submit" className="w-full bg-[#8d9c6b] hover:bg-[#9dac7b] text-black">
        Add Rank
      </Button>
    </form>
  );
}

// Add Branch Form Component
function AddBranchForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    branchName: '',
    branchCode: '',
    branchFullName: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="branchName" className="text-white">Branch Name</Label>
        <Input
          id="branchName"
          value={formData.branchName}
          onChange={(e) => setFormData({...formData, branchName: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
          required
        />
      </div>
      <div>
        <Label htmlFor="branchCode" className="text-white">Branch Code</Label>
        <Input
          id="branchCode"
          value={formData.branchCode}
          onChange={(e) => setFormData({...formData, branchCode: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
          placeholder="e.g., AD, AL, AU"
          required
        />
      </div>
      <div>
        <Label htmlFor="branchFullName" className="text-white">Branch Full Name</Label>
        <Input
          id="branchFullName"
          value={formData.branchFullName}
          onChange={(e) => setFormData({...formData, branchFullName: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
          placeholder="e.g., Tentara Nasional Indonesia Angkatan Darat"
          required
        />
      </div>
      <div>
        <Label htmlFor="description" className="text-white">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="bg-[#2a2a2a] border-gray-600 text-white"
        />
      </div>
      <Button type="submit" className="w-full bg-[#8d9c6b] hover:bg-[#9dac7b] text-black">
        Add Branch
      </Button>
    </form>
  );
}