import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, Edit, Trash2, Settings, Users, Building, Award, 
  BarChart3, Shield, Activity, Database, Server, MessageSquare,
  Phone, UserCheck, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check if user is admin
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      {/* Header */}
      <div className="bg-[#2d3328] p-4 border-b border-[#8d9c6b]/20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Admin Dashboard
          </h1>
          <div className="text-sm text-gray-300">
            Welcome, {user.callsign}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-[#2d3328]">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#8d9c6b]">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#8d9c6b]">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-[#8d9c6b]">
              <Settings className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
            <TabsTrigger value="ranks" className="data-[state=active]:bg-[#8d9c6b]">
              <Award className="w-4 h-4 mr-2" />
              Ranks
            </TabsTrigger>
            <TabsTrigger value="branches" className="data-[state=active]:bg-[#8d9c6b]">
              <Building className="w-4 h-4 mr-2" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#8d9c6b]">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardOverviewTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <SystemConfigTab />
          </TabsContent>

          <TabsContent value="ranks" className="mt-6">
            <MilitaryRanksTab />
          </TabsContent>

          <TabsContent value="branches" className="mt-6">
            <MilitaryBranchesTab />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecurityMonitoringTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// System Configuration Tab Component
function SystemConfigTab() {
  const { toast } = useToast();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['/api/admin/config'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: string }) => {
      return apiRequest(`/api/admin/config/${id}`, {
        method: 'PUT',
        body: { configValue: value }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
    },
  });

  const handleConfigChange = (config: any, newValue: string | boolean) => {
    const value = typeof newValue === 'boolean' ? newValue.toString() : newValue;
    updateConfigMutation.mutate({ id: config.id, value });
  };

  if (isLoading) return <div>Loading...</div>;

  // Group configs by category
  const configsByCategory = configs?.reduce((acc: any, config: any) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push(config);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {Object.entries(configsByCategory).map(([category, categoryConfigs]: [string, any]) => (
        <Card key={category} className="bg-[#1a1a1a] border-[#333]">
          <CardHeader>
            <CardTitle className="text-[#8d9c6b] capitalize">{category} Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryConfigs.map((config: any) => (
              <div key={config.id} className="flex items-center justify-between p-3 bg-[#222] rounded-lg">
                <div className="flex-1">
                  <Label className="text-white font-medium">{config.configKey}</Label>
                  <p className="text-sm text-gray-400 mt-1">{config.configDescription}</p>
                </div>
                <div className="ml-4">
                  {config.configType === 'boolean' ? (
                    <Switch
                      checked={config.configValue === 'true'}
                      onCheckedChange={(checked) => handleConfigChange(config, checked)}
                    />
                  ) : (
                    <Input
                      value={config.configValue}
                      onChange={(e) => handleConfigChange(config, e.target.value)}
                      className="w-32 bg-[#333] border-[#555]"
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Military Ranks Tab Component
function MilitaryRanksTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: ranks, isLoading } = useQuery({
    queryKey: ['/api/admin/ranks'],
  });

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#8d9c6b]">Military Ranks</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2d3328] hover:bg-[#8d9c6b]">
              <Plus className="w-4 h-4 mr-2" />
              Add Rank
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1a1a] border-[#333]">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Military Rank</DialogTitle>
            </DialogHeader>
            <AddRankForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <RanksTable ranks={ranks || []} />
        )}
      </CardContent>
    </Card>
  );
}

// Military Branches Tab Component
function MilitaryBranchesTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: branches, isLoading } = useQuery({
    queryKey: ['/api/admin/branches'],
  });

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#8d9c6b]">Military Branches</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2d3328] hover:bg-[#8d9c6b]">
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1a1a] border-[#333]">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Military Branch</DialogTitle>
            </DialogHeader>
            <AddBranchForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <BranchesTable branches={branches || []} />
        )}
      </CardContent>
    </Card>
  );
}

// Military Units Tab Component
function MilitaryUnitsTab() {
  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader>
        <CardTitle className="text-[#8d9c6b]">Military Units</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400">Units management coming soon...</p>
      </CardContent>
    </Card>
  );
}

// Helper Components
function RanksTable({ ranks }: { ranks: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#333]">
          <TableHead className="text-gray-300">Code</TableHead>
          <TableHead className="text-gray-300">Name</TableHead>
          <TableHead className="text-gray-300">Branch</TableHead>
          <TableHead className="text-gray-300">Level</TableHead>
          <TableHead className="text-gray-300">Officer</TableHead>
          <TableHead className="text-gray-300">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ranks.map((rank) => (
          <TableRow key={rank.id} className="border-[#333]">
            <TableCell className="text-white">{rank.rankCode}</TableCell>
            <TableCell className="text-white">{rank.rankName}</TableCell>
            <TableCell className="text-white">{rank.branch}</TableCell>
            <TableCell className="text-white">{rank.level}</TableCell>
            <TableCell className="text-white">{rank.isOfficer ? 'Yes' : 'No'}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-white border-[#555]">
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="text-red-400 border-red-400">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BranchesTable({ branches }: { branches: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#333]">
          <TableHead className="text-gray-300">Code</TableHead>
          <TableHead className="text-gray-300">Name</TableHead>
          <TableHead className="text-gray-300">Full Name</TableHead>
          <TableHead className="text-gray-300">Status</TableHead>
          <TableHead className="text-gray-300">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {branches.map((branch) => (
          <TableRow key={branch.id} className="border-[#333]">
            <TableCell className="text-white">{branch.branchCode}</TableCell>
            <TableCell className="text-white">{branch.branchName}</TableCell>
            <TableCell className="text-white">{branch.branchFullName}</TableCell>
            <TableCell className="text-white">{branch.isActive ? 'Active' : 'Inactive'}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-white border-[#555]">
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="text-red-400 border-red-400">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AddRankForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    rankCode: '',
    rankName: '',
    branch: '',
    level: 1,
    isOfficer: false
  });

  const createRankMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/ranks', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ranks'] });
      toast({
        title: "Success",
        description: "Rank created successfully",
      });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRankMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rankCode" className="text-white">Rank Code</Label>
        <Input
          id="rankCode"
          value={formData.rankCode}
          onChange={(e) => setFormData(prev => ({ ...prev, rankCode: e.target.value }))}
          className="bg-[#333] border-[#555] text-white"
          placeholder="e.g., LET"
        />
      </div>
      <div>
        <Label htmlFor="rankName" className="text-white">Rank Name</Label>
        <Input
          id="rankName"
          value={formData.rankName}
          onChange={(e) => setFormData(prev => ({ ...prev, rankName: e.target.value }))}
          className="bg-[#333] border-[#555] text-white"
          placeholder="e.g., Letnan"
        />
      </div>
      <div>
        <Label htmlFor="branch" className="text-white">Branch</Label>
        <Input
          id="branch"
          value={formData.branch}
          onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
          className="bg-[#333] border-[#555] text-white"
          placeholder="e.g., TNI AD"
        />
      </div>
      <div>
        <Label htmlFor="level" className="text-white">Level</Label>
        <Input
          id="level"
          type="number"
          value={formData.level}
          onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
          className="bg-[#333] border-[#555] text-white"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="isOfficer"
          checked={formData.isOfficer}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOfficer: checked }))}
        />
        <Label htmlFor="isOfficer" className="text-white">Officer Rank</Label>
      </div>
      <Button type="submit" className="w-full bg-[#2d3328] hover:bg-[#8d9c6b]">
        Create Rank
      </Button>
    </form>
  );
}

// Dashboard Overview Tab Component
function DashboardOverviewTab() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/health'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (statsLoading || healthLoading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}

// User Management Tab Component
function UserManagementTab() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: { role }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  if (isLoading) return <div>Loading users...</div>;

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader>
        <CardTitle className="text-[#8d9c6b]">User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-[#333]">
              <TableHead className="text-gray-300">Callsign</TableHead>
              <TableHead className="text-gray-300">Full Name</TableHead>
              <TableHead className="text-gray-300">Rank</TableHead>
              <TableHead className="text-gray-300">Branch</TableHead>
              <TableHead className="text-gray-300">Role</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: any) => (
              <TableRow key={user.id} className="border-[#333]">
                <TableCell className="text-white">{user.callsign}</TableCell>
                <TableCell className="text-white">{user.fullName || '-'}</TableCell>
                <TableCell className="text-white">{user.rank || '-'}</TableCell>
                <TableCell className="text-white">{user.branch || '-'}</TableCell>
                <TableCell>
                  <select
                    value={user.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                    className="bg-[#333] text-white border border-[#555] rounded px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="text-white border-[#555]">
                    <Edit className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Security Monitoring Tab Component
function SecurityMonitoringTab() {
  const { data: securityEvents, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/security'],
  });

  if (isLoading) return <div>Loading security events...</div>;

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader>
        <CardTitle className="text-[#8d9c6b] flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Security Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-[#333]">
              <TableHead className="text-gray-300">Time</TableHead>
              <TableHead className="text-gray-300">Admin</TableHead>
              <TableHead className="text-gray-300">Action</TableHead>
              <TableHead className="text-gray-300">Target</TableHead>
              <TableHead className="text-gray-300">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {securityEvents?.map((event: any) => (
              <TableRow key={event.id} className="border-[#333]">
                <TableCell className="text-white">
                  {new Date(event.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-white">{event.adminId}</TableCell>
                <TableCell className="text-white">{event.action}</TableCell>
                <TableCell className="text-white">{event.targetTable || '-'}</TableCell>
                <TableCell className="text-white">{event.ipAddress || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AddBranchForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    branchFullName: '',
    description: ''
  });

  const createBranchMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/branches', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      toast({
        title: "Success",
        description: "Branch created successfully",
      });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBranchMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="branchCode" className="text-white">Branch Code</Label>
        <Input
          id="branchCode"
          value={formData.branchCode}
          onChange={(e) => setFormData(prev => ({ ...prev, branchCode: e.target.value }))}
          className="bg-[#333] border-[#555] text-white"
          placeholder="e.g., TNI-AD"
        />
      </div>
      <div>
        <Label htmlFor="branchName" className="text-white">Branch Name</Label>
        <Input
          id="branchName"
          value={formData.branchName}
          onChange={(e) => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
          className="bg-[#333] border-[#555] text-white"
          placeholder="e.g., TNI AD"
        />
      </div>
      <div>
        <Label htmlFor="branchFullName" className="text-white">Full Name</Label>
        <Input
          id="branchFullName"
          value={formData.branchFullName}
          onChange={(e) => setFormData(prev => ({ ...prev, branchFullName: e.target.value }))}
          className="bg-[#333] border-[#555] text-white"
          placeholder="e.g., Tentara Nasional Indonesia Angkatan Darat"
        />
      </div>
      <Button type="submit" className="w-full bg-[#2d3328] hover:bg-[#8d9c6b]">
        Create Branch
      </Button>
    </form>
  );
}