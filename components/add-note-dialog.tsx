'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AddNoteDialogProps {
  patientId: string;
  orgSlug: string;
  onNoteAdded: () => void;
}

export function AddNoteDialog({ patientId, orgSlug, onNoteAdded }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [mood, setMood] = useState<'happy' | 'sad' | 'anxious' | 'neutral'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a note before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/org/${orgSlug}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          rawText: noteText.trim(),
          mood,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      toast({
        title: 'Success',
        description: 'Note added successfully. AI summary will be generated shortly.',
      });

      // Reset form
      setNoteText('');
      setMood('neutral');
      setOpen(false);
      
      // Refresh notes list
      onNoteAdded();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Care Note</DialogTitle>
          <DialogDescription>
            Record your observations and care activities. The AI will automatically generate a summary and identify key insights.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note">Care Note</Label>
            <Textarea
              id="note"
              placeholder="Describe the visit, patient's condition, activities, medications, or any observations..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mood">Patient Mood</Label>
            <Select value={mood} onValueChange={(value: 'happy' | 'sad' | 'anxious' | 'neutral') => setMood(value)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient's mood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="anxious">Anxious</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !noteText.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Note...
                </>
              ) : (
                'Add Note'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}