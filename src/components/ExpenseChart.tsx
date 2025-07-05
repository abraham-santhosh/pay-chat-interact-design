import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  participants: string[];
  settled: boolean;
}

interface ExpenseChartProps {
  expenses: Expense[];
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({ expenses }) => {
  // Process data for different time periods
  const chartData = useMemo(() => {
    const now = new Date();
    
    // Daily data (last 30 days)
    const dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExpenses = expenses.filter(expense => 
        expense.date === date.toLocaleDateString()
      );
      
      const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: totalAmount,
        count: dayExpenses.length,
        fullDate: dateStr
      });
    }

    // Monthly data (last 12 months)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' });
      
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === date.getMonth() && 
               expenseDate.getFullYear() === date.getFullYear();
      });
      
      const totalAmount = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      monthlyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: totalAmount,
        count: monthExpenses.length,
        fullDate: monthStr
      });
    }

    // Yearly data (last 5 years)
    const yearlyData = [];
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      
      const yearExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === year;
      });
      
      const totalAmount = yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      yearlyData.push({
        date: year.toString(),
        amount: totalAmount,
        count: yearExpenses.length,
        fullDate: year.toString()
      });
    }

    return { dailyData, monthlyData, yearlyData };
  }, [expenses]);

  const formatCurrency = (value: number) => `₹${value.toFixed(0)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-blue-600">
            Amount: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
          </p>
          <p className="text-gray-600">
            Expenses: <span className="font-semibold">{payload[0].payload.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (expenses.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Expense Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No expense data</h3>
          <p className="text-gray-500">Add some expenses to see your spending patterns</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Expense Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="yearly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Yearly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Last 30 Days</h3>
              <p className="text-sm text-gray-600">Daily expense trends</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                    tick={{ fill: '#666' }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Last 12 Months</h3>
              <p className="text-sm text-gray-600">Monthly expense trends</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                    tick={{ fill: '#666' }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="amount" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Last 5 Years</h3>
              <p className="text-sm text-gray-600">Yearly expense trends</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                    tick={{ fill: '#666' }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="amount" 
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {chartData.dailyData.reduce((sum, day) => sum + day.count, 0)}
              </div>
              <div className="text-sm text-blue-800">Expenses (30 days)</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(chartData.monthlyData.reduce((sum, month) => sum + month.amount, 0))}
              </div>
              <div className="text-sm text-green-800">Total (12 months)</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(expenses.reduce((sum, expense) => sum + expense.amount, 0) / Math.max(expenses.length, 1))}
              </div>
              <div className="text-sm text-purple-800">Average per expense</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseChart;