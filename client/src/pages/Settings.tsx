import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  User,
  Shield,
  Palette,
  Bell,
  Lock,
  Globe,
  Smartphone,
  Wifi,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
  Save,
  LogOut,
  Info,
  HelpCircle,
  Download,
  Trash2,
  RefreshCw,
  Database,
  Network
} from 'lucide-react';

interface UserSettings {
  id: number;
  theme: 'light' | 'dark' | 'system';
  status: string;
  statusMessage: string;
  language: string;
  notifications: {
    push: boolean;
    sound: boolean;
    vibration: boolean;
    calls: boolean;
    messages: boolean;
    groups: boolean;
  };
  privacy: {
    showOnline: boolean;
    showLastSeen: boolean;
    readReceipts: boolean;
    profilePhoto: boolean;
    allowGroups: boolean;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
    autoLock: boolean;
    biometric: boolean;
  };
  network: {
    autoDownload: boolean;
    dataUsage: 'low' | 'medium' | 'high';
    wifiOnly: boolean;
  };
}

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default settings
  const [settings, setSettings] = useState<UserSettings>({
    id: user?.id || 0,
    theme: 'dark',
    status: 'online',
    statusMessage: 'Available',
    language: 'id',
    notifications: {
      push: true,
      sound: true,
      vibration: true,
      calls: true,
      messages: true,
      groups: true,
    },
    privacy: {
      showOnline: true,
      showLastSeen: true,
      readReceipts: true,
      profilePhoto: true,
      allowGroups: true,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      autoLock: false,
      biometric: false,
    },
    network: {
      autoDownload: true,
      dataUsage: 'medium',
      wifiOnly: false,
    },
  });

  const [activeTab, setActiveTab] = useState('profile');

  // Fetch user settings
  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['/api/user-settings'],
    retry: false,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<UserSettings>) =>
      apiRequest('/api/user-settings', 'PUT', updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
      toast({
        title: "Pengaturan Disimpan",
        description: "Pengaturan berhasil diperbarui",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    },
  });

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Load settings if available
  useEffect(() => {
    if (userSettings) {
      setSettings(prev => ({ ...prev, ...userSettings }));
    }
  }, [userSettings]);

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'invisible': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'system': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-700 bg-gray-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-3 text-white hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center">
          <SettingsIcon className="w-6 h-6 mr-2 text-green-500" />
          <h1 className="text-xl font-semibold">Pengaturan</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-6 bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-green-600">
              <User className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-green-600">
              <Shield className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-green-600">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-green-600">
              <Bell className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-green-600">
              <Lock className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-green-600">
              <Database className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <User className="w-5 h-5 mr-2 text-green-500" />
                    Profil & Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback className="bg-green-600 text-white text-lg">
                        {user?.callsign?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-white">{user?.fullName || user?.callsign}</h3>
                      <p className="text-gray-400">{user?.callsign}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Ubah Foto
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="text-white">Status Online</Label>
                    <Select value={settings.status} onValueChange={(value) => updateSettings('status', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(settings.status)}`} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="online">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                            Online
                          </div>
                        </SelectItem>
                        <SelectItem value="away">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                            Away
                          </div>
                        </SelectItem>
                        <SelectItem value="busy">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                            Busy
                          </div>
                        </SelectItem>
                        <SelectItem value="invisible">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
                            Invisible
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Message */}
                  <div className="space-y-2">
                    <Label className="text-white">Pesan Status</Label>
                    <Input
                      value={settings.statusMessage}
                      onChange={(e) => updateSettings('statusMessage', e.target.value)}
                      placeholder="Tulis pesan status..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-white">Bahasa</Label>
                    <Select value={settings.language} onValueChange={(value) => updateSettings('language', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ms">Bahasa Melayu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Shield className="w-5 h-5 mr-2 text-green-500" />
                    Privasi & Keamanan
                  </CardTitle>
                  <CardDescription>
                    Kontrol siapa yang dapat melihat informasi Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Privacy Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Tampilkan Status Online</Label>
                        <p className="text-sm text-gray-400">Orang lain dapat melihat kapan Anda online</p>
                      </div>
                      <Switch
                        checked={settings.privacy.showOnline}
                        onCheckedChange={(checked) => updateSettings('privacy.showOnline', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Terakhir Dilihat</Label>
                        <p className="text-sm text-gray-400">Tampilkan kapan terakhir kali online</p>
                      </div>
                      <Switch
                        checked={settings.privacy.showLastSeen}
                        onCheckedChange={(checked) => updateSettings('privacy.showLastSeen', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Konfirmasi Baca</Label>
                        <p className="text-sm text-gray-400">Kirim tanda pesan telah dibaca</p>
                      </div>
                      <Switch
                        checked={settings.privacy.readReceipts}
                        onCheckedChange={(checked) => updateSettings('privacy.readReceipts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Foto Profil</Label>
                        <p className="text-sm text-gray-400">Orang lain dapat melihat foto profil Anda</p>
                      </div>
                      <Switch
                        checked={settings.privacy.profilePhoto}
                        onCheckedChange={(checked) => updateSettings('privacy.profilePhoto', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Undangan Grup</Label>
                        <p className="text-sm text-gray-400">Izinkan ditambahkan ke grup</p>
                      </div>
                      <Switch
                        checked={settings.privacy.allowGroups}
                        onCheckedChange={(checked) => updateSettings('privacy.allowGroups', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Palette className="w-5 h-5 mr-2 text-green-500" />
                    Tampilan & Tema
                  </CardTitle>
                  <CardDescription>
                    Sesuaikan tampilan aplikasi sesuai preferensi Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Theme Selection */}
                  <div className="space-y-3">
                    <Label className="text-white">Tema</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Terang', icon: <Sun className="w-4 h-4" /> },
                        { value: 'dark', label: 'Gelap', icon: <Moon className="w-4 h-4" /> },
                        { value: 'system', label: 'Sistem', icon: <Monitor className="w-4 h-4" /> },
                      ].map((theme) => (
                        <Button
                          key={theme.value}
                          variant={settings.theme === theme.value ? 'default' : 'outline'}
                          className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                            settings.theme === theme.value ? 'bg-green-600 hover:bg-green-700' : ''
                          }`}
                          onClick={() => updateSettings('theme', theme.value)}
                        >
                          {theme.icon}
                          <span className="text-sm">{theme.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Color Scheme */}
                  <div className="space-y-3">
                    <Label className="text-white">Skema Warna</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { name: 'Green', color: 'bg-green-500' },
                        { name: 'Blue', color: 'bg-blue-500' },
                        { name: 'Purple', color: 'bg-purple-500' },
                        { name: 'Orange', color: 'bg-orange-500' },
                      ].map((color) => (
                        <Button
                          key={color.name}
                          variant="outline"
                          className="p-4 h-auto flex flex-col items-center space-y-2"
                        >
                          <div className={`w-6 h-6 rounded-full ${color.color}`} />
                          <span className="text-xs">{color.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Bell className="w-5 h-5 mr-2 text-green-500" />
                    Notifikasi
                  </CardTitle>
                  <CardDescription>
                    Kelola notifikasi dan suara
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Notifikasi Push</Label>
                        <p className="text-sm text-gray-400">Terima notifikasi dari aplikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.push}
                        onCheckedChange={(checked) => updateSettings('notifications.push', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Suara Notifikasi</Label>
                        <p className="text-sm text-gray-400">Putar suara untuk notifikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.sound}
                        onCheckedChange={(checked) => updateSettings('notifications.sound', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Getaran</Label>
                        <p className="text-sm text-gray-400">Bergetar untuk notifikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.vibration}
                        onCheckedChange={(checked) => updateSettings('notifications.vibration', checked)}
                      />
                    </div>

                    <Separator className="bg-gray-700" />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Panggilan</Label>
                        <p className="text-sm text-gray-400">Notifikasi panggilan masuk</p>
                      </div>
                      <Switch
                        checked={settings.notifications.calls}
                        onCheckedChange={(checked) => updateSettings('notifications.calls', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Pesan</Label>
                        <p className="text-sm text-gray-400">Notifikasi pesan baru</p>
                      </div>
                      <Switch
                        checked={settings.notifications.messages}
                        onCheckedChange={(checked) => updateSettings('notifications.messages', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Grup</Label>
                        <p className="text-sm text-gray-400">Notifikasi pesan grup</p>
                      </div>
                      <Switch
                        checked={settings.notifications.groups}
                        onCheckedChange={(checked) => updateSettings('notifications.groups', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Lock className="w-5 h-5 mr-2 text-green-500" />
                    Keamanan
                  </CardTitle>
                  <CardDescription>
                    Pengaturan keamanan dan autentikasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Security Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Autentikasi Dua Faktor</Label>
                        <p className="text-sm text-gray-400">Tambahkan lapisan keamanan ekstra</p>
                      </div>
                      <Switch
                        checked={settings.security.twoFactor}
                        onCheckedChange={(checked) => updateSettings('security.twoFactor', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Kunci Otomatis</Label>
                        <p className="text-sm text-gray-400">Kunci aplikasi saat tidak digunakan</p>
                      </div>
                      <Switch
                        checked={settings.security.autoLock}
                        onCheckedChange={(checked) => updateSettings('security.autoLock', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Biometrik</Label>
                        <p className="text-sm text-gray-400">Gunakan sidik jari atau face ID</p>
                      </div>
                      <Switch
                        checked={settings.security.biometric}
                        onCheckedChange={(checked) => updateSettings('security.biometric', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Timeout Sesi (menit)</Label>
                      <Select
                        value={settings.security.sessionTimeout.toString()}
                        onValueChange={(value) => updateSettings('security.sessionTimeout', parseInt(value))}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="15">15 menit</SelectItem>
                          <SelectItem value="30">30 menit</SelectItem>
                          <SelectItem value="60">1 jam</SelectItem>
                          <SelectItem value="120">2 jam</SelectItem>
                          <SelectItem value="0">Tidak pernah</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Logout */}
                  <Button variant="destructive" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar dari Akun
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Database className="w-5 h-5 mr-2 text-green-500" />
                    Pengaturan Lanjutan
                  </CardTitle>
                  <CardDescription>
                    Pengaturan jaringan dan sistem
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Network Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Network className="w-4 h-4 mr-2" />
                      Jaringan
                    </h4>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Download Otomatis</Label>
                        <p className="text-sm text-gray-400">Download file secara otomatis</p>
                      </div>
                      <Switch
                        checked={settings.network.autoDownload}
                        onCheckedChange={(checked) => updateSettings('network.autoDownload', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Hanya WiFi</Label>
                        <p className="text-sm text-gray-400">Gunakan hanya koneksi WiFi</p>
                      </div>
                      <Switch
                        checked={settings.network.wifiOnly}
                        onCheckedChange={(checked) => updateSettings('network.wifiOnly', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Penggunaan Data</Label>
                      <Select
                        value={settings.network.dataUsage}
                        onValueChange={(value) => updateSettings('network.dataUsage', value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="low">Rendah</SelectItem>
                          <SelectItem value="medium">Sedang</SelectItem>
                          <SelectItem value="high">Tinggi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Storage & Data */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Database className="w-4 h-4 mr-2" />
                      Penyimpanan
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="flex flex-col p-4 h-auto">
                        <Download className="w-6 h-6 mb-2" />
                        <span className="text-sm">Export Data</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col p-4 h-auto">
                        <Trash2 className="w-6 h-6 mb-2" />
                        <span className="text-sm">Hapus Cache</span>
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* About */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Info className="w-4 h-4 mr-2" />
                      Tentang
                    </h4>

                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Versi Aplikasi</span>
                        <span>v1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Build</span>
                        <span>2025.1.1</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database</span>
                        <span>PostgreSQL</span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Bantuan & Dukungan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Save Button */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <Button
          onClick={handleSaveSettings}
          disabled={saveSettingsMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {saveSettingsMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}