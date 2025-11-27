import React from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { WalletProvider } from '@/contexts/WalletContext';
import Header from '@/components/Header';
import TasksTab from '@/components/TasksTab';
import RewardsTab from '@/components/RewardsTab';
import BottomNav from '@/components/BottomNav';

function App() {
  const [activeTab, setActiveTab] = React.useState('tasks');

  return (
    <WalletProvider>
      <Helmet>
        <title>FasterTasks - Earn Rewards on Base</title>
        <meta name="description" content="Create tasks, complete them, and earn ETH rewards on the Base blockchain." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white pb-24 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Header />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
            <TabsList className="hidden md:grid w-full grid-cols-2 bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-1">
              <TabsTrigger 
                value="tasks"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
              >
                Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="rewards"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
              >
                Rewards
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="mt-6">
              <TasksTab />
            </TabsContent>
            
            <TabsContent value="rewards" className="mt-6">
              <RewardsTab />
            </TabsContent>
          </Tabs>
        </div>
        
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <Toaster />
      </div>
    </WalletProvider>
  );
}

export default App;