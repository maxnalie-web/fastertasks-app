import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';

const AdminPanel = () => {
  const { contract } = useWallet();
  const { toast } = useToast();
  
  const [allocateForm, setAllocateForm] = useState({
    taskId: '',
    userAddress: '',
    amount: ''
  });
  const [allocating, setAllocating] = useState(false);

  const handleAllocateReward = async (e) => {
    e.preventDefault();
    if (!contract) return;

    setAllocating(true);
    try {
      const amountWei = ethers.parseEther(allocateForm.amount);

      const tx = await contract.allocateReward(
        allocateForm.taskId,
        allocateForm.userAddress,
        amountWei
      );

      toast({
        title: "Transaction Submitted",
        description: "Allocating reward...",
      });

      await tx.wait();

      toast({
        title: "Reward Allocated Successfully!",
        description: `${allocateForm.amount} ETH sent to ${allocateForm.userAddress.slice(0, 6)}...`,
      });

      setAllocateForm({
        taskId: '',
        userAddress: '',
        amount: ''
      });
    } catch (error) {
      console.error('Error allocating reward:', error);
      toast({
        title: "Allocation Failed",
        description: error?.revert?.args[0] || error.message,
        variant: "destructive"
      });
    } finally {
      setAllocating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-6"
    >
      <h4 className="text-lg font-semibold mb-4 text-yellow-300">Allocate Rewards</h4>
      <form onSubmit={handleAllocateReward} className="space-y-4">
        <div>
          <Label htmlFor="taskId">Task ID</Label>
          <Input
            id="taskId"
            type="number"
            min="0"
            placeholder="e.g., 0"
            value={allocateForm.taskId}
            onChange={(e) => setAllocateForm({ ...allocateForm, taskId: e.target.value })}
            required
            className="bg-slate-800/50 border-purple-500/20 rounded-xl mt-1 text-white"
          />
        </div>

        <div>
          <Label htmlFor="userAddress">Recipient Address</Label>
          <Input
            id="userAddress"
            placeholder="0x..."
            value={allocateForm.userAddress}
            onChange={(e) => setAllocateForm({ ...allocateForm, userAddress: e.target.value })}
            required
            className="bg-slate-800/50 border-purple-500/20 rounded-xl mt-1 text-white"
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount (ETH)</Label>
          <Input
            id="amount"
            type="number"
            step="any"
            placeholder="e.g., 0.001"
            value={allocateForm.amount}
            onChange={(e) => setAllocateForm({ ...allocateForm, amount: e.target.value })}
            required
            className="bg-slate-800/50 border-purple-500/20 rounded-xl mt-1 text-white"
          />
        </div>

        <Button
          type="submit"
          disabled={allocating}
          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-xl transition-all duration-300 py-3"
        >
          {allocating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Allocating Reward...
            </>
          ) : (
            'Allocate Reward'
          )}
        </Button>
      </form>
    </motion.div>
  );
};

export default AdminPanel;