import React from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { Users, Coins, CheckCircle, User, Info } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

const TaskCard = ({ task, index }) => {
  const { ethPrice } = useWallet();
  
  const remainingReward = parseFloat(ethers.formatEther(task.remainingReward));
  const usdValue = remainingReward * ethPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Task #{task.id}
          </h3>
          <div className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" />
            Active
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
           <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Creator
            </span>
            <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded">
              {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Reward Pool
            </span>
            <div className="text-right">
              <div className="font-semibold text-purple-400">{remainingReward.toFixed(5)} ETH</div>
              <div className="text-xs text-gray-500">${usdValue.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants
            </span>
            <span className="font-semibold">
              {task.participantsPaid.toString()} / {task.maxParticipants.toString()}
            </span>
          </div>
        </div>
      </div>
       <div className="bg-purple-500/10 text-purple-300 text-xs p-3 rounded-lg border border-purple-500/20 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Rewards are distributed by verifiers based on off-chain actions.</span>
       </div>
    </motion.div>
  );
};

export default TaskCard;