import { useState } from "react";
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
import { Plus, Edit, Trash2, Settings, Users, Building, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("config");

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
          <TabsList className="grid w-full grid-cols-4 bg-[#2d3328]">
            <TabsTrigger value="config" className="data-[state=active]:bg-[#8d9c6b]">
              <Settings className="w-4 h-4 mr-2" />
              System Config
            </TabsTrigger>
            <TabsTrigger value="ranks" className="data-[state=active]:bg-[#8d9c6b]">
              <Award className="w-4 h-4 mr-2" />
              Military Ranks
            </TabsTrigger>
            <TabsTrigger value="branches" className="data-[state=active]:bg-[#8d9c6b]">
              <Building className="w-4 h-4 mr-2" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="units" className="data-[state=active]:bg-[#8d9c6b]">
              <Users className="w-4 h-4 mr-2" />
              Units
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6">
            <SystemConfigTab />
          </TabsContent>

          <TabsContent value="ranks" className="mt-6">
            <MilitaryRanksTab />
          </TabsContent>

          <TabsContent value="branches" className="mt-6">
            <MilitaryBranchesTab />
          </TabsContent>

          <TabsContent value="units" className="mt-6">
            <MilitaryUnitsTab />
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