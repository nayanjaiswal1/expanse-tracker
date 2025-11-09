import React from 'react';

interface TransactionTagsCellProps {
  tags: string[] | undefined;
}

export const TransactionTagsCell: React.FC<TransactionTagsCellProps> = ({ tags }) => {
  if (!tags || tags.length === 0) {
    return (
      <div className="flex h-8 items-center px-3 py-1">
        <span className="text-xs text-gray-400">No tags</span>
      </div>
    );
  }

  return (
    <div className="flex h-8 items-center gap-1 px-3 py-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};
