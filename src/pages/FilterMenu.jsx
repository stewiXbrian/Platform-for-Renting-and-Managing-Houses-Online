import { useState, useEffect } from 'react';
import { Popover, Button, Group, Text, Checkbox, Divider, Stack, NumberInput } from '@mantine/core';
import { IconCalendar, IconBuilding, IconHome, IconMoneybag, IconUserDollar, IconBed, IconUser, IconX } from '@tabler/icons-react';

function FilterMenu({ onFilterChange, onResetFilter, filters }) {
  // Popover state
  const [opened, setOpened] = useState(null);
  
  // Local state for availability filters (mapped to lengthOfStay)
  const [availabilityFilters, setAvailabilityFilters] = useState({
    short: filters?.lengthOfStay?.includes('1-3 months') || false,
    medium: filters?.lengthOfStay?.includes('3-6 months') || false,
    long: filters?.lengthOfStay?.includes('12 months') || false
  });
  
  // Local state for budget - separate from applied budget (mapped to price)
  const [budgetInput, setBudgetInput] = useState({
    min: filters?.price?.min || null,
    max: filters?.price?.max || null
  });
  
  // Applied budget state (only updated when Apply is clicked)
  const [appliedBudget, setAppliedBudget] = useState({
    min: filters?.price?.min || null,
    max: filters?.price?.max || null
  });
  
  // Local state for room type (mapped to propertyType)
  const [selected, setSelected] = useState(filters?.propertyType || null);

  // Toggle popover open/close
  const togglePopover = (segment) => {
    if (segment === 'budget' && opened !== 'budget') {
      setBudgetInput({
        min: appliedBudget.min,
        max: appliedBudget.max
      });
    }
    setOpened(opened === segment ? null : segment);
  }; 

  const buttonStyles = {
    height: '40px',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: '400',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid rgb(209, 203, 203)',
    padding: '0 18px',
  };

  const activeTagStyles = {
    root: {
      height: '32px',
      backgroundColor: '#f5f5f5',
      color: '#333',
      border: 'none',
      padding: '0 12px',
    },
    label: {
      fontSize: '14px',
      fontWeight: 'normal',
    },
  };

  // Handle availability filter changes (mapped to lengthOfStay)
  const handleAvailabilityChange = (key, value) => {
    const newFilters = { ...availabilityFilters, [key]: value };
    setAvailabilityFilters(newFilters);
    
    const activeLengths = [];
    if (newFilters.short) activeLengths.push('1-3 months');
    if (newFilters.medium) activeLengths.push('3-6 months');
    if (newFilters.long) activeLengths.push('12 months');
    
    if (onFilterChange) {
      onFilterChange({
        lengthOfStay: activeLengths.length > 0 ? activeLengths : null
      });
    }
  };

  // Handle budget input changes (mapped to price)
  const handleBudgetInputChange = (key, value) => {
    setBudgetInput(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle budget apply button
  const handleBudgetApply = () => {
    setAppliedBudget(budgetInput);
    
    if (onFilterChange) {
      onFilterChange({
        price: budgetInput
      });
    }
    
    setOpened(null);
  };

  // Cancel budget changes
  const handleBudgetCancel = () => {
    setBudgetInput(appliedBudget);
    setOpened(null);
  };

  // Handle room type selection (mapped to propertyType)
  const handleRoomTypeSelect = (type) => {
    const newType = type === selected ? null : type;
    setSelected(newType);
    
    if (onFilterChange) {
      onFilterChange({
        propertyType: newType
      });
    }
    
    setOpened(null);
  };

  // Sync component state with props when filters change externally
  useEffect(() => {
    if (filters) {
      setAvailabilityFilters({
        short: filters.lengthOfStay?.includes('1-3 months') || false,
        medium: filters.lengthOfStay?.includes('3-6 months') || false,
        long: filters.lengthOfStay?.includes('12 months') || false
      });
      
      const newBudget = {
        min: filters.price?.min ?? null,
        max: filters.price?.max ?? null
      };
      
      setBudgetInput(newBudget);
      setAppliedBudget(newBudget);
      
      setSelected(filters.propertyType || null);
    }
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      availabilityFilters.short || 
      availabilityFilters.medium || 
      availabilityFilters.long ||
      appliedBudget.min !== null ||
      appliedBudget.max !== null ||
      selected !== null
    );
  };

  // Handle filter reset for availability (lengthOfStay)
  const handleResetAvailability = (e) => {
    e.stopPropagation();
    onResetFilter('lengthOfStay', '1-3 months');
    onResetFilter('lengthOfStay', '3-6 months');
    onResetFilter('lengthOfStay', '12 months');
  };

  // Handle filter reset for budget (price)
  const handleResetBudget = (e) => {
    e.stopPropagation();
    onResetFilter('price', 'min'); 
    onResetFilter('price', 'max');
  };

  // Handle filter reset for listed space (propertyType)
  const handleResetListedSpace = (e) => {
    e.stopPropagation();
    onResetFilter('propertyType');
  };

  // Handle clear all filters
  const handleClearAll = () => {
    onResetFilter('all');
  };

  // Function to generate availability tag label
  const getAvailabilityLabel = () => {
    const activeFilters = [];
    if (availabilityFilters.short) activeFilters.push('1-3 months');
    if (availabilityFilters.medium) activeFilters.push('3-6 months');
    if (availabilityFilters.long) activeFilters.push('12 months');
    
    if (activeFilters.length === 1) return `${activeFilters[0]}`;
    if (activeFilters.length > 1) return `${activeFilters.length} options`;
    return 'Length of Stay';
  };

  // Format budget for display
  const getBudgetLabel = () => {
    if (appliedBudget.min !== null && appliedBudget.max !== null) {
      return `$${appliedBudget.min} - $${appliedBudget.max}`;
    } else if (appliedBudget.min !== null) {
      return `$${appliedBudget.min}+`;
    } else if (appliedBudget.max !== null) {
      return `Up to $${appliedBudget.max}`;
    }
    return 'Monthly Budget';
  };

  // Filter segment definitions (updated labels and content)
  const filterSegments = [
    {
      id: 'availability',
      label: 'Length of Stay',
      icon: <IconCalendar size={16} />,
      content: (
        <>
          <Text size="md" fw={700}>Length of Stay</Text>
          <Divider mb="md" mt='xs'/>
          
          <Group spacing="lg" mb='xs'>
            <Checkbox 
              label="Short" 
              description="1-3 months" 
              checked={availabilityFilters.short}
              onChange={(e) => handleAvailabilityChange('short', e.currentTarget.checked)}
            />
            <Checkbox 
              label="Medium" 
              description="3-6 months" 
              checked={availabilityFilters.medium}
              onChange={(e) => handleAvailabilityChange('medium', e.currentTarget.checked)}
            />
            <Checkbox 
              label="Long" 
              description="12 months" 
              checked={availabilityFilters.long}
              onChange={(e) => handleAvailabilityChange('long', e.currentTarget.checked)}
            />
          </Group>
        </>
      )
    },
    {
      id: 'budget',
      label: 'Monthly Budget',
      icon: <IconMoneybag size={16} />,
      content: (
        <>
          <Text size="md" fw={700}>Monthly Budget</Text>
          <Divider mt='xs' mb="md"/>
          
          <Stack>
            <Group>
              <NumberInput
                style={{ height: '3rem', width: '7rem' }}
                rightSection={<IconUserDollar size={20}/>}
                placeholder="Minimum"
                value={budgetInput.min}
                onChange={(value) => handleBudgetInputChange('min', value)}
                mt="md" 
              />
              <NumberInput
                style={{ height: '3rem', width: '7rem' }}
                rightSection={<IconUserDollar size={20}/>}
                placeholder="Maximum"
                value={budgetInput.max}
                onChange={(value) => handleBudgetInputChange('max', value)}
                mt="md" 
              />
            </Group>
            <Group position="right" spacing="xs" mt="sm">
              <Button 
                onClick={handleBudgetCancel} 
                variant="subtle"
                color="gray"
                size="xs"
                radius="md"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBudgetApply} 
                variant="filled"
                color="blue"
                size="xs"
                radius="md"
              >
                Apply
              </Button>
            </Group>         
          </Stack>
        </>
      )
    },
    {
      id: 'listed-space',
      label: 'Property Type',
      icon: <IconBuilding size={16} />,
      content: (
        <>
          <Text size="md" fw={700}>Property Type</Text>
          <Divider mb='xs' mt='xs'/>
       
          <Stack>
            <Button
              leftSection={<IconBed size={16} />}
              variant={selected === 'room' ? 'filled' : 'outline'}
              color={selected === 'room' ? 'dark' : 'gray'}
              onClick={() => handleRoomTypeSelect('room')}
            >
              A room
            </Button>
            <Button
              leftSection={<IconHome size={16} />}
              variant={selected === 'entire' ? 'filled' : 'outline'}
              color={selected === 'entire' ? 'dark' : 'gray'}
              onClick={() => handleRoomTypeSelect('entire')}
            >
              An entire place
            </Button>
            <Button
              leftSection={<IconUser size={16} />}
              variant={selected === 'studio' ? 'filled' : 'outline'}
              color={selected === 'studio' ? 'dark' : 'gray'}
              onClick={() => handleRoomTypeSelect('studio')}
            >
              A studio
            </Button>
          </Stack>
        </>
      )
    },
  ];

  return (
    <div>
      <Group 
        spacing={10}
        style={{ 
          marginBottom: '0.5rem',
          marginTop: '1.2rem',
          marginLeft: '1rem',
        }}
      >
        {filterSegments.map((segment) => {
          const isAvailabilityActive = segment.id === 'availability' && (availabilityFilters.short || availabilityFilters.medium || availabilityFilters.long);
          const isBudgetActive = segment.id === 'budget' && (appliedBudget.min !== null || appliedBudget.max !== null);
          const isListedSpaceActive = segment.id === 'listed-space' && selected !== null;

          if (isAvailabilityActive && segment.id === 'availability') {
            return (
              <Button
                key={segment.id}
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                leftSection={<IconCalendar size={14} />}
                rightSection={
                  <IconX
                    size={14}
                    onClick={handleResetAvailability}
                    style={{ cursor: 'pointer' }}
                  />
                }
                styles={activeTagStyles}
                onClick={() => togglePopover(segment.id)}
              >
                {getAvailabilityLabel()}
              </Button>
            );
          }

          if (isBudgetActive && segment.id === 'budget') {
            return (
              <Button
                key={segment.id}
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                leftSection={<IconMoneybag size={14} />}
                rightSection={
                  <IconX
                    size={14}
                    onClick={handleResetBudget}
                    style={{ cursor: 'pointer' }}
                  />
                }
                styles={activeTagStyles}
                onClick={() => togglePopover(segment.id)}
              >
                {getBudgetLabel()}
              </Button>
            );
          }

          if (isListedSpaceActive && segment.id === 'listed-space') {
            return (
              <Button
                key={segment.id}
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                leftSection={<IconBuilding size={14} />}
                rightSection={
                  <IconX 
                    size={14} 
                    onClick={handleResetListedSpace}
                    style={{ cursor: 'pointer' }}
                  />
                }
                styles={activeTagStyles}
                onClick={() => togglePopover(segment.id)}
              >
                {selected === 'room' ? 'Room' : selected === 'entire' ? 'Entire place' : 'Studio'}
              </Button>
            );
          }

          return (
            <Popover
              key={segment.id}
              opened={opened === segment.id}
              onClose={() => setOpened(null)}
              position="bottom"
              withArrow
              arrowOffset={10}
              shadow="md"
              radius="lg"
              trapFocus={false}
            >
              <Popover.Target>
                <Button
                  variant="default"
                  leftSection={segment.icon}
                  onClick={() => togglePopover(segment.id)}
                  style={{
                    ...buttonStyles,
                    backgroundColor: opened === segment.id ? '#f0f0f0' : '#fff'
                  }}
                >
                  {segment.label}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                {segment.content}
              </Popover.Dropdown>
            </Popover>
          );
        })}

        {hasActiveFilters() && (
          <Button
            variant="subtle"
            color="gray"
            onClick={handleClearAll}
            rightSection={<IconX size={14} />}
            style={{
              borderRadius: '24px',
              padding: '0 12px',
              color: '#606060',
              fontWeight: 'normal',
              fontSize: '14px',
            }}
          >
            Clear all
          </Button>
        )}
      </Group>
    </div>
  );
}

export default FilterMenu;