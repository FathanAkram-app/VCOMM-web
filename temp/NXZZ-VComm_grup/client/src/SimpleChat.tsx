import React from 'react';
import { useRoute } from 'wouter';
import SimpleViewFixed from './SimpleViewFixed';

// This is a simple wrapper component that just uses SimpleViewFixed 
// This fixes the syntax errors in the original component
const SimpleChat: React.FC = () => {
  // Get the chat ID from the URL params
  const [, params] = useRoute('/chat/:chatId');
  
  return <SimpleViewFixed />;
};

export default SimpleChat;