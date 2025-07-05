
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ExpenseFormProps {
  onSubmit: (expense: {
    description: string;
    amount: number;
    paidBy: string;
    date: string;
    participants: string[];
  }) => void;
  onCancel: () => void;
  initialData?: {
    description: string;
    amount: string;
    paidBy: string;
    participants: string;
  };
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || '');
  const [participants, setParticipants] = useState(initialData?.participants || '');

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount);
      setPaidBy(initialData.paidBy);
      setParticipants(initialData.participants);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !paidBy) {
      return;
    }

    const participantList = participants
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (participantList.length === 0) {
      participantList.push(paidBy);
    }

    onSubmit({
      description: description.trim(),
      amount: parseFloat(amount),
      paidBy: paidBy.trim(),
      date: new Date().toLocaleDateString(),
      participants: participantList,
    });

    // Reset form only if not editing
    if (!initialData) {
      setDescription('');
      setAmount('');
      setPaidBy('');
      setParticipants('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Dinner at restaurant"
          required
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label htmlFor="paidBy">Paid by</Label>
        <Input
          id="paidBy"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          placeholder="Your name"
          required
        />
      </div>

      <div>
        <Label htmlFor="participants">Participants (comma-separated)</Label>
        <Input
          id="participants"
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="Alice, Bob, Charlie"
        />
        <p className="text-sm text-gray-500 mt-1">
          Leave empty to include only the person who paid
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          {initialData ? 'Update Expense' : 'Add Expense'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
