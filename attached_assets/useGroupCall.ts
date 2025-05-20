import { useContext } from 'react';
import { GroupCallContext } from '../context/GroupCallContext';

/**
 * Custom hook to access the GroupCallContext
 * This hook abstracts the context access for components
 */
const useGroupCall = () => {
  const context = useContext(GroupCallContext);
  
  if (context === undefined) {
    throw new Error('useGroupCall must be used within a GroupCallProvider');
  }
  
  return context;
};

export default useGroupCall;