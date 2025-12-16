import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, IndianRupee, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Tenant {
  id: string;
  name: string;
  room_no: string;
}

interface RentPayment {
  id: string;
  tenant_id: string;
  month: number;
  year: number;
  amount: number;
  paid_on: string;
  tenants?: Tenant;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RentTracking() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    tenant_id: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    amount: '',
    paid_on: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tenants
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, room_no')
        .order('room_no');
      setTenants(tenantsData || []);

      // Fetch payments for selected month/year
      const { data: paymentsData } = await supabase
        .from('rent_payments')
        .select('*, tenants(id, name, room_no)')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('paid_on', { ascending: false });
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from('rent_payments').insert({
        tenant_id: formData.tenant_id,
        month: Number(formData.month),
        year: Number(formData.year),
        amount: Number(formData.amount),
        paid_on: formData.paid_on,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Payment already recorded for this tenant and month');
        }
        throw error;
      }

      toast({
        title: 'Payment recorded',
        description: 'Rent payment has been recorded successfully.',
      });

      setDialogOpen(false);
      setFormData({
        tenant_id: '',
        month: String(selectedMonth),
        year: String(selectedYear),
        amount: '',
        paid_on: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const paidTenantIds = payments.map(p => p.tenant_id);
  const unpaidTenants = tenants.filter(t => !paidTenantIds.includes(t.id));

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rent Tracking</h1>
            <p className="text-muted-foreground">Track rent payments month-wise</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Rent Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tenant</Label>
                    <Select value={formData.tenant_id} onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name} (Room {tenant.room_no})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Select value={formData.month} onValueChange={(v) => setFormData({ ...formData, month: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, index) => (
                            <SelectItem key={index} value={String(index + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paid_on">Payment Date</Label>
                    <Input
                      id="paid_on"
                      type="date"
                      value={formData.paid_on}
                      onChange={(e) => setFormData({ ...formData, paid_on: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Recording...' : 'Record Payment'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-xl font-bold">
                    ₹{payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-xl font-bold">{payments.length} tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due</p>
                  <p className="text-xl font-bold">{unpaidTenants.length} tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unpaid Tenants */}
        {unpaidTenants.length > 0 && (
          <Card className="card-shadow border-warning/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                Rent Due - {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unpaidTenants.map((tenant) => (
                  <Badge key={tenant.id} variant="outline" className="border-warning text-warning py-1.5 px-3">
                    {tenant.name} (Room {tenant.room_no})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Records */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">
              Payment Records - {MONTHS[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments recorded for this month yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Paid On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.tenants?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{payment.tenants?.room_no || '-'}</TableCell>
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
