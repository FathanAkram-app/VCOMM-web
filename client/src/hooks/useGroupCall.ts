import { useContext } from 'react';
import { GroupCallContext } from '../context/GroupCallContext';

export function useGroupCall() {
  const context = useContext(GroupCallContext);
  
  if (context === undefined) {
    throw new Error('useGroupCall must be used within a GroupCallProvider');
  }
  
  return context;
}