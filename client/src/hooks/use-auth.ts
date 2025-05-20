import { useEffect, useState } from 'react';
import { User } from '@shared/schema';

// Simple auth hook for getting current user from session
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user');
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // User not authenticated
          setUser(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}