import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, PlusCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import TaskCard from '@/components/TaskCard';
import CreateTaskModal from '@/components/CreateTaskModal';
import { Button } from '@/components/ui/button';

const TasksTab = () => {
  const { contract, account } = useWallet();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const loadTasks = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const nextTaskId = await contract.nextTaskId();
      const taskPromises = [];
      for (let i = 0; i < nextTaskId; i++) {
        taskPromises.push(contract.tasks(i).then(task => ({ ...task, id: i })));
      }
      const allTasks = await Promise.all(taskPromises);
      setTasks(allTasks.filter(task => task.isActive).reverse());
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadTasks();
    
    if(contract) {
        const taskCreatedHandler = () => {
            toast({ title: "New Task Detected", description: "Refreshing tasks list..." });
            loadTasks();
        };
        contract.on('TaskCreated', taskCreatedHandler);
        
        return () => {
            contract.off('TaskCreated', taskCreatedHandler);
        };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  if (!account) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 max-w-md mx-auto"
        >
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Please connect your wallet to view and create tasks.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all duration-300 flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Create Task
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-slate-900/30 rounded-2xl"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-300">No active tasks yet</h3>
              <p className="text-gray-400">Be the first one to create a task!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isCreateModalOpen && (
        <CreateTaskModal
          onClose={() => setCreateModalOpen(false)}
          onTaskCreated={loadTasks}
        />
      )}
    </div>
  );
};

export default TasksTab;