import React from 'react';
import { FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../../components/ui/Layout';

interface HeaderProps {
  onClose: () => void;
}

const Header: React.FC<HeaderProps> = ({ onClose }) => {
  const { t } = useTranslation('finance');

  return (
    <FlexBetween className="bg-emerald-600 px-4 py-3 text-white">
      <HStack gap={2}>
        <FileText className="h-5 w-5" />
        <span className="font-semibold">{t('invoiceUploadChat.uploadTitle')}</span>
      </HStack>
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-emerald-500"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </FlexBetween>
  );
};

export default Header;
