import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { Wallet, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import AdminPanel from '@/components/AdminPanel';

const RewardsTab = () => {
  const { contract, account, ethPrice, isOwner, isVerifier } = useWallet();
  const { toast } = useToast();
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadBalance = async () => {
    if (!contract || !account) return;
    setLoading(true);
    try {
      const balanceWei = await contract.nativeBalances(account);
      setBalance(ethers.formatEther(balanceWei));
    } catch (error) {
      console.error('Error loading balance:', error);
      toast({
        title: "Error loading balance",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
    
    if(contract) {
        const rewardAllocatedHandler = (taskId, user, amount) => {
            if(user.toLowerCase() === account.toLowerCase()){
                toast({ title: "You've Received a Reward!", description: `Loading new balance...` });
                loadBalance();
            }
        };
        contract.on('RewardAllocated', rewardAllocatedHandler);

        return () => {
            contract.off('RewardAllocated', rewardAllocatedHandler);
        };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  const handleWithdraw = async () => {
    if (!contract) return;

    setWithdrawing(true);
    try {
      const tx = await contract.withdrawNative();
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      await tx.wait();

      toast({
        title: "Withdrawal Successful!",
        description: `${balance} ETH has been sent to your wallet.`,
      });

      loadBalance();
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast({
        title: "Withdrawal Failed",
        description: error?.revert?.args[0] || error.message,
        variant: "destructive"
      });
    } finally {
      setWithdrawing(false);
    }
  };

  if (!account) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 max-w-md mx-auto"
        >
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Please connect your wallet to view your rewards.</p>
        </motion.div>
      </div>
    );
  }

  const balanceFloat = parseFloat(balance);
  const usdValue = balanceFloat * ethPrice;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Your Rewards</h2>
            <p className="text-sm text-gray-400">Available balance to withdraw</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              {balanceFloat.toFixed(6)} ETH
            </div>
            <div className="text-2xl text-gray-400">
              ${usdValue.toFixed(2)} USD
            </div>
          </div>
        )}

        <Button
          onClick={handleWithdraw}
          disabled={withdrawing || balanceFloat === 0}
          className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl py-6 text-lg transition-all duration-300"
        >
          {withdrawing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Withdrawing...
            </>
          ) : (
            'Withdraw to Wallet'
          )}
        </Button>
      </motion.div>

      {(isOwner || isVerifier) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Admin Panel</h3>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">
              {isOwner ? 'Owner' : 'Verifier'}
            </span>
          </div>
          <AdminPanel />
        </motion.div>
      )}
    </div>
  );
};

export default RewardsTab;