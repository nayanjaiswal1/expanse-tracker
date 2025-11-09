import React from 'react';

interface ColorPickerButtonProps {
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

export const ColorPickerButton: React.FC<ColorPickerButtonProps> = ({
  color,
  isSelected,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
      }`}
      style={{ backgroundColor: color }}
    />
  );
};
