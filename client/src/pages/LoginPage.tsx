import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation } from 'wouter';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Login schema
const loginSchema = z.object({
  callsign: z.string().min(3, { message: 'Callsign harus minimal 3 karakter' }),
  password: z.string().min(6, { message: 'Password harus minimal 6 karakter' }),
});

// Registration schema
const registerSchema = z.object({
  callsign: z.string().min(3, { message: 'Callsign harus minimal 3 karakter' }),
  password: z.string().min(6, { message: 'Password harus minimal 6 karakter' }),
  nrp: z.string().optional(),
  rank: z.string().optional(),
  fullName: z.string().min(2, { message: 'Nama lengkap harus minimal 2 karakter' }).optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<string>('login');

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      callsign: '',
      password: '',
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      callsign: '',
      password: '',
      nrp: '',
      rank: '',
      fullName: '',
    },
  });

  // Handle login form submission
  const onLoginSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      await login(values);
      setLocation('/');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration form submission
  const onRegisterSubmit = async (values: RegisterValues) => {
    setIsLoading(true);
    try {
      await register(values);
      setActiveTab('login');
      toast({
        title: 'Registrasi berhasil',
        description: 'Silahkan login dengan akun baru Anda',
        variant: 'success',
      });
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App Logo and Title */}
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="bg-military-green rounded-full p-3 border-2 border-military-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
              <circle cx="17" cy="7" r="5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">NXZZ-VComm</h1>
          <p className="text-sm text-zinc-400">Secure Military Communication Platform</p>
        </div>

        {/* Login/Register Card */}
        <Card className="border-military-accent bg-zinc-900 text-white">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                <TabsTrigger value="login" className="data-[state=active]:bg-military-green data-[state=active]:text-white">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-military-green data-[state=active]:text-white">
                  Register
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === 'login' ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="callsign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Callsign</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Masukkan callsign" 
                            {...field} 
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Masukkan password" 
                            {...field} 
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    variant="military" 
                    disabled={isLoading} 
                    className="w-full"
                  >
                    {isLoading ? 'Memproses...' : 'Login'}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="callsign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Callsign</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Masukkan callsign" 
                            {...field} 
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Masukkan password" 
                            {...field} 
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="nrp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">NRP</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nomor Registrasi Personil" 
                              {...field} 
                              className="bg-zinc-800 border-zinc-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="rank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Pangkat</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Pangkat/Jabatan" 
                              {...field} 
                              className="bg-zinc-800 border-zinc-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Masukkan nama lengkap" 
                            {...field} 
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    variant="military" 
                    disabled={isLoading} 
                    className="w-full"
                  >
                    {isLoading ? 'Memproses...' : 'Register'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="border-t border-zinc-800 flex justify-center">
            <p className="text-xs text-zinc-500">
              © 2023 Military Communications Division. All rights reserved.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}