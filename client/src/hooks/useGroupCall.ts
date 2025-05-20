import { useContext } from 'react';
import { GroupCallContext } from '../context/GroupCallContext';

/**
 * Custom hook untuk mengakses GroupCallContext
 * Hook ini mengabstraksi akses context untuk komponen-komponen
 */
const useGroupCall = () => {
  const context = useContext(GroupCallContext);
  
  if (context === undefined) {
    throw new Error('useGroupCall must be used within a GroupCallProvider');
  }
  
  return context;
};

export default useGroupCall;