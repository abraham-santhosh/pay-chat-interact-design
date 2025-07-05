
import React from 'react';
import { Receipt } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="bg-white p-8 rounded-full mb-6 animate-pulse">
          <Receipt className="h-16 w-16 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 animate-fade-in">Split Easy</h1>
        <p className="text-xl text-white/80 mb-8 animate-fade-in">Split expenses with friends easily</p>
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
