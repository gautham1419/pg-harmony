import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IndianRupee, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RentPayment {
  id: string;
  month: number;
  year: number;
  amount: number;
  paid_on: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MyRentHistory() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole && userRole !== 'tenant') {
      navigate('/');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Rent History</h1>
          <p className="text-muted-foreground">View your rent payment records</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold">₹{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payments Made</p>
                  <p className="text-xl font-bold">{payments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Paid On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{MONTHS[payment.month - 1]}</TableCell>
                        <TableCell>{payment.year}</TableCell>
                        <TableCell className="text-right">₹{Number(payment.amount).toLocaleString()}</TableCell>
                        <TableCell>{new Date(payment.paid_on).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className="bg-success hover:bg-success">Paid</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
