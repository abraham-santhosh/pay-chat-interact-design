
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowRight, DollarSign } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  settled: boolean;
}

interface Balance {
  person: string;
  owes: { [key: string]: number };
  owed: { [key: string]: number };
  netBalance: number;
}

interface AutoCalculateProps {
  expenses: Expense[];
  onSettle: (settlement: { from: string; to: string; amount: number }) => void;
}

const AutoCalculate: React.FC<AutoCalculateProps> = ({ expenses, onSettle }) => {
  const calculateBalances = (): Balance[] => {
    const balances: { [key: string]: Balance } = {};
    
    // Initialize balances for all participants
    expenses.forEach(expense => {
      [expense.paidBy, ...expense.participants].forEach(person => {
        if (!balances[person]) {
          balances[person] = {
            person,
            owes: {},
            owed: {},
            netBalance: 0
          };
        }
      });
    });

    // Calculate who owes what
    expenses.filter(expense => !expense.settled).forEach(expense => {
      const splitAmount = expense.amount / expense.participants.length;
      
      expense.participants.forEach(participant => {
        if (participant !== expense.paidBy) {
          // This participant owes the payer
          if (!balances[participant].owes[expense.paidBy]) {
            balances[participant].owes[expense.paidBy] = 0;
          }
          balances[participant].owes[expense.paidBy] += splitAmount;
          
          // The payer is owed by this participant
          if (!balances[expense.paidBy].owed[participant]) {
            balances[expense.paidBy].owed[participant] = 0;
          }
          balances[expense.paidBy].owed[participant] += splitAmount;
        }
      });
    });

    // Calculate net balances
    Object.values(balances).forEach(balance => {
      const totalOwed = Object.values(balance.owed).reduce((sum, amount) => sum + amount, 0);
      const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + amount, 0);
      balance.netBalance = totalOwed - totalOwes;
    });

    return Object.values(balances).filter(b => 
      Object.keys(b.owes).length > 0 || Object.keys(b.owed).length > 0
    );
  };

  const getSettlementSuggestions = () => {
    const balances = calculateBalances();
    const suggestions: { from: string; to: string; amount: number }[] = [];
    
    const creditors = balances.filter(b => b.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance);
    const debtors = balances.filter(b => b.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance);
    
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      
      const amount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));
      
      if (amount > 0.01) { // Avoid tiny amounts due to floating point precision
        suggestions.push({
          from: debtor.person,
          to: creditor.person,
          amount: Math.round(amount * 100) / 100
        });
        
        creditor.netBalance -= amount;
        debtor.netBalance += amount;
      }
      
      if (creditor.netBalance < 0.01) i++;
      if (Math.abs(debtor.netBalance) < 0.01) j++;
    }
    
    return suggestions;
  };

  const balances = calculateBalances();
  const suggestions = getSettlementSuggestions();

  if (balances.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calculator className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No active expenses</h3>
          <p className="text-gray-500">Add some expenses to see balance calculations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Auto-Calculate Balances
          </h2>
          
          {/* Individual Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {balances.map(balance => (
              <div key={balance.person} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">{balance.person}</h4>
                
                {Object.entries(balance.owes).map(([person, amount]) => (
                  <div key={person} className="flex justify-between text-sm text-red-600 mb-1">
                    <span>Owes {person}</span>
                    <span>${amount.toFixed(2)}</span>
                  </div>
                ))}
                
                {Object.entries(balance.owed).map(([person, amount]) => (
                  <div key={person} className="flex justify-between text-sm text-green-600 mb-1">
                    <span>{person} owes you</span>
                    <span>${amount.toFixed(2)}</span>
                  </div>
                ))}
                
                <div className={`flex justify-between font-bold pt-2 border-t ${
                  balance.netBalance > 0 ? 'text-green-600' : balance.netBalance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <span>Net Balance</span>
                  <span>${Math.abs(balance.netBalance).toFixed(2)} {balance.netBalance > 0 ? 'owed' : balance.netBalance < 0 ? 'owes' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Suggested Settlements
            </h3>
            
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{suggestion.from}</span>
                    <ArrowRight className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{suggestion.to}</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${suggestion.amount.toFixed(2)}
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => onSettle(suggestion)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Settle
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                💡 These settlements will minimize the number of transactions needed to settle all debts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoCalculate;
