import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect to chat
    if (isAuthenticated && !isLoading) {
      navigate('/chat');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = () => {
    window.location.href = '/api/login';
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl w-full mx-auto text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
          Welcome to <span className="text-primary">VComm</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A modern communication platform for teams and individuals
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Real-time Messaging</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Communicate with your team in real-time with instant message delivery and typing indicators.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Group Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Create group conversations for your team, projects, or friends to collaborate effectively.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Simple & Secure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              User-friendly interface with secure authentication to keep your conversations private.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col items-center mb-8">
        {isLoading ? (
          <Button disabled>Loading...</Button>
        ) : isAuthenticated ? (
          <Button 
            onClick={() => navigate('/chat')}
            size="lg"
            className="font-semibold"
          >
            Go to Chat
          </Button>
        ) : (
          <Button
            onClick={handleLogin}
            size="lg"
            className="font-semibold"
          >
            Get Started
          </Button>
        )}
      </div>
      
      <footer className="text-center text-gray-500 text-sm mt-8">
        <p>© {new Date().getFullYear()} VComm. All rights reserved.</p>
      </footer>
    </div>
  );
}
