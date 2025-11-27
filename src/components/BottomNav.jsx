import React from 'react';
import { motion } from 'framer-motion';
import { ListTodo, Gift } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'rewards', label: 'Rewards', icon: Gift }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-purple-500/20 md:hidden z-50">
      <div className="flex items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center gap-1.5 px-6 py-2 transition-all duration-300 w-full"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-pink-600/0 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={`w-6 h-6 transition-colors duration-300 relative z-10 ${
                isActive ? 'text-purple-400' : 'text-gray-400'
              }`} />
              <span className={`text-xs transition-colors duration-300 relative z-10 ${
                isActive ? 'text-purple-300 font-semibold' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;