import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Lock,
  Palette,
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
  Volume2,
  Mic,
  MicOff,
  Speaker,
  Smartphone,
  Play,
  Square,
  Info
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
  const { toast } = useToast();

  // Audio test states
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [audioTestMode, setAudioTestMode] = useState<'earpiece' | 'speaker' | 'loudspeaker' | null>(null);
  const [testAudioElement, setTestAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  // Get user from auth
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  }) as { data: any };

  // Form state
  const [settings, setSettings] = useState<UserSettings>({
    id: 0,
    theme: 'dark',
    status: 'Available',
    statusMessage: '',
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
      
      // Create audio context for better control
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required on mobile)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const compressor = audioContext.createDynamicsCompressor();
      
      // Connect audio nodes
      oscillator.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(audioContext.destination);
      
      // Configure different audio characteristics for each mode
      if (mode === 'earpiece') {
        // Earpiece - focused frequency for voice calls, lower volume
        oscillator.frequency.setValueAtTime(2000, audioContext.currentTime); // Higher frequency
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // Lower volume
        oscillator.type = 'sine'; // Pure tone for earpiece
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      } else if (mode === 'speaker') {
        // Speaker - balanced frequency, medium volume
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // Mid frequency
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime); // Medium volume
        oscillator.type = 'square'; // Square wave for distinction
        compressor.threshold.setValueAtTime(-18, audioContext.currentTime);
        compressor.knee.setValueAtTime(20, audioContext.currentTime);
        compressor.ratio.setValueAtTime(8, audioContext.currentTime);
      } else if (mode === 'loudspeaker') {
        // Loudspeaker - lower frequency, higher volume for external speaker
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime); // Lower frequency
        gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // Higher volume
        oscillator.type = 'sawtooth'; // Rich harmonics for loudspeaker
        compressor.threshold.setValueAtTime(-12, audioContext.currentTime);
        compressor.knee.setValueAtTime(10, audioContext.currentTime);
        compressor.ratio.setValueAtTime(4, audioContext.currentTime);
      }
      
      // Start oscillator
      oscillator.start();
      
      // Store oscillator reference for stopping
      setTestAudioElement(oscillator as any);
      
      // Create frequency modulation for more realistic test
      const modOscillator = audioContext.createOscillator();
      const modGain = audioContext.createGain();
      modOscillator.frequency.setValueAtTime(5, audioContext.currentTime); // 5Hz modulation
      modGain.gain.setValueAtTime(50, audioContext.currentTime); // Modulation depth
      modOscillator.connect(modGain);
      modGain.connect(oscillator.frequency);
      modOscillator.start();
      
      toast({
        title: `Audio Test - ${mode.toUpperCase()}`,
        description: `Menguji ${mode} dengan frekuensi ${mode === 'earpiece' ? '2000Hz (Suara jernih untuk panggilan)' : mode === 'speaker' ? '1000Hz (Suara seimbang)' : '500Hz (Bass untuk speaker eksternal)'}`,
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
      try {
        // Stop oscillator if it's an oscillator node
        if (typeof testAudioElement.stop === 'function') {
          testAudioElement.stop();
        } else {
          // Stop audio element if it's an HTML audio element
          testAudioElement.pause();
          testAudioElement.currentTime = 0;
          testAudioElement.src = '';
        }
      } catch (error) {
        console.log('Audio test stopped');
      }
    }
    setIsTestingAudio(false);
    setAudioTestMode(null);
    setTestAudioElement(null);
  };

  const startMicTest = async () => {
    try {
      setIsMicTesting(true);
      setMicLevel(0);
      
      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      setMicStream(stream);
      
      // Create audio context for microphone level monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // Configure analyser for better sensitivity
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let isRunning = true;
      
      const updateMicLevel = () => {
        if (!isRunning || !isMicTesting) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (root mean square) for more accurate level detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const level = Math.min(Math.round((rms / 128) * 100), 100);
        
        setMicLevel(level);
        requestAnimationFrame(updateMicLevel);
      };
      
      // Store the stop function
      (window as any).stopMicTest = () => {
        isRunning = false;
      };
      
      updateMicLevel();
      
      toast({
        title: "Microphone Test",
        description: "Berbicara atau buat suara untuk melihat level microphone. Level akan bergerak jika mic aktif.",
      });
      
    } catch (error) {
      console.error('Failed to start microphone test:', error);
      let errorMessage = "Gagal mengakses microphone.";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Izin microphone ditolak. Mohon izinkan akses microphone di browser.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Microphone tidak ditemukan. Pastikan microphone terhubung.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Microphone sedang digunakan aplikasi lain.";
      }
      
      toast({
        title: "Microphone Test Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsMicTesting(false);
    }
  };

  const stopMicTest = () => {
    // Stop the mic level monitoring
    if ((window as any).stopMicTest) {
      (window as any).stopMicTest();
    }
    
    // Stop all media tracks
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    
    setIsMicTesting(false);
    setMicLevel(0);
    
    toast({
      title: "Microphone Test Stopped",
      description: "Test microphone telah dihentikan.",
    });
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

  const updateSettings = (key: string, value: any) => {
    setSettings(prev => {
      const keys = key.split('.');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-700 bg-gray-800">
        <Button
          variant="ghost"
          size="sm"
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
                      <AvatarImage src={(user as any)?.profileImageUrl ?? ''} />
                      <AvatarFallback className="bg-green-600 text-white text-xl">
                        {(user as any)?.callsign?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{(user as any)?.callsign || 'Unknown'}</h3>
                      <p className="text-sm text-gray-400">{(user as any)?.nrp || 'No NRP'}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Ubah Foto
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Status Settings */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Status</Label>
                      <Select value={settings.status} onValueChange={(value) => updateSettings('status', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="Available">🟢 Available</SelectItem>
                          <SelectItem value="Busy">🔴 Busy</SelectItem>
                          <SelectItem value="Away">🟡 Away</SelectItem>
                          <SelectItem value="Offline">⚫ Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Status Message</Label>
                      <Textarea
                        placeholder="Tulis status message..."
                        value={settings.statusMessage}
                        onChange={(e) => updateSettings('statusMessage', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white resize-none"
                        rows={3}
                      />
                    </div>
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
                    Privasi
                  </CardTitle>
                  <CardDescription>
                    Kontrol siapa yang dapat melihat informasi Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Tampilkan Status Online</Label>
                        <p className="text-sm text-gray-400">Biarkan orang lain melihat saat Anda online</p>
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
                        <Label className="text-white">Tanda Baca Pesan</Label>
                        <p className="text-sm text-gray-400">Tampilkan centang biru saat pesan dibaca</p>
                      </div>
                      <Switch
                        checked={settings.privacy.readReceipts}
                        onCheckedChange={(checked) => updateSettings('privacy.readReceipts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Foto Profil</Label>
                        <p className="text-sm text-gray-400">Siapa yang dapat melihat foto profil Anda</p>
                      </div>
                      <Switch
                        checked={settings.privacy.profilePhoto}
                        onCheckedChange={(checked) => updateSettings('privacy.profilePhoto', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Undangan Grup</Label>
                        <p className="text-sm text-gray-400">Izinkan orang lain menambahkan ke grup</p>
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
                    Tampilan
                  </CardTitle>
                  <CardDescription>
                    Sesuaikan tampilan aplikasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Tema</Label>
                      <Select value={settings.theme} onValueChange={(value) => updateSettings('theme', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="light">Terang</SelectItem>
                          <SelectItem value="dark">Gelap</SelectItem>
                          <SelectItem value="system">Sistem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Bahasa</Label>
                      <Select value={settings.language} onValueChange={(value) => updateSettings('language', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="id">Bahasa Indonesia</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
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
                    Atur bagaimana Anda menerima notifikasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Push Notifications</Label>
                        <p className="text-sm text-gray-400">Terima notifikasi push</p>
                      </div>
                      <Switch
                        checked={settings.notifications.push}
                        onCheckedChange={(checked) => updateSettings('notifications.push', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Suara</Label>
                        <p className="text-sm text-gray-400">Mainkan suara notifikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.sound}
                        onCheckedChange={(checked) => updateSettings('notifications.sound', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Getaran</Label>
                        <p className="text-sm text-gray-400">Getar saat menerima notifikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.vibration}
                        onCheckedChange={(checked) => updateSettings('notifications.vibration', checked)}
                      />
                    </div>

                    <Separator className="bg-gray-700" />

                    <h4 className="font-semibold text-white">Notifikasi Khusus</h4>

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
                        <p className="text-sm text-gray-400">Notifikasi aktivitas grup</p>
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
                    Lindungi akun dan data Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-400">Tambahan keamanan dengan 2FA</p>
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