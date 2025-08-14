'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Check, X, Clock, Trash2, Stethoscope, Brain, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Todo {
  _id: string;
  patientId: string;
  noteId?: string;
  text: string;
  status: 'pending' | 'done';
  createdAt: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  keyInfo: {
    conditions: string[];
  };
}

interface PatientTodosProps {
  patientId: string;
  orgSlug: string;
  onTodoUpdate?: () => void;
}

export function PatientTodos({ patientId, orgSlug, onTodoUpdate }: PatientTodosProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchPatient = async () => {
    try {
      const response = await fetch(`/api/org/${orgSlug}/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
        return data;
      } else {
        console.error('Failed to fetch patient');
        return null;
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      return null;
    }
  };

  const fetchTodos = async () => {
    try {
      const response = await fetch(`/api/org/${orgSlug}/patients/${patientId}/actions`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
        return data;
      } else {
        console.error('Failed to fetch todos');
        return [];
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
      return [];
    }
  };

  const generateConditionBasedTodos = (conditions: string[]) => {
    const conditionTodoMap: Record<string, string[]> = {
      'diabetes': [
        'Check blood glucose levels',
        'Monitor foot health for cuts or sores',
        'Review medication adherence',
        'Assess diet and nutrition'
      ],
      'high blood pressure': [
        'Monitor blood pressure readings',
        'Check medication compliance',
        'Assess sodium intake in diet',
        'Review physical activity levels'
      ],
      'stroke recovery': [
        'Assess mobility and balance',
        'Check speech and communication',
        'Review physical therapy exercises',
        'Monitor cognitive function'
      ],
      'dementia': [
        'Assess cognitive function and memory',
        'Check safety in living environment',
        'Review daily routine and activities',
        'Monitor mood and behavioral changes'
      ],
      'heart disease': [
        'Monitor heart rate and rhythm',
        'Check for signs of fluid retention',
        'Review cardiac medications',
        'Assess exercise tolerance'
      ],
      'arthritis': [
        'Assess joint pain and mobility',
        'Check range of motion exercises',
        'Review pain management strategies',
        'Monitor daily living activities'
      ]
    };

    const suggestedTodos: string[] = [];
    conditions.forEach(condition => {
      const normalizedCondition = condition.toLowerCase();
      Object.keys(conditionTodoMap).forEach(key => {
        if (normalizedCondition.includes(key)) {
          suggestedTodos.push(...conditionTodoMap[key]);
        }
      });
    });

    // Remove duplicates
     return Array.from(new Set(suggestedTodos));
  };

  const createConditionBasedTodos = async (patientData: Patient, existingTodos: Todo[]) => {
    if (!patientData.keyInfo?.conditions || patientData.keyInfo.conditions.length === 0) {
      return;
    }

    const suggestedTodos = generateConditionBasedTodos(patientData.keyInfo.conditions);
    const existingTodoTexts = existingTodos.map(todo => todo.text.toLowerCase());

    // Only create todos that don't already exist
    const newTodos = suggestedTodos.filter(todoText => 
      !existingTodoTexts.some(existing => 
        existing.includes(todoText.toLowerCase()) || todoText.toLowerCase().includes(existing)
      )
    );

    for (const todoText of newTodos) {
      try {
        await fetch(`/api/org/${orgSlug}/actions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId,
            text: todoText,
            status: 'pending'
          }),
        });
      } catch (error) {
        console.error('Error creating condition-based todo:', error);
      }
    }

    if (newTodos.length > 0) {
      toast({
        title: "Care tasks generated",
        description: `Added ${newTodos.length} care tasks based on patient conditions.`,
      });
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPatient(),
          fetchTodos()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [patientId, orgSlug]);

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/org/${orgSlug}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          text: newTodoText.trim(),
        }),
      });

      if (response.ok) {
        const newTodo = await response.json();
        setTodos(prev => [newTodo, ...prev]);
        setNewTodoText('');
        setIsAddDialogOpen(false);
        onTodoUpdate?.();
        // Refresh todos from database to ensure consistency
        await fetchTodos();
        toast({
          title: 'Success',
          description: 'Todo added successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to add todo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to add todo',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
    
    try {
      const response = await fetch(`/api/org/${orgSlug}/actions/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos(prev => prev.map(todo => 
          todo._id === todoId ? updatedTodo : todo
        ));
        onTodoUpdate?.();
        toast({
          title: 'Success',
          description: `Todo marked as ${newStatus}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update todo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to update todo',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/org/${orgSlug}/actions/${todoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(prev => prev.filter(todo => todo._id !== todoId));
        onTodoUpdate?.();
        toast({
          title: 'Success',
          description: 'Todo deleted successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete todo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete todo',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateAICareActions = async () => {
    if (!patient) {
      toast({
        title: 'No patient data',
        description: 'Patient data is not available',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/org/${orgSlug}/patients/${patientId}/generate-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchTodos();
        toast({
          title: 'AI Care Actions Generated',
          description: `Generated ${result.actionsGenerated} personalized care actions using AI`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to generate AI care actions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating AI care actions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI care actions',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateConditionTodos = async () => {
    if (!patient) {
      toast({
        title: 'No patient data',
        description: 'Patient data is not available',
        variant: 'destructive',
      });
      return;
    }
    
    if (!patient.keyInfo?.conditions || patient.keyInfo.conditions.length === 0) {
      toast({
        title: 'No conditions found',
        description: 'This patient has no medical conditions listed',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createConditionBasedTodos(patient, todos);
      await fetchTodos();
      toast({
        title: 'Success',
        description: 'Care tasks generated successfully',
      });
    } catch (error) {
      console.error('Error generating condition-based todos:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate condition-based todos',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingTodos = todos.filter(todo => todo.status === 'pending');
  const completedTodos = todos.filter(todo => todo.status === 'done');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Care Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Care Actions</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {pendingTodos.length} pending, {completedTodos.length} completed
            </p>
            {patient?.keyInfo?.conditions && patient.keyInfo.conditions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Patient conditions:</p>
                <div className="flex flex-wrap gap-1">
                  {patient.keyInfo.conditions.map((condition, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="default"
              onClick={handleGenerateAICareActions}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Generating...' : 'AI Care Actions'}
            </Button>
            {patient?.keyInfo?.conditions && patient.keyInfo.conditions.length > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleGenerateConditionTodos}
                disabled={isSubmitting}
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Basic Tasks' : 'Basic Tasks'}
              </Button>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Todo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Care Action</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter care action or task..."
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddTodo}
                    disabled={!newTodoText.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Todo'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
           </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pending Todos */}
          {pendingTodos.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Pending ({pendingTodos.length})
              </h4>
              <div className="space-y-2">
                {pendingTodos.map((todo) => (
                  <div
                    key={todo._id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-0.5 h-6 w-6 p-0 border-yellow-400 hover:bg-yellow-100"
                      onClick={() => handleToggleStatus(todo._id, todo.status)}
                    >
                      <Heart className="h-3 w-3" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{todo.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {format(new Date(todo.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteTodo(todo._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 fill-current text-red-500" />
                Completed ({completedTodos.length})
              </h4>
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <div
                    key={todo._id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-green-50 border-green-200"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-0.5 h-6 w-6 p-0 border-green-400 hover:bg-green-100"
                      onClick={() => handleToggleStatus(todo._id, todo.status)}
                    >
                      <Heart className="h-3 w-3 fill-current text-red-500" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-through opacity-75">{todo.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Completed {format(new Date(todo.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteTodo(todo._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {todos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No care actions yet</p>
              <p className="text-xs mt-1">Add tasks and reminders for this patient</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}