import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

const Header = () => {
  const { account, connectWallet, disconnectWallet } = useWallet();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            FasterTasks
          </h1>
          <p className="text-sm text-gray-400">Earn on Base</p>
        </div>
      </div>
      
      {account ? (
        <Button
          onClick={disconnectWallet}
          className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all duration-300 text-white"
        >
          {account.slice(0, 6)}...{account.slice(-4)}
        </Button>
      ) : (
        <Button
          onClick={connectWallet}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all duration-300 text-white"
        >
          Connect Wallet
        </Button>
      )}
    </motion.header>
  );
};

export default Header;