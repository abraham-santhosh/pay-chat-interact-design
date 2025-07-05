import React, { useState, useEffect } from 'react';
import { Plus, Receipt, MessageCircle, LogIn, LogOut, User, Users, Calculator, Settings, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExpenseForm from './ExpenseForm';
import ChatBot from './ChatBot';
import LoadingScreen from './LoadingScreen';
import Groups from './Groups';
import Profile from './Profile';
import AutoCalculate from './AutoCalculate';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  participants: string[];
  settled: boolean;
}

interface User {
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
}

// Simple encryption functions (for demonstration - in production use proper encryption)
const encryptData = (data: string): string => {
  return btoa(data); // Base64 encoding as basic encryption
};

const decryptData = (encryptedData: string): string => {
  try {
    return atob(encryptedData); // Base64 decoding
  } catch {
    return encryptedData; // Return as-is if not encrypted
  }
};

// Utility to dynamically load the Razorpay checkout script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.querySelector('#razorpay-sdk')) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [signInForm, setSignInForm] = useState({ email: '', password: '', name: '' });
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  // Loading screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Load encrypted data from localStorage
  useEffect(() => {
    const encryptedExpenses = localStorage.getItem('splitEasyExpenses');
    if (encryptedExpenses) {
      try {
        const decryptedData = decryptData(encryptedExpenses);
        const parsedExpenses = JSON.parse(decryptedData);
        setExpenses(parsedExpenses);
      } catch (error) {
        console.error('Error loading expenses:', error);
      }
    }

    const encryptedUser = localStorage.getItem('splitEasyUser');
    if (encryptedUser) {
      try {
        const decryptedUser = decryptData(encryptedUser);
        const parsedUser = JSON.parse(decryptedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
  }, []);

  // Save encrypted data to localStorage
  useEffect(() => {
    if (expenses.length > 0) {
      const encryptedExpenses = encryptData(JSON.stringify(expenses));
      localStorage.setItem('splitEasyExpenses', encryptedExpenses);
    }
  }, [expenses]);

  useEffect(() => {
    if (user) {
      const encryptedUser = encryptData(JSON.stringify(user));
      localStorage.setItem('splitEasyUser', encryptedUser);
    }
  }, [user]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const activeExpenses = expenses.filter(expense => !expense.settled).length;
  const pendingSettlements = Math.floor(activeExpenses / 2);

  const addExpense = (expense: Omit<Expense, 'id' | 'settled'>) => {
    const newExpense = {
      ...expense,
      id: Date.now().toString(),
      settled: false,
    };
    setExpenses([...expenses, newExpense]);
    setShowExpenseForm(false);
    toast({
      title: "Expense Added!",
      description: `Added ${expense.description} for ₹${expense.amount}`,
    });
  };

  const updateExpense = (updatedExpense: Omit<Expense, 'id' | 'settled'>) => {
    if (!editingExpense) return;
    
    const updatedExpenses = expenses.map(expense =>
      expense.id === editingExpense.id
        ? { ...updatedExpense, id: editingExpense.id, settled: editingExpense.settled }
        : expense
    );
    
    setExpenses(updatedExpenses);
    setEditingExpense(null);
    setShowExpenseForm(false);
    
    toast({
      title: "Expense Updated!",
      description: `Updated ${updatedExpense.description} for ₹${updatedExpense.amount}`,
    });
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInForm.email || !signInForm.password) return;
    
    if (isSignUp && !signInForm.name) return;

    const newUser = {
      name: signInForm.name || signInForm.email.split('@')[0],
      email: signInForm.email,
    };

    setUser(newUser);
    
    setShowSignIn(false);
    setSignInForm({ email: '', password: '', name: '' });
    
    toast({
      title: isSignUp ? "Account Created!" : "Welcome Back!",
      description: `Successfully ${isSignUp ? 'signed up' : 'signed in'}`,
    });
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('splitEasyUser');
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully",
    });
  };

  /**
   * Trigger Razorpay checkout for settling all active expenses.
   * On successful payment verification, we mark all active expenses as settled.
   */
  const handleGooglePay = async () => {
    const activeUnsettled = expenses.filter((exp) => !exp.settled);
    const totalAmount = activeUnsettled.reduce((sum, exp) => sum + exp.amount, 0);

    if (totalAmount <= 0) {
      toast({
        title: 'Nothing to settle',
        description: 'All expenses are already settled.',
      });
      return;
    }

    const razorpayLoaded = await loadRazorpayScript();
    if (!razorpayLoaded) {
      toast({ title: 'Payment Error', description: 'Failed to load payment gateway.' });
      return;
    }

    try {
      // Create an order on the backend
      const orderRes = await fetch('http://localhost:4000/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Unable to create payment order');
      }

      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Split Easy',
        description: 'Expense Settlement',
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('http://localhost:4000/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              toast({ title: 'Payment Successful', description: 'Expenses settled!' });

              // Mark all active expenses as settled
              setExpenses((prev) => prev.map((e) => ({ ...e, settled: true })));

              setShowSettleUp(false);
            } else {
              toast({ title: 'Verification Failed', description: verifyData.error || 'Could not verify payment.' });
            }
          } catch (err: any) {
            console.error(err);
            toast({ title: 'Payment Error', description: err.message || 'Something went wrong.' });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#4f46e5',
        },
      };

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Razorpay will be available globally after script loads
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Payment Error', description: error.message || 'Failed to initiate payment.' });
    }
  };

  const handleManualSettlement = (expenseId: string) => {
    setExpenses(expenses.map(expense => 
      expense.id === expenseId 
        ? { ...expense, settled: true }
        : expense
    ));
    
    toast({
      title: "Expense Settled",
      description: "Expense has been marked as settled",
    });
    
    setShowSettleUp(false);
  };

  const handleAutoSettle = (settlement: { from: string; to: string; amount: number }) => {
    // In a real app, this would process the payment
    toast({
      title: "Settlement Processed",
      description: `${settlement.from} paid ${settlement.to} ₹${settlement.amount.toFixed(2)}`,
    });
    
    // Mark related expenses as settled (simplified logic)
    const updatedExpenses = expenses.map(expense => {
      if (!expense.settled && 
          (expense.paidBy === settlement.to || expense.participants.includes(settlement.from))) {
        return { ...expense, settled: true };
      }
      return expense;
    });
    
    setExpenses(updatedExpenses);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setShowExpenseForm(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="bg-white text-purple-600 p-3 rounded-full">
                <Receipt className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Split Easy</h1>
                <p className="text-lg opacity-90">Split expenses with friends easily</p>
              </div>
            </div>
            
            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowProfile(true)}
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowSignIn(true)}
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {user ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="calculate">Auto-Calculate</TabsTrigger>
              <TabsTrigger value="expenses">All Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 hover:scale-105 transition-transform duration-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-2 opacity-90">Total Expenses</h3>
                    <p className="text-3xl font-bold">₹{totalExpenses.toFixed(2)}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={activeExpenses === 0}
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
                      {expenses.slice(-10).reverse().map((expense) => (
                        <div 
                          key={expense.id} 
                          className={`flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                            expense.settled ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <h4 className={`font-semibold text-gray-800 ${expense.settled ? 'line-through' : ''}`}>
                              {expense.description}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Paid by {expense.paidBy} • {expense.date}
                              {expense.settled && <span className="ml-2 text-green-600 font-medium">• Settled</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-lg font-bold text-gray-800 ${expense.settled ? 'line-through' : ''}`}>
                                ₹{expense.amount.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600">{expense.participants.length} people</p>
                            </div>
                            {!expense.settled && (
                              <Button
                                onClick={() => handleEditExpense(expense)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups">
              <Groups onGroupSelect={setSelectedGroup} selectedGroup={selectedGroup} />
            </TabsContent>

            <TabsContent value="calculate">
              <AutoCalculate expenses={expenses} onSettle={handleAutoSettle} />
            </TabsContent>

            <TabsContent value="expenses">
              {/* All Expenses View */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800">All Expenses</h2>
                  
                  {expenses.length === 0 ? (
                    <div className="text-center py-12">
                      <Receipt className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No expenses yet</h3>
                      <p className="text-gray-500">Add your first expense to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expenses.map((expense) => (
                        <div 
                          key={expense.id} 
                          className={`flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                            expense.settled ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <h4 className={`font-semibold text-gray-800 ${expense.settled ? 'line-through' : ''}`}>
                              {expense.description}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Paid by {expense.paidBy} • {expense.date}
                              {expense.settled && <span className="ml-2 text-green-600 font-medium">• Settled</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-lg font-bold text-gray-800 ${expense.settled ? 'line-through' : ''}`}>
                                ₹{expense.amount.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600">{expense.participants.length} people</p>
                            </div>
                            {!expense.settled && (
                              <Button
                                onClick={() => handleEditExpense(expense)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">Sign in to get started</h3>
              <p className="text-orange-600">Create an account or sign in to start tracking your expenses</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Chat Button */}
      <Button
        onClick={() => setShowChatBot(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Profile Dialog */}
      {user && (
        <Profile 
          user={user} 
          onUpdateUser={handleUpdateUser}
          open={showProfile}
          onOpenChange={setShowProfile}
        />
      )}

      {/* Sign In Dialog */}
      <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isSignUp ? 'Create Account' : 'Sign In'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSignIn} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={signInForm.name}
                  onChange={(e) => setSignInForm({...signInForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required={isSignUp}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={signInForm.email}
                onChange={(e) => setSignInForm({...signInForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={signInForm.password}
                onChange={(e) => setSignInForm({...signInForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </div>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Form Dialog */}
      <Dialog open={showExpenseForm} onOpenChange={(open) => {
        if (!open) {
          setEditingExpense(null);
        }
        setShowExpenseForm(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          </DialogHeader>
          <ExpenseForm 
            onSubmit={editingExpense ? updateExpense : addExpense} 
            onCancel={editingExpense ? handleCancelEdit : () => setShowExpenseForm(false)}
            initialData={editingExpense ? {
              description: editingExpense.description,
              amount: editingExpense.amount.toString(),
              paidBy: editingExpense.paidBy,
              participants: editingExpense.participants.join(', ')
            } : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Settle Up Dialog */}
      <Dialog open={showSettleUp} onOpenChange={setShowSettleUp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Expenses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose expenses to settle:</p>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {expenses.filter(expense => !expense.settled).map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-800">{expense.description}</h4>
                    <p className="text-sm text-gray-600">₹{expense.amount.toFixed(2)}</p>
                  </div>
                  <Button
                    onClick={() => handleManualSettlement(expense.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Settle
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                onClick={handleGooglePay}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-12 mb-2"
              >
                Pay with UPI
              </Button>
            </div>
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
