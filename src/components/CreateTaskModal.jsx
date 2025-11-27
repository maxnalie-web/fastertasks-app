import React, { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { Loader2, Link, UserPlus, Droplet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';

const CreateTaskModal = ({ onClose, onTaskCreated }) => {
  const { contract, ethPrice } = useWallet();
  const { toast } = useToast();

  const [taskType, setTaskType] = useState('boost-cast');
  const [castLink, setCastLink] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [usdAmount, setUsdAmount] = useState('10');
  const [creatingTask, setCreatingTask] = useState(false);

  const PLATFORM_FEE_PERCENT = 25;

  const totalEthNeeded = useMemo(() => {
    if (!usdAmount || !ethPrice) return 0;
    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount < 10) return 0;

    const totalUsd = amount * (1 + PLATFORM_FEE_PERCENT / 100);
    return totalUsd / ethPrice;
  }, [usdAmount, ethPrice]);

  const usdAmountFloat = parseFloat(usdAmount) || 0;
  const platformFeeUsd = usdAmountFloat * (PLATFORM_FEE_PERCENT / 100);
  const totalUsd = usdAmountFloat + platformFeeUsd;

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!contract || !totalEthNeeded || totalEthNeeded <= 0) return;
    if (taskType === 'boost-cast' && !castLink) {
        toast({ title: "Cast link is required", variant: "destructive" });
        return;
    }
    if (taskType === 'follow-account' && !accountUsername) {
        toast({ title: "Account username is required", variant: "destructive" });
        return;
    }

    setCreatingTask(true);
    try {
      const amountWei = ethers.parseEther(totalEthNeeded.toString());
      
      // The smart contract `createTaskNative` only takes `maxParticipants`.
      // We will need to update this if we want to pass more data.
      // For now, let's use a dummy value for maxParticipants, e.g., 1000.
      const maxParticipants = 1000;
      
      const tx = await contract.createTaskNative(
        maxParticipants, 
        { value: amountWei }
      );

      toast({
        title: "Transaction Submitted",
        description: "Creating your task...",
      });

      await tx.wait();

      toast({
        title: "Task Created Successfully!",
        description: "Your task is now live.",
      });

      onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Task Creation Failed",
        description: error?.revert?.args[0] || error.message,
        variant: "destructive"
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const isButtonDisabled = creatingTask || 
    totalEthNeeded <= 0 || 
    (taskType === 'boost-cast' && !castLink) ||
    (taskType === 'follow-account' && !accountUsername);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create a New Task
          </DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            Fund a reward pool to incentivize users on Farcaster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateTask} className="space-y-6 pt-4">
          <div>
            <Label>Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boost-cast">
                  <div className="flex items-center gap-2"><Link className="w-4 h-4" /> Boost Cast</div>
                </SelectItem>
                <SelectItem value="follow-account">
                  <div className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Follow Account</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {taskType === 'boost-cast' && (
            <>
              <div>
                <Label htmlFor="castLink">Cast Link</Label>
                <Input
                  id="castLink"
                  placeholder="https://warpcast.com/..."
                  value={castLink}
                  onChange={(e) => setCastLink(e.target.value)}
                  required
                  className="mt-2 text-white"
                />
              </div>
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-4 text-sm">
                <p className="font-semibold text-purple-300 mb-2">How to Earn</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>Like and recast the cast.</li>
                    <li>Click "Verify" to earn a reward.</li>
                </ol>
              </div>
            </>
          )}

           {taskType === 'follow-account' && (
             <>
                <div>
                  <Label htmlFor="accountUsername">Account Username</Label>
                  <Input
                    id="accountUsername"
                    placeholder="e.g., vitalik"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    required
                    className="mt-2 text-white"
                  />
                </div>
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-purple-300 mb-2">How to Earn</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                      <li>Follow the account on Farcaster.</li>
                      <li>Click "Verify" to earn a reward.</li>
                  </ol>
                </div>
            </>
           )}

          <div>
            <Label>Reward Token</Label>
            <Select defaultValue="eth" disabled>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eth">
                  <div className="flex items-center gap-2"><Droplet className="w-4 h-4 text-blue-400" /> Ethereum (ETH)</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="usdAmount">Reward Amount (USD)</Label>
            <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                    id="usdAmount"
                    type="number"
                    min="10"
                    step="1"
                    placeholder="10"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    required
                    className="pl-7 text-white"
                />
            </div>
            <p className="text-xs text-gray-400 mt-2">Minimum $10 • Platform fee 25%</p>
          </div>

          <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Reward Pool</span>
              <span className="font-mono text-white">${usdAmountFloat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="font-mono text-pink-400">+ ${platformFeeUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-purple-500/10">
              <span className="text-gray-300">Total Due</span>
              <div className="text-right">
                <span className="font-mono text-green-400">${totalUsd.toFixed(2)}</span>
                <span className="font-mono text-xs text-gray-400 ml-2">≈ {totalEthNeeded.toFixed(6)} ETH</span>
              </div>
            </div>
          </div>
        
          <Button
            type="submit"
            disabled={isButtonDisabled}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all duration-300 py-3 text-base"
          >
            {creatingTask ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Transaction...
              </>
            ) : (
              'Create and Fund Task'
            )}
          </Button>
        </form>
        <DialogFooter/>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskModal;