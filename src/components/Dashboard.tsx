
import React, { useState } from 'react';
import { Plus, Receipt, MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExpenseForm from './ExpenseForm';
import ChatBot from './ChatBot';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  participants: string[];
}

const Dashboard = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const { toast } = useToast();

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const activeExpenses = expenses.length;
  const pendingSettlements = Math.floor(activeExpenses / 2); // Simple calculation

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = {
      ...expense,
      id: Date.now().toString(),
    };
    setExpenses([...expenses, newExpense]);
    setShowExpenseForm(false);
    toast({
      title: "Expense Added!",
      description: `Added ${expense.description} for $${expense.amount}`,
    });
  };

  const handleGooglePay = () => {
    // Google Pay integration placeholder
    toast({
      title: "Google Pay",
      description: "Google Pay integration would be implemented here with proper API keys",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-2">SplitWise</h1>
          <p className="text-lg opacity-90">Split expenses with friends easily</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 hover:scale-105 transition-transform duration-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 opacity-90">Total Expenses</h3>
              <p className="text-3xl font-bold">${totalExpenses.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 hover:scale-105 transition-transform duration-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 opacity-90">Active Expenses</h3>
              <p className="text-3xl font-bold">{activeExpenses}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 hover:scale-105 transition-transform duration-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 opacity-90">Pending Settlements</h3>
              <p className="text-3xl font-bold">{pendingSettlements}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button 
            onClick={() => setShowExpenseForm(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Expense
          </Button>

          <Button 
            onClick={() => setShowSettleUp(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Receipt className="mr-2 h-5 w-5" />
            Settle Up
          </Button>
        </div>

        {/* Recent Expenses */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Recent Expenses</h2>
            
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No expenses yet</h3>
                <p className="text-gray-500">Add your first expense to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <h4 className="font-semibold text-gray-800">{expense.description}</h4>
                      <p className="text-sm text-gray-600">Paid by {expense.paidBy} • {expense.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">${expense.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{expense.participants.length} people</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Chat Button */}
      <Button
        onClick={() => setShowChatBot(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Expense Form Dialog */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSubmit={addExpense} onCancel={() => setShowExpenseForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Settle Up Dialog */}
      <Dialog open={showSettleUp} onOpenChange={setShowSettleUp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose how you'd like to settle your expenses:</p>
            
            <Button 
              onClick={handleGooglePay}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-12"
            >
              Pay with Google Pay
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-12"
              onClick={() => {
                toast({
                  title: "Manual Settlement",
                  description: "Manual settlement tracking would be implemented here",
                });
                setShowSettleUp(false);
              }}
            >
              Mark as Settled
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ChatBot */}
      {showChatBot && (
        <ChatBot onClose={() => setShowChatBot(false)} />
      )}
    </div>
  );
};

export default Dashboard;
