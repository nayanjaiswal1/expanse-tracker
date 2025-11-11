/**
 * Reusable Stat Card Component
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../utils/helpers';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down';
  icon: ReactNode;
  currency?: string;
  delay?: number;
}

export const StatCard = ({
  title,
  value,
  change,
  trend,
  icon,
  currency = 'INR',
  delay = 0,
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase">
          {title}
        </span>
        <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-gray-900">
          {formatCurrency(value, currency)}
        </h3>

        {change !== undefined && trend && (
          <div
            className={clsx(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend === 'up' ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </motion.div>
  );
};
