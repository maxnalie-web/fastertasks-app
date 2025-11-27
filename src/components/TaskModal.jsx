import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { X, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';

const TaskModal = ({ task, onClose }) => {
  const { ethPrice } = useWallet();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);

  const rewardInEth = parseFloat(ethers.formatEther(task.rewardPerUser));
  const totalRewardPool = rewardInEth * Number(task.maxParticipants);
  const remainingReward = rewardInEth * (Number(task.maxParticipants) - Number(task.participantsPaid));

  // Mock participants data
  const mockParticipants = [
    { address: '0x742d...4f92', status: 'paid', amount: rewardInEth },
    { address: '0x8a3c...7b1e', status: 'paid', amount: rewardInEth },
    { address: '0x9f2e...3d4a', status: 'pending', timeLeft: 145 },
    { address: '0x1b7a...8c2f', status: 'pending', timeLeft: 89 },
    { address: '0x4e6d...9a5b', status: 'pending', timeLeft: 234 },
  ];

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      toast({
        title: "Verification initiated",
        description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      });
    }, 1500);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {task.taskType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
              <div className="text-gray-400 text-sm mb-1">Total Reward Pool</div>
              <div className="text-2xl font-bold text-purple-400">{totalRewardPool.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-500">${(totalRewardPool * ethPrice).toFixed(2)}</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
              <div className="text-gray-400 text-sm mb-1">Remaining Reward</div>
              <div className="text-2xl font-bold text-green-400">{remainingReward.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-500">${(remainingReward * ethPrice).toFixed(2)}</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
              <div className="text-gray-400 text-sm mb-1">Max Participants</div>
              <div className="text-2xl font-bold">{task.maxParticipants.toString()}</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
              <div className="text-gray-400 text-sm mb-1">Participants Paid</div>
              <div className="text-2xl font-bold text-pink-400">{task.participantsPaid.toString()}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Participants</h4>
              <span className="text-sm text-gray-400">{mockParticipants.length} total</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mockParticipants.map((participant, index) => (
                <motion.div
                  key={participant.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-800/30 rounded-xl p-3 border border-purple-500/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${participant.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                    <span className="font-mono text-sm">{participant.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.status === 'paid' ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">{participant.amount.toFixed(4)} ETH</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{participant.timeLeft}s</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all duration-300"
            >
              {verifying ? 'Verifying...' : 'Verify Task'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(task.targetUrl, '_blank')}
              className="bg-slate-800/50 border-purple-500/20 hover:border-purple-500/40 rounded-xl"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;