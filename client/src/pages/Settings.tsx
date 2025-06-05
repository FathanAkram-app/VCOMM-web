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
  Network,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Speaker,
  Headphones,
  Play,
  Square
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
  
  // Audio test states
  const [audioTestMode, setAudioTestMode] = useState<'earpiece' | 'speaker' | 'loudspeaker'>('earpiece');
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [testAudioElement, setTestAudioElement] = useState<HTMLAudioElement | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

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



  // Audio test functions
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      setAudioDevices(audioOutputDevices);
      if (audioOutputDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioOutputDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error);
    }
  };

  const startAudioTest = async (mode: 'earpiece' | 'speaker' | 'loudspeaker') => {
    try {
      setIsTestingAudio(true);
      setAudioTestMode(mode);
      
      // Stop any existing audio
      if (testAudioElement) {
        testAudioElement.pause();
        testAudioElement.currentTime = 0;
      }
      
      // Create test audio element
      const audio = new Audio();
      audio.loop = true;
      audio.volume = mode === 'loudspeaker' ? 1.0 : 0.8;
      
      // Generate test tone URL (simple beep)
      const testToneUrl = generateTestTone(440, 2); // 440Hz for 2 seconds
      audio.src = testToneUrl;
      
      // Configure audio output based on mode
      if (mode === 'earpiece') {
        // Earpiece mode - use phone speaker (receiver)
        audio.setAttribute('preload', 'auto');
        if ('setSinkId' in audio && selectedAudioDevice) {
          await (audio as any).setSinkId('communications');
        }
      } else if (mode === 'speaker') {
        // Speaker mode - use device speaker
        audio.setAttribute('preload', 'auto');
        if ('setSinkId' in audio && selectedAudioDevice) {
          await (audio as any).setSinkId(selectedAudioDevice);
        }
      } else if (mode === 'loudspeaker') {
        // Loudspeaker mode - use external speaker
        audio.setAttribute('preload', 'auto');
        audio.setAttribute('playsinline', 'true');
        if ('setSinkId' in audio) {
          await (audio as any).setSinkId('default');
        }
      }
      
      setTestAudioElement(audio);
      await audio.play();
      
      toast({
        title: `Audio Test - ${mode.toUpperCase()}`,
        description: `Testing audio output melalui ${mode}. Tekan Stop untuk menghentikan.`,
      });
      
    } catch (error) {
      console.error('Failed to start audio test:', error);
      toast({
        title: "Audio Test Error",
        description: "Gagal memulai test audio. Pastikan browser mendukung audio output.",
        variant: "destructive",
      });
      setIsTestingAudio(false);
    }
  };

  const stopAudioTest = () => {
    if (testAudioElement) {
      testAudioElement.pause();
      testAudioElement.currentTime = 0;
      testAudioElement.src = '';
    }
    setIsTestingAudio(false);
    setTestAudioElement(null);
  };

  const startMicTest = async () => {
    try {
      setIsMicTesting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      setMicStream(stream);
      
      // Create audio context for microphone level monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateMicLevel = () => {
        if (isMicTesting) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setMicLevel(Math.round((average / 255) * 100));
          requestAnimationFrame(updateMicLevel);
        }
      };
      
      updateMicLevel();
      
      toast({
        title: "Microphone Test",
        description: "Berbicara untuk melihat level microphone. Tekan Stop untuk menghentikan.",
      });
      
    } catch (error) {
      console.error('Failed to start microphone test:', error);
      toast({
        title: "Microphone Test Error",
        description: "Gagal mengakses microphone. Pastikan izin microphone diberikan.",
        variant: "destructive",
      });
      setIsMicTesting(false);
    }
  };

  const stopMicTest = () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    setIsMicTesting(false);
    setMicLevel(0);
  };

  const generateTestTone = (frequency: number, duration: number): string => {
    const sampleRate = 44100;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  // Load audio devices on component mount
  useEffect(() => {
    loadAudioDevices();
  }, []);

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
            <TabsTrigger value="audio" className="data-[state=active]:bg-green-600">
              <Volume2 className="w-4 h-4" />
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

            {/* Audio Test Tab */}
            <TabsContent value="audio" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Volume2 className="w-5 h-5 mr-2 text-green-500" />
                    Audio Test Mobile
                  </CardTitle>
                  <CardDescription>
                    Test audio output dan microphone untuk HP
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Audio Output Test */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Speaker className="w-4 h-4 mr-2" />
                      Test Audio Output
                    </h4>

                    {/* Audio Device Selection */}
                    {audioDevices.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-white">Audio Device</Label>
                        <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                          <SelectTrigger className="bg-gray-700 border-gray-600">
                            <SelectValue placeholder="Pilih audio device" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {audioDevices.map((device) => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label || `Audio Device ${device.deviceId.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Audio Test Buttons */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Earpiece Test */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Smartphone className="w-5 h-5 mr-2 text-blue-400" />
                            <span className="text-white font-medium">Earpiece (Speaker Telinga)</span>
                          </div>
                          <Badge variant={audioTestMode === 'earpiece' && isTestingAudio ? 'default' : 'secondary'}>
                            {audioTestMode === 'earpiece' && isTestingAudio ? 'Testing' : 'Ready'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">Test audio melalui speaker telinga HP</p>
                        <Button
                          onClick={() => isTestingAudio ? stopAudioTest() : startAudioTest('earpiece')}
                          className={`w-full ${
                            audioTestMode === 'earpiece' && isTestingAudio 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {audioTestMode === 'earpiece' && isTestingAudio ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Test
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Test Earpiece
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Speaker Test */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Volume2 className="w-5 h-5 mr-2 text-green-400" />
                            <span className="text-white font-medium">Speaker Normal</span>
                          </div>
                          <Badge variant={audioTestMode === 'speaker' && isTestingAudio ? 'default' : 'secondary'}>
                            {audioTestMode === 'speaker' && isTestingAudio ? 'Testing' : 'Ready'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">Test audio melalui speaker normal HP</p>
                        <Button
                          onClick={() => isTestingAudio ? stopAudioTest() : startAudioTest('speaker')}
                          className={`w-full ${
                            audioTestMode === 'speaker' && isTestingAudio 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {audioTestMode === 'speaker' && isTestingAudio ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Test
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Test Speaker
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Loudspeaker Test */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Speaker className="w-5 h-5 mr-2 text-yellow-400" />
                            <span className="text-white font-medium">Loudspeaker</span>
                          </div>
                          <Badge variant={audioTestMode === 'loudspeaker' && isTestingAudio ? 'default' : 'secondary'}>
                            {audioTestMode === 'loudspeaker' && isTestingAudio ? 'Testing' : 'Ready'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">Test audio melalui loudspeaker HP</p>
                        <Button
                          onClick={() => isTestingAudio ? stopAudioTest() : startAudioTest('loudspeaker')}
                          className={`w-full ${
                            audioTestMode === 'loudspeaker' && isTestingAudio 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-yellow-600 hover:bg-yellow-700'
                          }`}
                        >
                          {audioTestMode === 'loudspeaker' && isTestingAudio ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Test
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Test Loudspeaker
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Microphone Test */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Mic className="w-4 h-4 mr-2" />
                      Test Microphone
                    </h4>

                    <div className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Mic className="w-5 h-5 mr-2 text-purple-400" />
                          <span className="text-white font-medium">Microphone Level</span>
                        </div>
                        <Badge variant={isMicTesting ? 'default' : 'secondary'}>
                          {isMicTesting ? 'Recording' : 'Ready'}
                        </Badge>
                      </div>
                      
                      {/* Microphone Level Indicator */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                          <span>Level: {micLevel}%</span>
                          <span>{isMicTesting ? 'Berbicara untuk test' : 'Tekan Start untuk test'}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-100 ${
                              micLevel > 70 ? 'bg-red-500' : 
                              micLevel > 40 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${micLevel}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => isMicTesting ? stopMicTest() : startMicTest()}
                        className={`w-full ${
                          isMicTesting 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {isMicTesting ? (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Stop Mic Test
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Start Mic Test
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Audio Test Info */}
                  <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 mr-2 text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-200 font-medium mb-1">Petunjuk Test Audio:</p>
                        <ul className="text-blue-300 space-y-1">
                          <li>• Earpiece: Audio keluar dari speaker telinga HP</li>
                          <li>• Speaker Normal: Audio keluar dari speaker bawah HP</li>
                          <li>• Loudspeaker: Audio keluar dengan volume maksimal</li>
                          <li>• Mic Test: Berbicara untuk melihat level microphone</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

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