import { useState, useEffect } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import {
  useSearchTransactionGroups,
  useMerchants,
  useCreateTransactionGroup,
} from '../hooks/queries/useTransactionGroups';
import type { TransactionGroup } from '@/types';

interface MerchantSelectorProps {
  value?: number;
  onValueChange: (value: number | undefined, group?: TransactionGroup) => void;
  groupType?: TransactionGroup['group_type'];
  placeholder?: string;
  className?: string;
}

export function MerchantSelector({
  value,
  onValueChange,
  groupType = 'merchant',
  placeholder = 'Select merchant...',
  className,
}: MerchantSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch merchants or groups by type
  const { data: allGroups } = useMerchants();

  // Search for groups when user types
  const { data: searchResults } = useSearchTransactionGroups(search, groupType);

  // Create new group mutation
  const createGroup = useCreateTransactionGroup();

  // Combined list of groups
  const groups = search.length > 0 ? searchResults : allGroups?.results;

  // Selected group
  const selectedGroup = groups?.find((g) => g.id === value);

  const handleSelect = (group: TransactionGroup) => {
    onValueChange(group.id, group);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = async () => {
    if (!search.trim()) return;

    try {
      const newGroup = await createGroup.mutateAsync({
        name: search.trim(),
        group_type: groupType,
        description: '',
        is_active: true,
        metadata: {},
        color: '#0066CC',
      });

      onValueChange(newGroup.id, newGroup);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <HStack gap={2} className="truncate">
            {selectedGroup?.logo_url && (
              <img
                src={selectedGroup.logo_url}
                alt={selectedGroup.name}
                className="h-5 w-5 rounded object-cover"
              />
            )}
            <span className="truncate">{selectedGroup ? selectedGroup.name : placeholder}</span>
          </HStack>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${groupType}s...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-sm text-muted-foreground">No {groupType} found</p>
                {search.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={createGroup.isPending}
                  >
                    <HStack gap={2}>
                      <Plus className="h-4 w-4" />
                      Create "{search.trim()}"
                    </HStack>
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {groups?.map((group) => (
                <CommandItem
                  key={group.id}
                  value={group.id.toString()}
                  onSelect={() => handleSelect(group)}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === group.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <HStack gap={2} className="flex-1">
                    {group.logo_url && (
                      <img
                        src={group.logo_url}
                        alt={group.name}
                        className="h-5 w-5 rounded object-cover"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{group.name}</span>
                      {group.description && (
                        <span className="text-xs text-muted-foreground">{group.description}</span>
                      )}
                    </div>
                  </HStack>
                  {group.total_transactions > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {group.total_transactions} txns
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {search.trim() && groups && groups.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleCreateNew}
                disabled={createGroup.isPending}
              >
                <HStack gap={2}>
                  <Plus className="h-4 w-4" />
                  Create "{search.trim()}"
                </HStack>
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
