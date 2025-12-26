import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectFormData } from './types';
import countries from 'world-countries';

interface ProjectDetailsFormProps {
  projectData: ProjectFormData;
  onProjectChange: (field: keyof ProjectFormData, value: any) => void;
}

export function ProjectDetailsForm({ projectData, onProjectChange }: ProjectDetailsFormProps) {
  const [countryOpen, setCountryOpen] = useState(false);

  // Get all countries, sorted alphabetically by name
  const sortedCountries = useMemo(() => {
    return countries
      .map((country) => ({
        name: country.name.common,
        code: country.cca2.toLowerCase(), // ISO 3166-1 alpha-2 code (e.g., 'us', 'ke')
        flag: country.flag, // Emoji flag
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Find the selected country for display
  const selectedCountry = useMemo(() => {
    return sortedCountries.find((country) => country.code === projectData.country);
  }, [projectData.country, sortedCountries]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={projectData.name}
            onChange={(e) => onProjectChange('name', e.target.value)}
            placeholder="Enter project name"
          />
        </div>
        <div>
          <Label htmlFor="country">Country *</Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryOpen}
                className="w-full justify-between"
              >
                {selectedCountry ? (
                  <div className="flex items-center gap-2">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select country</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search country..." />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {sortedCountries.map((country) => (
                      <CommandItem
                        key={country.code}
                        value={`${country.name} ${country.code}`}
                        onSelect={() => {
                          onProjectChange('country', country.code);
                          setCountryOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            projectData.country === country.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={projectData.description}
          onChange={(e) => onProjectChange('description', e.target.value)}
          placeholder="Enter project description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={projectData.status} onValueChange={(value) => onProjectChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <DatePicker
            date={projectData.startDate}
            onDateChange={(date) => onProjectChange('startDate', date)}
            placeholder="Select start date"
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <DatePicker
            date={projectData.endDate}
            onDateChange={(date) => onProjectChange('endDate', date)}
            placeholder="Select end date"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="budget">Budget (USD)</Label>
        <Input
          id="budget"
          type="number"
          value={projectData.budget}
          onChange={(e) => onProjectChange('budget', parseInt(e.target.value) || 0)}
          placeholder="Enter project budget"
        />
      </div>

      {projectData.id && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Project ID:</strong> {projectData.id}
          </p>
        </div>
      )}
    </div>
  );
}