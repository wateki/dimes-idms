import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2 } from 'lucide-react';
import { OutcomeFormData, ActivityFormData } from './types';

interface ActivitiesFormProps {
  outcomes: OutcomeFormData[];
  activities: ActivityFormData[];
  onAddActivity: (outcomeId: string) => void;
  onUpdateActivity: (index: number, field: keyof ActivityFormData, value: any) => void;
  onRemoveActivity: (index: number) => void;
}

export function ActivitiesForm({ 
  outcomes, 
  activities, 
  onAddActivity, 
  onUpdateActivity, 
  onRemoveActivity 
}: ActivitiesFormProps) {
  if (outcomes.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Project Activities</h3>
        <div className="text-center py-8 text-gray-500">
          No outcomes defined yet. Please go back and add outcomes first.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Project Activities</h3>
      
      <Tabs defaultValue={outcomes[0]?.id} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${outcomes.length}, 1fr)` }}>
          {outcomes.map((outcome, index) => (
            <TabsTrigger key={outcome.id} value={outcome.id}>
              Outcome {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {outcomes.map((outcome) => (
          <TabsContent key={outcome.id} value={outcome.id} className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{outcome.title || `Outcome ${outcomes.indexOf(outcome) + 1}`}</h4>
                <p className="text-sm text-gray-600">{outcome.description}</p>
              </div>
              <Button onClick={() => onAddActivity(outcome.id)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Activity
              </Button>
            </div>

            {activities.filter(a => a.outcomeId === outcome.id).length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No activities for this outcome yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activities
                  .map((activity, index) => ({ activity, originalIndex: index }))
                  .filter(({ activity }) => activity.outcomeId === outcome.id)
                  .map(({ activity, originalIndex }) => (
                  <Card key={activity.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-medium text-sm">Activity {activities.filter(a => a.outcomeId === outcome.id).indexOf(activity) + 1}</h5>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveActivity(originalIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <Input
                          value={activity.title}
                          onChange={(e) => onUpdateActivity(originalIndex, 'title', e.target.value)}
                          placeholder="Activity title"
                        />
                        <Textarea
                          value={activity.description}
                          onChange={(e) => onUpdateActivity(originalIndex, 'description', e.target.value)}
                          placeholder="Activity description"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Input
                            value={activity.responsible}
                            onChange={(e) => onUpdateActivity(originalIndex, 'responsible', e.target.value)}
                            placeholder="Responsible person"
                          />
                          <DatePicker
                            date={activity.startDate}
                            onDateChange={(date) => onUpdateActivity(originalIndex, 'startDate', date)}
                            placeholder="Start date"
                          />
                          <DatePicker
                            date={activity.endDate}
                            onDateChange={(date) => onUpdateActivity(originalIndex, 'endDate', date)}
                            placeholder="End date"
                          />
                          <div>
                            <Label className="text-xs">Progress (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={activity.progress ?? 0}
                              onChange={(e) => onUpdateActivity(originalIndex, 'progress', parseFloat(e.target.value) || 0)}
                              placeholder="0–100"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}